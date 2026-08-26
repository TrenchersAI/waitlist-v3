import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchUserActivity } from "@/src/lib/trenchers-user-activity";

export const runtime = "nodejs";

// Daily active users (DAU) + new signups, and daily active bots + a live "now"
// count, from the trenchers prod DB. Auth-gated like the other analytics
// endpoints.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const data = await fetchUserActivity();
  return Response.json(data);
}
