import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchAllTimeTotals,
  fetchDailyCreatedCounts,
  fetchDailyVerifiedCounts,
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

  const [allTime, rangeTotals, dailyCreated, dailyVerified] = await Promise.all([
    fetchAllTimeTotals(),
    fetchTotalsInRange(from, toInclusive),
    fetchDailyCreatedCounts(from, toInclusive),
    fetchDailyVerifiedCounts(from, toInclusive),
  ]);

  return Response.json({
    viewerEmail: session.email,
    range: { from: fromStr, to: toStr },
    allTime,
    rangeTotals,
    series: {
      signupsByDay: dailyCreated,
      verificationsByDay: dailyVerified,
    },
  });
}
