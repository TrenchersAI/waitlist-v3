import { timingSafeEqual } from "node:crypto";

import { sendDailyReview } from "@/src/lib/daily-review-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

// 07:00 IST daily report (TRE-10015). Scheduled by `vercel.json` at 01:30 UTC.
//
// Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set on the project. Anything else gets 401. With no
// secret configured the route refuses to run at all (503), so a missing env
// var can never leave it open.
function authorized(req: Request, secret: string): boolean {
  const got = Buffer.from(req.headers.get("authorization") ?? "", "utf8");
  const want = Buffer.from(`Bearer ${secret}`, "utf8");
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ message: "CRON_SECRET is not set." }, { status: 503 });
  }
  if (!authorized(req, secret)) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const outcome = await sendDailyReview();
    // A failed channel returns 500 so the run shows as failed in the Vercel
    // cron log; re-running it only retries the channel that did not go out.
    const failed =
      outcome.status === "done" &&
      (outcome.email === "failed" || outcome.slack === "failed");
    return Response.json(outcome, { status: failed ? 500 : 200 });
  } catch (err) {
    console.error(
      "[cron/daily-review] failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return Response.json({ message: "Daily review run failed." }, { status: 500 });
  }
}
