import { randomBytes } from "node:crypto";

import { getPrismaClient } from "@/src/lib/prisma";
import { SURVEY_CAMPAIGN } from "@/src/lib/survey";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/// Lookup endpoint for the public /survey entry page. Takes an email and
/// tells the client what to do next:
///   - verified subscriber           → returns { status: "ok", token }
///   - unverified or unknown email   → returns { status: "needs_otp" }
///
/// We never leak whether an email exists in our waitlist — both the
/// unverified-existing and not-found cases collapse into the same
/// "needs_otp" response, leaving the OTP flow on the homepage to handle
/// both signup and re-verification uniformly.
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return Response.json({ message: "Invalid body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json(
      { message: "Please provide a valid email." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const subscriber = await prisma.waitlistSubscriber.findUnique({
    where: { email },
    select: { id: true, isVerified: true },
  });

  if (!subscriber || !subscriber.isVerified) {
    return Response.json({ status: "needs_otp" as const });
  }

  // Verified — fetch or create their survey invite for this campaign. We
  // intentionally don't set sentAt: this code path is the user landing
  // directly on the survey, not us emailing them, so the funnel's "sent"
  // bucket would be misleading.
  let invite = await prisma.surveyInvite.findUnique({
    where: { subscriberId: subscriber.id },
    select: { token: true },
  });
  if (!invite) {
    invite = await prisma.surveyInvite.create({
      data: {
        campaign: SURVEY_CAMPAIGN,
        subscriberId: subscriber.id,
        token: randomBytes(24).toString("base64url"),
      },
      select: { token: true },
    });
  }

  return Response.json({ status: "ok" as const, token: invite.token });
}
