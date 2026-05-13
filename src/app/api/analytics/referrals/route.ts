import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchDailyReferredSplit,
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

  const [referralStats, topReferrers, dailySplit] = await Promise.all([
    fetchReferralStats(from, toInclusive),
    fetchTopReferrers(limit),
    fetchDailyReferredSplit(from, toInclusive),
  ]);

  return Response.json({
    range: { from: fromStr, to: toStr },
    stats: referralStats,
    topReferrers,
    dailySplit,
  });
}
