// Repair `falconClaimSentAt` for messages that WERE delivered but could not be
// stamped.
//
// WHY THIS IS NEEDED. The sender stamps each batch after Resend accepts it.
// The first live batch delivered 100 messages and then hit Prisma's 5s
// interactive-transaction limit while stamping (100 sequential updates through
// the Supabase pooler), so it retried four times, failed, and aborted by
// design rather than continue -- an unstamped row looks pending and would be
// mailed a SECOND time on the next run.
//
// WHY THE WEBHOOK IS THE SOURCE OF TRUTH HERE. The message ids were lost with
// the process, and `findMany` without an `orderBy` gives no stable order, so
// "the first 100 again" is not reproducible. But every send carries its
// `subscriberId` in the Resend tags, and the webhook stores the whole payload,
// so the delivered set can be reconstructed exactly from EmailEvent rather
// than guessed.
//
// IDEMPOTENT. Only stamps rows where `falconClaimSentAt IS NULL`, so running
// it twice changes nothing and it is safe to run before any resume.
//
//   pnpm exec tsx scripts/repair-falcon-claim-stamps.ts --dry-run
//   pnpm exec tsx scripts/repair-falcon-claim-stamps.ts

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";

const CAMPAIGN = "beta-falcon-claim";

type Payload = {
  data?: {
    email_id?: string;
    tags?: { campaign?: string; subscriberId?: string };
  };
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrismaClient();

  const events = await prisma.emailEvent.findMany({
    where: { type: "email.sent" },
    select: { payload: true },
    orderBy: { occurredAt: "desc" },
    take: 20_000,
  });

  // subscriberId -> message id. Last write wins, which is what we want: a
  // resend of the same address should record the newest message.
  const found = new Map<string, string>();
  for (const e of events) {
    const d = (e.payload as Payload)?.data;
    if (d?.tags?.campaign !== CAMPAIGN) continue;
    const sub = d.tags.subscriberId;
    if (sub && !found.has(sub)) found.set(sub, d.email_id ?? "");
  }

  const ids = [...found.keys()];
  const unstamped = await prisma.waitlistSubscriber.findMany({
    where: { id: { in: ids }, falconClaimSentAt: null },
    select: { id: true },
  });

  console.log(`\nRepair falcon-claim stamps`);
  console.log(`  delivered per webhook : ${ids.length}`);
  console.log(`  unstamped of those    : ${unstamped.length}`);
  console.log(`  mode: ${dryRun ? "DRY RUN — nothing is written" : "live"}\n`);
  // Outcomes are reconciled even when nothing needs stamping: the two
  // failures are independent, and the common case after a clean run is
  // exactly "all stamped, but some deliveries lost the race".
  if (dryRun) return;
  if (unstamped.length === 0) {
    await reconcileOutcomes(prisma);
    return;
  }

  // ONE statement. The whole reason this repair exists is that N updates in a
  // transaction cannot finish inside Prisma's 5s interactive limit over the
  // pooler, so the repair must not repeat the mistake.
  const subIds = unstamped.map((r) => r.id);
  const msgIds = subIds.map((id) => found.get(id) ?? "");
  const n = await prisma.$executeRaw`
    UPDATE "WaitlistSubscriber" AS w
       SET "falconClaimSentAt" = now(),
           "falconClaimResendMsgId" = NULLIF(v.msg, '')
      FROM (SELECT unnest(${subIds}::text[]) AS id,
                   unnest(${msgIds}::text[]) AS msg) v
     WHERE w.id = v.id AND w."falconClaimSentAt" IS NULL`;

  const left = await prisma.waitlistSubscriber.count({
    where: { id: { in: ids }, falconClaimSentAt: null },
  });
  console.log(`  stamped:    ${n}`);
  console.log(`  still null: ${left}   (expect 0)\n`);

  await reconcileOutcomes(prisma);
}

/// Replay delivery outcomes that the webhook could not match at the time.
///
/// Resend can deliver and fire `email.delivered` BEFORE the sender's stamping
/// statement commits the message id, and the webhook's original lookup was by
/// message id alone -- so the first batch's 96 deliveries and 1 bounce all
/// found no row and were dropped. The webhook now matches on the
/// `subscriberId` tag, which cannot lose that race, but the events already
/// dropped only exist in EmailEvent. This replays them.
///
/// It matters beyond tidiness: the sender's mid-flight abort reads
/// `falconClaimBouncedAt`, so bounces that never landed are an abort that
/// cannot fire.
async function reconcileOutcomes(prisma: ReturnType<typeof getPrismaClient>) {
  const events = await prisma.emailEvent.findMany({
    select: { type: true, payload: true },
    orderBy: { occurredAt: "desc" },
    take: 20_000,
  });

  const col: Record<string, string> = {
    "email.delivered": "falconClaimDeliveredAt",
    "email.bounced": "falconClaimBouncedAt",
    "email.failed": "falconClaimBouncedAt",
    "email.complained": "falconClaimComplainedAt",
    "email.suppressed": "falconClaimSuppressedAt",
  };
  const byCol = new Map<string, Set<string>>();
  for (const e of events) {
    const d = (e.payload as Payload)?.data;
    if (d?.tags?.campaign !== CAMPAIGN) continue;
    const c = col[e.type];
    const sub = d.tags.subscriberId;
    if (!c || !sub) continue;
    if (!byCol.has(c)) byCol.set(c, new Set());
    byCol.get(c)!.add(sub);
  }

  console.log(`Reconcile outcomes from webhook events`);
  for (const [c, set] of byCol) {
    const arr = [...set];
    // Column name is from the fixed `col` map above, never from event data,
    // so interpolating it into the statement cannot be steered by a payload.
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "WaitlistSubscriber" SET "${c}" = now()
        WHERE id = ANY($1::text[]) AND "${c}" IS NULL`,
      arr,
    );
    console.log(`  ${c}: ${updated} stamped (${arr.length} in events)`);
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
