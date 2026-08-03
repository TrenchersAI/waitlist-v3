import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchBotsAnalytics } from "@/src/lib/trenchers-bots";

export const runtime = "nodejs";
// Real-time by request: this section answers "who is live right now", so it
// must never be served from a route or data cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Live bot adoption, deposits, and per-user PnL from the trenchers prod DB.
//
// SECURITY: this payload contains user PII (email, display name, wallet) and
// balances. The session guard below is the ONLY thing standing between it and
// the open internet — analytics routes are protected per-route, not by
// middleware, so removing it silently makes user data public.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await fetchBotsAnalytics();
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // A DB blip should render an error state, not a page of zeros that reads
    // like "nobody is trading".
    console.error("[analytics/bots] query failed:", err);
    return Response.json(
      { message: "Failed to load bot analytics." },
      { status: 502 },
    );
  }
}
