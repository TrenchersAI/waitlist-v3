import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import {
  fetchTraderDays,
  fetchTradersForDay,
  isValidTradingDay,
} from "@/src/lib/trenchers-traders";

export const runtime = "nodejs";

// Per-USER trading volume breakdown for a SINGLE UTC day, manual vs bot — the
// drill-down behind the Manual / Bot headline cards on the Trading volume
// dashboard. `?date=YYYY-MM-DD` selects the day; with no (or an invalid) date
// we default to the most recent day that has any activity. Auth-gated like the
// other analytics endpoints.
export async function GET(req: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const days = await fetchTraderDays();

  const requested = new URL(req.url).searchParams.get("date");
  // Pick the requested day only if it's valid AND actually has data; otherwise
  // fall back to the newest active day (days[0]), and finally to the floor so
  // the response always carries a well-formed date.
  const date =
    requested && isValidTradingDay(requested) && days.includes(requested)
      ? requested
      : (days[0] ?? TRADING_FLOOR_ISO);

  const { manual, bot } = await fetchTradersForDay(date);

  return Response.json({ floor: TRADING_FLOOR_ISO, date, days, manual, bot });
}
