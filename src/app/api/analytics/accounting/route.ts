import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchAccounting } from "@/src/lib/trenchers-accounting";

export const runtime = "nodejs";

// Platform accounting — revenue collected vs rakeback + referral promised, the
// reconciliation invariants that say whether those figures can be believed, and
// the per-user ledger behind them. Reads the trenchers prod DB.
//
// Auth-gated like every other analytics endpoint: this exposes per-user revenue
// and wallet addresses, so it must never be reachable without a session.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await fetchAccounting();
    return Response.json(payload);
  } catch (error) {
    // Surface the reason rather than a bare 500 — the dashboard renders it, and
    // "could not compute" must never be mistaken for "computed, all zero".
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { message: `Could not load accounting data: ${message}` },
      { status: 500 },
    );
  }
}
