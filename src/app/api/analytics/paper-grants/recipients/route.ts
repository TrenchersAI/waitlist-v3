import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  PAPER_GRANTS_FLOOR_ISO,
  fetchPaperGrantRecipientsForDay,
  isValidPaperGrantDay,
} from "@/src/lib/trenchers-paper-grants";

export const runtime = "nodejs";
// Live per-click drill-down: never serve a stale/route-cached body. The date is
// part of the query string, and different days must return different data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Who received paper SOL on a SINGLE UTC day — the drill-down behind clicking a
// bar on the Paper SOL given chart. `?date=YYYY-MM-DD` selects the day; an
// invalid/missing date falls back to the data floor. Auth-gated like the other
// analytics endpoints.
export async function GET(req: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const requested = new URL(req.url).searchParams.get("date");
  const date =
    requested && isValidPaperGrantDay(requested)
      ? requested
      : PAPER_GRANTS_FLOOR_ISO;

  const recipients = await fetchPaperGrantRecipientsForDay(date);
  return Response.json({ floor: PAPER_GRANTS_FLOOR_ISO, date, recipients });
}
