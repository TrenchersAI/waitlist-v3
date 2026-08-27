import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import { fetchTradingTraders } from "@/src/lib/trenchers-traders";

export const runtime = "nodejs";

// Per-USER trading volume breakdown, manual vs bot — the drill-down behind the
// Manual / Bot headline cards on the Trading volume dashboard. Auth-gated like
// the other analytics endpoints.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { manual, bot } = await fetchTradingTraders();
  return Response.json({ floor: TRADING_FLOOR_ISO, manual, bot });
}
