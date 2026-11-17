import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchDailyReview } from "@/src/lib/daily-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Daily Review (TRE-10014): last 24 h of manual trades + health series.
//
// SECURITY: the payload carries platform user ids, and the health series come
// from st-api with OPS_SERVICE_TOKEN. The token stays on this server; the
// session guard below is the ONLY thing between this data and the internet
// (analytics routes are protected per route, not by middleware).
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const review = await fetchDailyReview();
    return Response.json(review, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Each source already degrades to "not measured" on its own; reaching here
    // means something unexpected, which must show as an error, not zeros.
    console.error(
      "[analytics/daily-review] failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return Response.json(
      { message: "Failed to load the daily review." },
      { status: 502 },
    );
  }
}
