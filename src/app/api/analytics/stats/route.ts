import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchAllTimeTotals,
  fetchDailyCreatedCounts,
  fetchDailyVerifiedCounts,
  fetchHourlyCreatedCounts,
  fetchHourlyVerifiedCounts,
  fetchTotalsInRange,
  parseAnalyticsRange,
} from "@/src/lib/analytics-stats";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { fromStr, toStr, from, toInclusive } = parseAnalyticsRange(
    searchParams.get("from"),
    searchParams.get("to"),
  );

  // Single-UTC-day windows get hourly buckets too; longer windows skip the
  // extra query.
  const singleDay = fromStr === toStr;

  const [
    allTime,
    rangeTotals,
    dailyCreated,
    dailyVerified,
    hourlyCreated,
    hourlyVerified,
  ] = await Promise.all([
    fetchAllTimeTotals(),
    fetchTotalsInRange(from, toInclusive),
    fetchDailyCreatedCounts(from, toInclusive),
    fetchDailyVerifiedCounts(from, toInclusive),
    singleDay ? fetchHourlyCreatedCounts(from, toInclusive) : Promise.resolve(null),
    singleDay ? fetchHourlyVerifiedCounts(from, toInclusive) : Promise.resolve(null),
  ]);

  return Response.json({
    viewerEmail: session.email,
    range: { from: fromStr, to: toStr },
    allTime,
    rangeTotals,
    series: {
      signupsByDay: dailyCreated,
      verificationsByDay: dailyVerified,
      ...(hourlyCreated ? { signupsByHour: hourlyCreated } : {}),
      ...(hourlyVerified ? { verificationsByHour: hourlyVerified } : {}),
    },
  });
}
