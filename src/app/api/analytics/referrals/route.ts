import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchDailyReferredSplit,
  fetchHourlyReferredSplit,
  fetchReferralStats,
  fetchTopReferrers,
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

  const limitParam = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitParam) ? limitParam : 10;

  // Single-UTC-day windows get hourly buckets too — matches the stats route's
  // behaviour so the Referrals chart can switch to hour mode on "1d" / "Today".
  const singleDay = fromStr === toStr;

  const [referralStats, topReferrers, dailySplit, hourlySplit] =
    await Promise.all([
      fetchReferralStats(from, toInclusive),
      fetchTopReferrers(limit),
      fetchDailyReferredSplit(from, toInclusive),
      singleDay
        ? fetchHourlyReferredSplit(from, toInclusive)
        : Promise.resolve(null),
    ]);

  return Response.json({
    range: { from: fromStr, to: toStr },
    stats: referralStats,
    topReferrers,
    dailySplit,
    ...(hourlySplit ? { hourlySplit } : {}),
  });
}
