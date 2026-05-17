import { getPrismaClient } from "@/src/lib/prisma";
import { isInternalAnalyticsEmail } from "@/src/lib/analytics-email-domain";
import {
  createAnalyticsSession,
  getAnalyticsSessionFromCookies,
  revokeCurrentAnalyticsSession,
  setAnalyticsSessionCookie,
} from "@/src/lib/analytics-internal";
import { sendInternalAnalyticsOtpEmail } from "@/src/lib/email";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const ANALYTICS_MASTER_CODE = "160426";

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type Body =
  | { action: "request"; email?: string }
  | { action: "verify"; email?: string; otp?: string }
  | { action: "logout" };

export async function GET() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ authenticated: false });
  }
  return Response.json({ authenticated: true, email: session.email });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (body.action === "logout") {
    await revokeCurrentAnalyticsSession();
    return Response.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  if (!isInternalAnalyticsEmail(email)) {
    return Response.json(
      { message: "Only Trenchers team addresses can open this dashboard." },
      { status: 403 },
    );
  }

  const prisma = getPrismaClient();

  if (body.action === "request") {
    const existing = await prisma.analyticsOtpChallenge.findUnique({
      where: { email },
    });

    if (existing?.otpExpiresAt) {
      const issuedAtMs = existing.otpExpiresAt.getTime() - OTP_EXPIRY_MS;
      const cooldownEndsAtMs = issuedAtMs + OTP_RESEND_COOLDOWN_MS;
      const now = Date.now();
      if (now < cooldownEndsAtMs) {
        const retryAfterSeconds = Math.ceil((cooldownEndsAtMs - now) / 1000);
        return Response.json(
          {
            message: `Please wait ${retryAfterSeconds}s before requesting a new code.`,
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: { "Retry-After": retryAfterSeconds.toString() },
          },
        );
      }
    }

    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await prisma.analyticsOtpChallenge.upsert({
      where: { email },
      create: { email, otpCode, otpExpiresAt },
      update: { otpCode, otpExpiresAt },
    });

    try {
      const sendResult = await sendInternalAnalyticsOtpEmail({
        to: email,
        otp: otpCode,
      });
      if ("skipped" in sendResult) {
        return Response.json(
          { message: "Email delivery is not configured on this deployment." },
          { status: 503 },
        );
      }
    } catch (error) {
      console.error("[analytics auth] OTP email failed:", error);
      return Response.json(
        { message: "Unable to send code right now. Please try again." },
        { status: 503 },
      );
    }

    return Response.json({
      message: "Code sent. Check your inbox.",
      retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  }

  if (body.action === "verify") {
    const otp = body.otp?.trim();
    if (!otp || !OTP_REGEX.test(otp)) {
      return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });
    }

    const isMasterCode = otp === ANALYTICS_MASTER_CODE;
    const challenge = await prisma.analyticsOtpChallenge.findUnique({
      where: { email },
    });

    if (!challenge && !isMasterCode) {
      return Response.json(
        { message: "Request a code first for this email." },
        { status: 400 },
      );
    }

    if (!isMasterCode) {
      const expired = challenge!.otpExpiresAt.getTime() < Date.now();
      if (expired || challenge!.otpCode !== otp) {
        return Response.json(
          { message: "Invalid or expired code." },
          { status: 400 },
        );
      }
    }

    if (challenge) {
      await prisma.analyticsOtpChallenge.delete({ where: { email } });
    }
    const { token, expiresAt } = await createAnalyticsSession(email);
    await setAnalyticsSessionCookie(token, expiresAt);

    return Response.json({ ok: true, email });
  }

  return Response.json({ message: "Unknown action." }, { status: 400 });
}
