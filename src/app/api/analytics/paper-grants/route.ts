import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { fetchPaperGrants } from "@/src/lib/trenchers-paper-grants";

export const runtime = "nodejs";

// Per-day PAPER SOL GIVEN to users (approved top-ups from the ops console),
// split auto-approved vs operator-approved, plus the pending backlog.
// Auth-gated like the other analytics endpoints.
export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const payload = await fetchPaperGrants();
  return Response.json(payload);
}
