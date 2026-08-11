import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { loadRouterTrades } from "@/src/lib/trenchers-router-trades";

export const runtime = "nodejs";
// Live figures straight from bot_trades: never serve this from a route or data
// cache. Mirrors the Bots endpoint.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Router (bot_trades) execution analytics from the trenchers prod DB.
//
// SECURITY: this payload includes bot_id / user_id identifiers. The session
// guard below is the ONLY thing between it and the open internet — analytics
// routes are protected per-route, not by middleware, so removing it silently
// makes the data public.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await loadRouterTrades();
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // A DB blip should render an error state, not a page of zeros that reads
    // like "nothing is trading".
    console.error("[analytics/router-trades] query failed:", err);
    return Response.json(
      { message: "Failed to load router trade analytics." },
      { status: 502 },
    );
  }
}
