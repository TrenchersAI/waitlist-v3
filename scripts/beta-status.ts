// One-line health read for a live send. Read-only, safe to run any time.
//
// Delivery comes from our own records; activation is read from the
// terminal's users table, because "signed in" is the only number here that
// reflects a person actually arriving rather than a message being accepted.
//
//   pnpm exec tsx scripts/beta-status.ts

import "dotenv/config";

import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";

const pct = (n: number, d: number, dp = 2) =>
  d > 0 ? `${((n / d) * 100).toFixed(dp)}%` : "n/a";

async function main() {
  const p = getPrismaClient();
  const w = { campaign: BETA_CAMPAIGN };

  const [total, granted, sent, delivered, bounced, complained, unsub, failed, pending] =
    await Promise.all([
      p.betaInvite.count({ where: w }),
      p.betaInvite.count({ where: { ...w, accessGrantedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, sentAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, deliveredAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, bouncedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, complainedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, unsubscribedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, failedAt: { not: null } } }),
      p.betaInvite.count({
        where: { ...w, wave: "wave-1-completed", sentAt: null, failedAt: null },
      }),
    ]);

  console.log(`\ncampaign ${BETA_CAMPAIGN}`);
  console.log(`  prepared     ${total}    access granted ${granted}`);
  console.log(`  sent         ${sent}    delivered ${delivered} (${pct(delivered, sent)})`);
  console.log(`  bounced      ${bounced} (${pct(bounced, sent)})   pause 2%, Resend suspends 4%`);
  console.log(`  complained   ${complained} (${pct(complained, sent, 3)})   pause 0.04%, Resend suspends 0.08%`);
  console.log(`  unsubscribed ${unsub}    send failures ${failed}`);
  console.log(`  wave-1 pending ${pending}`);

  // Activation, straight from the terminal: invitees who now exist in its
  // users table have signed in, as opposed to merely having been mailed.
  const pool = getTrenchersPool();
  if (!pool) {
    console.log("\n  (TRENCHERS_DATABASE_URL unset, activation unavailable)");
    return;
  }
  try {
    const rows = await p.betaInvite.findMany({
      where: { ...w, sentAt: { not: null } },
      select: { subscriber: { select: { email: true } } },
    });
    const emails = rows.map((r) => r.subscriber.email.trim().toLowerCase());
    const [mine, all] = await Promise.all([
      pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM users
          WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
        [emails],
      ),
      pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM users`),
    ]);
    const signedIn = Number(mine.rows[0].n);
    console.log(
      `\n  SIGNED IN    ${signedIn} of ${sent} mailed (${pct(signedIn, sent)})` +
        `   terminal users overall ${all.rows[0].n}`,
    );
  } finally {
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 200));
  });
