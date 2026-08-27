import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import {
  fetchTradersForDay,
  isValidTradingDay,
} from "@/src/lib/trenchers-traders";

export const runtime = "nodejs";
// Live per-click drill-down: never serve a stale/route-cached body. The date is
// part of the query string, and different days must return different data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-USER trading volume breakdown for a SINGLE UTC day, manual vs bot — the
// drill-down behind clicking a bar on the Trading volume chart.
// `?date=YYYY-MM-DD` selects the day (the chart only ever sends a real day with
// activity); an invalid/missing date falls back to the data floor. Auth-gated
// like the other analytics endpoints.
export async function GET(req: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const requested = new URL(req.url).searchParams.get("date");
  const date =
    requested && isValidTradingDay(requested) ? requested : TRADING_FLOOR_ISO;

  const { manual, bot } = await fetchTradersForDay(date);
  return Response.json({ floor: TRADING_FLOOR_ISO, date, manual, bot });
}
