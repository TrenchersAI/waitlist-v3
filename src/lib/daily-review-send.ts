// =============================================================================
// daily-review-send: the 07:00 IST report (TRE-10015)
// =============================================================================
//
// Called by `/api/cron/daily-review` (Vercel cron, 01:30 UTC). Builds the
// previous 24 h review with the SAME `loadDailyReview` the page uses, then
// emails it (Resend) and posts it to Slack (incoming webhook).
//
// Idempotent per UTC day, two layers:
//   1. `DailyReviewReport` row (waitlist DB). The run CLAIMS the day row with a
//      conditional update; a second concurrent run sees the claim and stops.
//      Each channel is stamped once delivered, so a retry only re-tries the
//      channel that failed.
//   2. Resend `Idempotency-Key: daily-review/<day>`, which also covers the
//      narrow gap of "email accepted, process died before the stamp".
//   Slack webhooks have no idempotency key, so that gap remains for Slack; a
//   rare duplicate post is the accepted cost.

import { Resend } from "resend";

import {
  buildDailyReviewReport,
  type DailyReviewReport as ReportBody,
} from "@/src/lib/daily-review-summary";
import { loadDailyReview } from "@/src/lib/daily-review";
import { getPrismaClient } from "@/src/lib/prisma";
import { SITE_ORIGIN } from "@/src/lib/site-metadata";

/** A claim older than this is treated as a crashed run and can be retaken. */
const CLAIM_STALE_MS = 10 * 60 * 1000;
const SLACK_TIMEOUT_MS = 10_000;

export type ChannelResult = "sent" | "already_sent" | "not_configured" | "failed";

export type SendOutcome =
  | { status: "already_sent"; day: string }
  | { status: "in_progress"; day: string }
  | { status: "done"; day: string; email: ChannelResult; slack: ChannelResult };

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dailyReviewPageUrl(): string {
  const fromEnv = process.env.DAILY_REVIEW_PAGE_URL?.trim();
  return fromEnv || `${SITE_ORIGIN}/analytics`;
}

function recipients(): string[] {
  return (process.env.DAILY_REVIEW_EMAIL_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendEmail(
  report: ReportBody,
  day: string,
): Promise<{ result: ChannelResult; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = recipients();
  if (!apiKey || !from || to.length === 0) return { result: "not_configured" };

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    { from, to, subject: report.subject, html: report.html, text: report.text },
    { idempotencyKey: `daily-review/${day}` },
  );
  if (error || !data) {
    return { result: "failed", error: `email: ${error?.name ?? "no response"}` };
  }
  return { result: "sent", id: data.id };
}

async function postSlack(report: ReportBody): Promise<{ result: ChannelResult; error?: string }> {
  const webhook = process.env.DAILY_REVIEW_SLACK_WEBHOOK_URL;
  if (!webhook) return { result: "not_configured" };
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: report.slackText, unfurl_links: false }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    // The webhook URL is a secret: report only the status, never the URL.
    if (!res.ok) return { result: "failed", error: `slack: HTTP ${res.status}` };
    return { result: "sent" };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { result: "failed", error: timedOut ? "slack: timed out" : "slack: unreachable" };
  }
}

export async function sendDailyReview(now = new Date()): Promise<SendOutcome> {
  const prisma = getPrismaClient();
  const day = utcDay(now);

  const row = await prisma.dailyReviewReport.upsert({
    where: { day },
    create: { day },
    update: {},
  });
  if (row.emailSentAt && row.slackSentAt) return { status: "already_sent", day };

  // Atomic claim: only one run can move claimedAt from empty (or stale) to now.
  const claim = await prisma.dailyReviewReport.updateMany({
    where: {
      day,
      OR: [
        { claimedAt: null },
        { claimedAt: { lt: new Date(now.getTime() - CLAIM_STALE_MS) } },
      ],
    },
    data: { claimedAt: now },
  });
  if (claim.count === 0) return { status: "in_progress", day };

  const errors: string[] = [];
  let email: ChannelResult = "already_sent";
  let slack: ChannelResult = "already_sent";
  try {
    const current = await prisma.dailyReviewReport.findUniqueOrThrow({ where: { day } });
    const review = await loadDailyReview(now);
    const report = buildDailyReviewReport(review, dailyReviewPageUrl());

    if (!current.emailSentAt) {
      const r = await sendEmail(report, day).catch(() => ({
        result: "failed" as const,
        id: undefined,
        error: "email: request failed",
      }));
      email = r.result;
      if (r.error) errors.push(r.error);
      if (r.result === "sent") {
        await prisma.dailyReviewReport.update({
          where: { day },
          data: { emailSentAt: new Date(), emailId: r.id ?? null },
        });
      }
    }

    if (!current.slackSentAt) {
      const r = await postSlack(report);
      slack = r.result;
      if (r.error) errors.push(r.error);
      if (r.result === "sent") {
        await prisma.dailyReviewReport.update({
          where: { day },
          data: { slackSentAt: new Date() },
        });
      }
    }
  } finally {
    await prisma.dailyReviewReport.update({
      where: { day },
      data: { claimedAt: null, lastError: errors.length ? errors.join("; ") : null },
    });
  }

  return { status: "done", day, email, slack };
}
