import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { getPrismaClient } from "@/src/lib/prisma";
import {
  SURVEY_CAMPAIGN,
  TOOL_OPTIONS,
  VOLUME_OPTIONS,
  WANT_OPTIONS,
} from "@/src/lib/survey";

export const runtime = "nodejs";

// One JSON payload powers the whole dashboard tab. The page is small
// enough that we don't bother with per-card endpoints — one fetch on
// mount is simpler and the queries are cheap on 2k rows.

type FunnelStep = { key: string; label: string; count: number };

type EngagementRow = {
  key: string;
  label: string;
  count: number;
};

type FreeformRow = {
  email: string;
  country: string | null;
  twitter: string | null;
  telegram: string | null;
  volume: string | null;
  freeform: string;
  submittedAt: string | null;
};

export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const prisma = getPrismaClient();

  // 1. Funnel — top-of-funnel and conversion at each Resend stage.
  const [
    totalVerified,
    totalInvited,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    started,
    completed,
  ] = await Promise.all([
    prisma.waitlistSubscriber.count({ where: { isVerified: true } }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, sentAt: { not: null } },
    }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, deliveredAt: { not: null } },
    }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, openedAt: { not: null } },
    }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, clickedAt: { not: null } },
    }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, bouncedAt: { not: null } },
    }),
    prisma.surveyInvite.count({
      where: { campaign: SURVEY_CAMPAIGN, unsubscribedAt: { not: null } },
    }),
    prisma.surveyResponse.count({
      where: { invite: { campaign: SURVEY_CAMPAIGN } },
    }),
    prisma.surveyResponse.count({
      where: {
        invite: { campaign: SURVEY_CAMPAIGN },
        completedAt: { not: null },
      },
    }),
  ]);

  const funnel: FunnelStep[] = [
    { key: "verifiedWaitlist", label: "Verified waitlist", count: totalVerified },
    { key: "sent", label: "Survey invites sent", count: totalInvited },
    { key: "delivered", label: "Delivered", count: delivered },
    { key: "opened", label: "Opened (noisy, see notes)", count: opened },
    { key: "clicked", label: "Clicked the link", count: clicked },
    { key: "started", label: "Started filling", count: started },
    { key: "completed", label: "Submitted", count: completed },
  ];

  // 2. Per-question engagement — how many people answered each question.
  // Powers the "where did people drop?" view since they all see one page.
  const engagementGroups = await prisma.surveyAnswer.groupBy({
    by: ["questionKey"],
    where: { response: { invite: { campaign: SURVEY_CAMPAIGN } } },
    _count: { questionKey: true },
  });
  const engagementByKey = new Map<string, number>();
  for (const g of engagementGroups) {
    engagementByKey.set(g.questionKey, g._count.questionKey);
  }
  const engagement: EngagementRow[] = [
    { key: "tools", label: "Question 1 · Tools", count: engagementByKey.get("tools") ?? 0 },
    { key: "volume", label: "Question 2 · Volume", count: engagementByKey.get("volume") ?? 0 },
    { key: "wants", label: "Question 3 · Agent wants", count: engagementByKey.get("wants") ?? 0 },
    { key: "freeform", label: "Question 4 · Long-form", count: engagementByKey.get("freeform") ?? 0 },
    { key: "twitter", label: "Field · Twitter", count: engagementByKey.get("twitter") ?? 0 },
    { key: "telegram", label: "Field · Telegram", count: engagementByKey.get("telegram") ?? 0 },
    { key: "country", label: "Field · Country", count: engagementByKey.get("country") ?? 0 },
  ];

  // 3. Distributions for the structured questions. Read every answer row
  // for the relevant keys and tally in JS — at 2k responses max this is
  // a few KB of JSON and avoids the Prisma JSON-array query complexity.
  const distRows = await prisma.surveyAnswer.findMany({
    where: {
      response: { invite: { campaign: SURVEY_CAMPAIGN } },
      questionKey: { in: ["tools", "volume", "wants"] },
    },
    select: { questionKey: true, valueJson: true },
  });

  const toolCounts = new Map<string, number>();
  const volumeCounts = new Map<string, number>();
  const wantCounts = new Map<string, number>();
  for (const row of distRows) {
    if (row.questionKey === "tools" && Array.isArray(row.valueJson)) {
      for (const t of row.valueJson) {
        if (typeof t === "string") {
          toolCounts.set(t, (toolCounts.get(t) ?? 0) + 1);
        }
      }
    } else if (
      row.questionKey === "volume" &&
      typeof row.valueJson === "string"
    ) {
      volumeCounts.set(
        row.valueJson,
        (volumeCounts.get(row.valueJson) ?? 0) + 1,
      );
    } else if (row.questionKey === "wants" && Array.isArray(row.valueJson)) {
      for (const w of row.valueJson) {
        if (typeof w === "string") {
          wantCounts.set(w, (wantCounts.get(w) ?? 0) + 1);
        }
      }
    }
  }

  const toolsDist = TOOL_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    count: toolCounts.get(o.key) ?? 0,
  })).sort((a, b) => b.count - a.count);
  const volumeDist = VOLUME_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    count: volumeCounts.get(o.key) ?? 0,
  }));
  const wantsDist = WANT_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    count: wantCounts.get(o.key) ?? 0,
  })).sort((a, b) => b.count - a.count);

  // 4. Country breakdown — preferred: user-stated country. Fall back to
  // ipCountry for rows where it's missing. Group case-insensitively so
  // "India" / "india" / "INDIA" collapse.
  const responseRows = await prisma.surveyResponse.findMany({
    where: { invite: { campaign: SURVEY_CAMPAIGN } },
    select: {
      countryAnswer: true,
      ipCountry: true,
      completedAt: true,
    },
  });
  const countryCounts = new Map<string, { count: number; source: "user" | "ip" }>();
  for (const r of responseRows) {
    const user = r.countryAnswer?.trim();
    if (user) {
      const k = user.toLowerCase();
      const prev = countryCounts.get(k);
      countryCounts.set(k, {
        count: (prev?.count ?? 0) + 1,
        source: prev?.source ?? "user",
      });
      continue;
    }
    const ip = r.ipCountry?.trim();
    if (ip) {
      const k = ip.toLowerCase();
      const prev = countryCounts.get(k);
      countryCounts.set(k, {
        count: (prev?.count ?? 0) + 1,
        source: prev?.source ?? "ip",
      });
    }
  }
  const countries = Array.from(countryCounts.entries())
    .map(([k, v]) => ({ key: k, label: k, count: v.count, source: v.source }))
    .sort((a, b) => b.count - a.count);

  // 5. Freeform answers — show the most recent N submitted, with the
  // user's other context so reviewers don't context-switch back to the
  // table. Empty/short answers are excluded so the page doesn't fill
  // with `""`.
  const freeformAnswers = await prisma.surveyAnswer.findMany({
    where: {
      questionKey: "freeform",
      response: { invite: { campaign: SURVEY_CAMPAIGN } },
    },
    orderBy: { answeredAt: "desc" },
    take: 200,
    select: {
      valueJson: true,
      answeredAt: true,
      response: {
        select: {
          completedAt: true,
          countryAnswer: true,
          twitter: true,
          telegram: true,
          invite: {
            select: {
              subscriber: { select: { email: true } },
            },
          },
          answers: {
            where: { questionKey: "volume" },
            select: { valueJson: true },
          },
        },
      },
    },
  });
  const freeform: FreeformRow[] = [];
  for (const row of freeformAnswers) {
    const text = typeof row.valueJson === "string" ? row.valueJson.trim() : "";
    if (text.length < 4) continue;
    const volume =
      typeof row.response.answers[0]?.valueJson === "string"
        ? (row.response.answers[0].valueJson as string)
        : null;
    freeform.push({
      email: row.response.invite.subscriber.email,
      country: row.response.countryAnswer,
      twitter: row.response.twitter,
      telegram: row.response.telegram,
      volume,
      freeform: text,
      submittedAt: row.response.completedAt?.toISOString() ?? null,
    });
  }

  return Response.json({
    campaign: SURVEY_CAMPAIGN,
    funnel,
    engagement,
    distributions: {
      tools: toolsDist,
      volume: volumeDist,
      wants: wantsDist,
    },
    countries,
    freeform,
    generatedAt: new Date().toISOString(),
  });
}
