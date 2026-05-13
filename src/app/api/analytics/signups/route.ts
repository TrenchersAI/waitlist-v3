import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchRecentSignups,
  parseAnalyticsRange,
  type SignupStatusFilter,
} from "@/src/lib/analytics-stats";

export const runtime = "nodejs";

const STATUS_VALUES: SignupStatusFilter[] = ["all", "verified", "pending"];

export async function GET(request: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { from, toInclusive } = parseAnalyticsRange(
    searchParams.get("from"),
    searchParams.get("to"),
  );

  const rawStatus = searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const status = STATUS_VALUES.includes(rawStatus as SignupStatusFilter)
    ? (rawStatus as SignupStatusFilter)
    : "all";

  const take = Math.min(
    100,
    Math.max(10, Number.parseInt(searchParams.get("limit") ?? "40", 10) || 40),
  );
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const skip = page * take;

  const { items, total } = await fetchRecentSignups({
    from,
    toInclusive,
    status,
    take,
    skip,
  });

  return Response.json({
    items,
    total,
    page,
    pageSize: take,
    status,
  });
}
