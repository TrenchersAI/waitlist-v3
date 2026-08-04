import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchBotDetail } from "@/src/lib/trenchers-bot-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One bot's full story: config, balances, open positions, every trade.
// Drill-down level 2 of the Bots tab.
//
// SECURITY: exposes a customer's bot configuration and wallet. Session-guarded
// per-route, same as every other analytics endpoint.
export async function GET(
  _request: Request,
  context: { params: Promise<{ botId: string }> },
) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { botId } = await context.params;
  if (!UUID.test(botId)) {
    return Response.json({ message: "Invalid bot id." }, { status: 400 });
  }

  try {
    const payload = await fetchBotDetail(botId);
    if (payload.available && !payload.bot) {
      return Response.json({ message: "Bot not found." }, { status: 404 });
    }
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[analytics/bots/detail] query failed:", err);
    return Response.json(
      { message: "Failed to load bot detail." },
      { status: 502 },
    );
  }
}
