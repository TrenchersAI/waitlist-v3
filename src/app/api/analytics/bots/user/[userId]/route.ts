import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchUserBots } from "@/src/lib/trenchers-bot-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Rough UUID shape check. A malformed id would otherwise reach Postgres and
 *  come back as a 22P02 cast error rendered to the operator as a 502. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every bot one user has spawned. Drill-down level 1 of the Bots tab.
//
// SECURITY: contains user PII and balances. The session guard is the ONLY
// thing between this and the open internet; analytics routes are protected
// per-route, not by middleware.
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { userId } = await context.params;
  if (!UUID.test(userId)) {
    return Response.json({ message: "Invalid user id." }, { status: 400 });
  }

  try {
    const payload = await fetchUserBots(userId);
    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[analytics/bots/user] query failed:", err);
    return Response.json(
      { message: "Failed to load bots for this user." },
      { status: 502 },
    );
  }
}
