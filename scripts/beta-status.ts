import "dotenv/config";
import { getPrismaClient } from "../src/lib/prisma";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";

async function main() {
  const p = getPrismaClient();
  const w = { campaign: BETA_CAMPAIGN };
  const [sent, delivered, bounced, complained, granted, pending] =
    await Promise.all([
      p.betaInvite.count({ where: { ...w, sentAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, deliveredAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, bouncedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, complainedAt: { not: null } } }),
      p.betaInvite.count({ where: { ...w, accessGrantedAt: { not: null } } }),
      p.betaInvite.count({
        where: { ...w, wave: "wave-1-completed", sentAt: null, failedAt: null },
      }),
    ]);
  const ev = await p.$queryRaw<{ type: string; n: bigint }[]>`
    SELECT type, count(*) AS n FROM "EmailEvent" GROUP BY 1 ORDER BY n DESC`;
  console.log(`sent ${sent} | delivered ${delivered} | bounced ${bounced} | complained ${complained}`);
  console.log(`access granted ${granted} | wave-1 still pending ${pending}`);
  console.log("events:", ev.map((e) => `${e.type}=${e.n}`).join("  "));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await new Promise((r) => setTimeout(r, 200)); });
