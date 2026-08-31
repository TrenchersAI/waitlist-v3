// Recovers delivery outcomes for the Falcon send from Resend's API.
//
// WHY THIS EXISTS. The Resend webhook handler dispatches on a per-send message
// id column, and the `falcon*` branch was added AFTER the send started. Until
// that route is redeployed, every delivery/bounce/complaint event for this
// send falls through to the base lookup, matches nothing, and is answered
// ok:true. The events are gone.
//
// They are not unknowable though: `falconResendMsgId` is stored for every row
// we mailed, and Resend keeps each message's terminal state. This walks those
// ids and writes the outcome back.
//
// REQUIRES A NON-RESTRICTED API KEY. The key in .env is send-only, and
// reading a message's status returns 401 `restricted_api_key`. So this script
// does NOT work as a safety net for the send that is already out unless
// someone issues a full-access key. Without one, the webhook is the ONLY way
// these events are ever captured, and anything that arrived before the
// handler's falcon branch was deployed is gone for good: the handler answered
// ok:true, so Resend considers those events delivered and will not retry.
//
// Safe to run repeatedly, and safe to run BEFORE the webhook fix ships: it
// only fills columns that are still null, so a later webhook event and this
// script cannot fight over the same row.
//
// The bounce numbers are the point. Without them the campaign-wide reputation
// gate cannot see what the newest send did, and the next send starts blind.
//
// Usage:
//   pnpm exec tsx scripts/backfill-falcon-events.ts
//   pnpm exec tsx scripts/backfill-falcon-events.ts --write

import "dotenv/config";

import { Resend } from "resend";

import { getPrismaClient } from "../src/lib/prisma";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";

/// Resend's API allows 2 requests/second. One in flight with a 500ms floor
/// keeps us under it without needing a token bucket.
const MIN_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/// Terminal states worth persisting, and where each one lands.
///
/// `queued`, `scheduled`, `sent` and `delivery_delayed` are deliberately NOT
/// terminal: the message is still in flight, so writing a timestamp now would
/// freeze a non-final state into a column that nothing later revisits. Those
/// rows are left alone and picked up by a subsequent run.
///
/// `suppressed` lands on the SHARED `suppressedAt`, not a falcon-specific
/// column, because suppression is a property of the ADDRESS (Resend refused to
/// send at all, usually from a hard bounce on some earlier campaign) rather
/// than of this particular send.
type Outcome = { field: string; shared?: boolean };
function outcomeFor(lastEvent: string): Outcome | null {
  switch (lastEvent) {
    case "delivered":
      return { field: "falconDeliveredAt" };
    // A message that was opened or clicked was necessarily delivered. Resend
    // reports only the LATEST event, so treating these as delivered is what
    // stops an engaged recipient from looking undelivered forever.
    case "opened":
    case "clicked":
      return { field: "falconDeliveredAt" };
    case "bounced":
    case "failed":
      return { field: "falconBouncedAt" };
    case "complained":
      return { field: "falconComplainedAt" };
    case "suppressed":
      return { field: "suppressedAt", shared: true };
    default:
      return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const li = args.findIndex((a) => a === "--limit" || a.startsWith("--limit="));
  const limit =
    li < 0 ? Infinity : Number(args[li].includes("=") ? args[li].split("=")[1] : args[li + 1]);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY must be set.");
    process.exit(1);
  }
  const resend = new Resend(apiKey);
  const prisma = getPrismaClient();

  // Fail loudly on a send-only key rather than reporting every row as an
  // error. A restricted key is the DEFAULT here, so this is the expected
  // path, not an edge case.
  {
    const probe = (await resend.emails.get(
      "00000000-0000-0000-0000-000000000000",
    )) as { error?: { name?: string; message?: string } };
    if (probe.error?.name === "restricted_api_key") {
      console.error(
        `\nRESEND_API_KEY is send-only, so message status cannot be read.\n` +
          `Resend says: ${probe.error.message}\n\n` +
          `Issue a full-access key and pass it as RESEND_API_KEY for this run.\n` +
          `Without one there is no backfill: the webhook is the only source of\n` +
          `these events.`,
      );
      process.exit(1);
    }
  }

  const rows = await prisma.betaInvite.findMany({
    where: {
      campaign: BETA_CAMPAIGN,
      falconResendMsgId: { not: null },
      falconDeliveredAt: null,
      falconBouncedAt: null,
      falconComplainedAt: null,
    },
    select: { id: true, falconResendMsgId: true, subscriber: { select: { email: true } } },
    take: Number.isFinite(limit) ? limit : undefined,
  });

  console.log(`\nFalcon event backfill`);
  console.log(`Mode:      ${write ? "LIVE WRITE" : "dry-run (use --write)"}`);
  console.log(`Unresolved rows: ${rows.length}`);
  if (rows.length === 0) {
    console.log("\nNothing to backfill.");
    await prisma.$disconnect();
    return;
  }
  console.log(`Pace:      ~${((rows.length * MIN_INTERVAL_MS) / 60000).toFixed(1)} min at 2 req/s\n`);

  const tally: Record<string, number> = {};
  let resolved = 0;
  let pendingStill = 0;
  let errors = 0;

  for (const row of rows) {
    const started = Date.now();
    try {
      const res = await resend.emails.get(row.falconResendMsgId!);
      const lastEvent = (res as { data?: { last_event?: string } }).data?.last_event;
      if (!lastEvent) {
        errors++;
      } else {
        tally[lastEvent] = (tally[lastEvent] ?? 0) + 1;
        const outcome = outcomeFor(lastEvent);
        if (!outcome) {
          pendingStill++;
        } else {
          resolved++;
          if (write) {
            await prisma.betaInvite.update({
              where: { id: row.id },
              data: { [outcome.field]: new Date() },
            });
          }
        }
      }
    } catch (err) {
      errors++;
      if (errors <= 5) console.warn(`  ${row.subscriber.email}: ${(err as Error).message}`);
    }
    const wait = MIN_INTERVAL_MS - (Date.now() - started);
    if (wait > 0) await sleep(wait);
  }

  console.log(`\nStates seen:`);
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${v}`);
  }
  console.log(
    `\n${write ? "Wrote" : "Would write"} ${resolved}, still in flight ${pendingStill}, errors ${errors}.`,
  );
  if (!write) console.log("Re-run with --write to persist.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Backfill crashed:", e);
  process.exit(1);
});
