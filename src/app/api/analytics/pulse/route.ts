import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchPlatformPulse } from "@/src/lib/trenchers-pulse";

export const runtime = "nodejs";
// Real-time by request: this section is the "where do we stand right now"
// screen, so it must never be served from a route or data cache. Valid here
// because Cache Components is not enabled in next.config.ts; under Cache
// Components these two exports are removed in Next 16.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Platform-wide founder / marketer metrics from the trenchers prod DB.
//
// SECURITY: this payload is aggregate-only (no per-user PII), but it still
// exposes revenue, deposits, and user counts. The session guard below is the
// ONLY thing standing between it and the open internet: analytics routes are
// protected per-route, not by middleware, so removing it silently makes the
// company's numbers public.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await fetchPlatformPulse();
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // A DB blip should render an error state, not a page of zeros that reads
    // like "the platform is dead".
    console.error("[analytics/pulse] query failed:", err);
    return Response.json(
      { message: "Failed to load platform pulse." },
      { status: 502 },
    );
  }
}
