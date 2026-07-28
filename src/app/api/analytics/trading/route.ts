import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchTradingRevenue,
  fetchTradingVolume,
  TRADING_FLOOR_ISO,
} from "@/src/lib/trenchers-analytics";

export const runtime = "nodejs";

// Per-day trading VOLUME and REVENUE (SOL), split bot vs manual, from the
// trenchers prod DB. Auth-gated like the other analytics endpoints.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const [volume, revenue] = await Promise.all([
    fetchTradingVolume(),
    fetchTradingRevenue(),
  ]);

  return Response.json({ floor: TRADING_FLOOR_ISO, volume, revenue });
}
