import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { TRADING_FLOOR_ISO } from "@/src/lib/trenchers-analytics";
import { fetchPaperVolume } from "@/src/lib/trenchers-paper";

export const runtime = "nodejs";

// Per-day PAPER BOT trading volume (SOL), split buys vs sells, from the
// trenchers prod DB. Auth-gated like the other analytics endpoints.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const volume = await fetchPaperVolume();
  return Response.json({ floor: TRADING_FLOOR_ISO, volume });
}
