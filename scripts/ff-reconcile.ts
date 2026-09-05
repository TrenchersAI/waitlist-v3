import "dotenv/config";
import { getPrismaClient } from "../src/lib/prisma";
type P = { data?: { email_id?: string; tags?: { campaign?: string; sendId?: string } } };
const CAMPAIGN = "founding-falcon-2026-09";
// The webhook branch that writes these columns is not deployed yet, so the
// events sit in EmailEvent unmatched. Replay them, keyed on the `sendId` tag
// the send itself carried.
async function main() {
  const p = getPrismaClient();
  const ev = await p.emailEvent.findMany({
    where: { occurredAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    select: { type: true, payload: true }, take: 20000 });
  const col: Record<string, string> = {
    "email.delivered": "deliveredAt", "email.bounced": "bouncedAt",
    "email.failed": "bouncedAt", "email.complained": "complainedAt",
    "email.suppressed": "suppressedAt",
  };
  const byCol = new Map<string, Set<string>>();
  for (const e of ev) {
    const d = (e.payload as P)?.data;
    if (d?.tags?.campaign !== CAMPAIGN) continue;
    const c = col[e.type]; const id = d.tags.sendId;
    if (!c || !id) continue;
    if (!byCol.has(c)) byCol.set(c, new Set());
    byCol.get(c)!.add(id);
  }
  for (const [c, set] of byCol) {
    const n = await p.$executeRawUnsafe(
      `UPDATE "CampaignSend" SET "${c}" = now() WHERE id = ANY($1::text[]) AND "${c}" IS NULL`,
      [...set]);
    console.log(`  ${c}: ${n} stamped (${set.size} in events)`);
  }
}
main().catch(e => { console.error("ERR:", e.message); process.exit(1); });
