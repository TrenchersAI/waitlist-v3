import { getPrismaClient } from "@/src/lib/prisma";
import {
  QUESTION_KEYS,
  sanitizeAnswer,
  type QuestionKey,
} from "@/src/lib/survey";

export const runtime = "nodejs";

const HANDLE_KEYS = new Set<QuestionKey>([
  "twitter",
  "telegram",
  "country",
]);

type PostBody = {
  // Either a single answer (the autosave path) ...
  questionKey?: string;
  value?: unknown;
  // ... or the final submit signal.
  action?: "submit";
};

function getIpCountry(request: Request): string | null {
  // Vercel sets x-vercel-ip-country, Cloudflare sets cf-ipcountry. Take
  // whichever is present. Survey runs are bursty enough that we want the
  // free header — Geolocation lookup would add another hop.
  const headers = request.headers;
  return (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null
  );
}

/// Resolve the token, lazily creating a SurveyResponse the first time the
/// recipient hits the URL. Returns the data the survey page needs to
/// pre-fill (existing answers, contact handles, completion state).
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 8) {
    return Response.json({ message: "Invalid link." }, { status: 404 });
  }

  const prisma = getPrismaClient();
  const invite = await prisma.surveyInvite.findUnique({
    where: { token },
    select: {
      id: true,
      campaign: true,
      clickedAt: true,
      subscriber: { select: { email: true } },
      response: {
        select: {
          id: true,
          completedAt: true,
          twitter: true,
          telegram: true,
          countryAnswer: true,
          answers: { select: { questionKey: true, valueJson: true } },
        },
      },
    },
  });

  if (!invite) {
    return Response.json({ message: "Invalid link." }, { status: 404 });
  }

  const now = new Date();
  const ipCountry = getIpCountry(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  // First open of this invite — backstop in case the Resend webhook
  // didn't fire (open tracking is unreliable). And create the response
  // row up-front so the analytics funnel can count "started" without
  // requiring the user to answer anything first.
  //
  // We catch P2002 on the create because React strict-mode (dev) and
  // browser pre-fetches will fire two GETs in parallel; both pass the
  // "no response" check, both try to create. The unique index on
  // inviteId makes the second one fail loudly — we ignore that and let
  // the re-read below pick up whichever row landed first.
  if (!invite.response) {
    await prisma.surveyInvite.update({
      where: { id: invite.id },
      data: { clickedAt: invite.clickedAt ?? now },
    });
    try {
      await prisma.surveyResponse.create({
        data: {
          inviteId: invite.id,
          ipCountry: ipCountry ?? undefined,
          userAgent: userAgent ?? undefined,
        },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "P2002") throw err;
    }
  } else if (!invite.clickedAt) {
    await prisma.surveyInvite.update({
      where: { id: invite.id },
      data: { clickedAt: now },
    });
  }

  // Re-read once so the shape is uniform regardless of whether we just
  // created the response. The extra round-trip is fine — this runs once
  // per visit.
  const fresh = await prisma.surveyInvite.findUnique({
    where: { id: invite.id },
    select: {
      campaign: true,
      subscriber: { select: { email: true } },
      response: {
        select: {
          completedAt: true,
          twitter: true,
          telegram: true,
          countryAnswer: true,
          answers: { select: { questionKey: true, valueJson: true } },
        },
      },
    },
  });

  const answers: Record<string, unknown> = {};
  for (const a of fresh?.response?.answers ?? []) {
    answers[a.questionKey] = a.valueJson;
  }
  if (fresh?.response?.twitter) answers.twitter = fresh.response.twitter;
  if (fresh?.response?.telegram) answers.telegram = fresh.response.telegram;
  if (fresh?.response?.countryAnswer) {
    answers.country = fresh.response.countryAnswer;
  }

  return Response.json({
    email: fresh?.subscriber.email ?? null,
    campaign: fresh?.campaign,
    completed: Boolean(fresh?.response?.completedAt),
    answers,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 8) {
    return Response.json({ message: "Invalid link." }, { status: 404 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return Response.json({ message: "Invalid body." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const invite = await prisma.surveyInvite.findUnique({
    where: { token },
    select: {
      id: true,
      response: {
        select: { id: true, completedAt: true },
      },
    },
  });
  if (!invite) {
    return Response.json({ message: "Invalid link." }, { status: 404 });
  }
  if (!invite.response) {
    return Response.json(
      { message: "Open the survey before submitting." },
      { status: 409 },
    );
  }
  if (invite.response.completedAt) {
    return Response.json(
      { message: "Already submitted." },
      { status: 409 },
    );
  }

  const responseId = invite.response.id;
  const now = new Date();

  if (body.action === "submit") {
    await prisma.surveyResponse.update({
      where: { id: responseId },
      data: { completedAt: now, lastTouchedAt: now },
    });
    return Response.json({ ok: true, completed: true });
  }

  const key = body.questionKey;
  if (
    typeof key !== "string" ||
    !(QUESTION_KEYS as readonly string[]).includes(key)
  ) {
    return Response.json(
      { message: "Unknown question." },
      { status: 400 },
    );
  }
  const sanitized = sanitizeAnswer(key as QuestionKey, body.value);
  if (!sanitized) {
    return Response.json({ message: "Invalid value." }, { status: 400 });
  }

  // Contact handles get hoisted onto SurveyResponse columns so the
  // dashboard can list them without unpacking JSON for every row. Keep
  // them in SurveyAnswer too so the "engaged with this field?" rollup
  // works without a special-case.
  if (HANDLE_KEYS.has(key as QuestionKey)) {
    const value = sanitized.value as string;
    await prisma.surveyResponse.update({
      where: { id: responseId },
      data: {
        lastTouchedAt: now,
        ...(key === "twitter" ? { twitter: value || null } : {}),
        ...(key === "telegram" ? { telegram: value || null } : {}),
        ...(key === "country" ? { countryAnswer: value || null } : {}),
      },
    });
  } else {
    await prisma.surveyResponse.update({
      where: { id: responseId },
      data: { lastTouchedAt: now },
    });
  }

  // Empty strings / empty arrays still count as "touched" — that's the
  // whole point of autosave for the dropout funnel. Persist them.
  await prisma.surveyAnswer.upsert({
    where: {
      responseId_questionKey: { responseId, questionKey: key },
    },
    create: {
      responseId,
      questionKey: key,
      valueJson: sanitized.value as never,
    },
    update: {
      valueJson: sanitized.value as never,
      answeredAt: now,
    },
  });

  return Response.json({ ok: true });
}
