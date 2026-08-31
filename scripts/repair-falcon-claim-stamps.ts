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
  if (dryRun || unstamped.length === 0) return;

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
}

main()
  .catch((err) => {
    console.error("FAILED:", (err as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
