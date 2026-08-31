// Verify what tier badge a wave's users actually see.
//
// The sibling of check-beta-access.ts. That one answers "can they log in";
// this one answers "what does their Rewards badge say".
//
// The badge is NOT a stored string. The frontend derives it in
// `rankDisplayLabel` (trenchers_fe/src/lib/rewards-tiers.ts):
//
//     plusTier != null && plusTier === rank
//       ? `${RANK_LABEL[rank]} Plus`      // "Falcon Plus"
//       : RANK_LABEL[rank]                //  "Falcon"
//
// So the two columns that decide it are `user_points.rank` and
// `user_points.plus_tier`, and the rule reduces to:
//
//     rank = 'titan' AND plus_tier IS NULL   -> "Falcon"
//     rank = 'titan' AND plus_tier = 5       -> "Falcon Plus"
//
// `plus_tier` is an ordinal, not a name: 0 = Bronze .. 5 = Titan/Falcon.
//
// Usage:
//   pnpm exec tsx scripts/check-plus-tier.ts --wave wave-1-completed

import "dotenv/config";

import { getPrismaClient } from "../src/lib/prisma";
import { getTrenchersPool } from "../src/lib/trenchers-db";
import { BETA_CAMPAIGN, WAVE_ORDER, type InviteWave } from "../src/lib/beta-invite";

/// Mirror of RANK_LABEL in the frontend. Note `titan` renders as "Falcon".
const RANK_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  titan: "Falcon",
};
const ORDINAL_TO_RANK = ["bronze", "silver", "gold", "platinum", "diamond", "titan"];

async function main() {
  const args = process.argv.slice(2);
  const i = args.findIndex((a) => a === "--wave" || a.startsWith("--wave="));
  const wave = (
    i < 0 ? undefined : args[i].includes("=") ? args[i].split("=")[1] : args[i + 1]
  ) as InviteWave | undefined;

  if (!wave || !WAVE_ORDER.includes(wave)) {
    console.error(`--wave is required, one of:\n  ${WAVE_ORDER.join("\n  ")}`);
    process.exit(1);
  }

  const prisma = getPrismaClient();
  const invites = await prisma.betaInvite.findMany({
    where: { campaign: BETA_CAMPAIGN, wave, sentAt: { not: null } },
    select: { subscriber: { select: { email: true } } },
  });
  const emails = invites.map((r) => r.subscriber.email.trim().toLowerCase());

  const pool = getTrenchersPool();
  if (!pool) {
    console.error("TRENCHERS_DATABASE_URL must be set.");
    process.exit(1);
  }

  const res = await pool.query<{
    rank: string;
    plus_tier: number | null;
    n: string;
  }>(
    `SELECT up.rank, up.plus_tier, count(*) AS n
       FROM user_points up
       JOIN users u ON u.id = up.user_id
      WHERE u.email IS NOT NULL AND lower(u.email) = ANY($1::text[])
      GROUP BY 1, 2
      ORDER BY count(*) DESC`,
    [emails],
  );
  const rows = res.rows;

  console.log(`\nBadge check - ${wave}`);
  console.log(`Mailed: ${emails.length}`);
  console.log(`With an account and a points row: ${rows.reduce((a, r) => a + Number(r.n), 0)}\n`);
  console.log("  badge shown        rank      plus_tier   users");
  console.log("  -----------------  --------  ----------  -----");
  for (const r of rows) {
    const base = RANK_LABEL[r.rank] ?? r.rank;
    const plusRank = r.plus_tier == null ? null : ORDINAL_TO_RANK[r.plus_tier];
    const badge = plusRank != null && plusRank === r.rank ? `${base} Plus` : base;
    const plusCol = r.plus_tier == null ? "NULL" : `${r.plus_tier} (${plusRank})`;
    console.log(
      `  ${badge.padEnd(17)}  ${r.rank.padEnd(8)}  ${plusCol.padEnd(10)}  ${r.n}`,
    );
  }

  const anyPlus = rows.some(
    (r) => r.plus_tier != null && ORDINAL_TO_RANK[r.plus_tier] === r.rank,
  );
  console.log(
    `\n${anyPlus ? "SOME USERS SEE A \"Plus\" BADGE." : 'No "Plus" badges: every user sees a plain tier name.'}`,
  );

  await pool.end();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nFATAL: ${(err as Error).message}`);
  process.exit(1);
});
