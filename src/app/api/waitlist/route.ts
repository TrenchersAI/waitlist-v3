import { getPrismaClient } from "../../../lib/prisma";
import {
  sendWaitlistConfirmationEmail,
  sendWaitlistOtpEmail,
} from "../../../lib/email";
import {
  getClientIp,
  limitOtpRequest,
  limitOtpVerify,
} from "../../../lib/rate-limit";
import { verifyTurnstileToken } from "../../../lib/turnstile";

export const runtime = "nodejs";

type WaitlistBody = {
  email?: string;
  otp?: string;
  ref?: string;
  /** Cloudflare Turnstile token from the (invisible) widget. */
  turnstileToken?: string;
  /** Honeypot. A hidden field real users never fill; bots auto-fill it. */
  website?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET(request: Request) {
  try {
    const prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ message: "Please provide a valid email." }, { status: 400 });
    }

    const subscriber = await prisma.waitlistSubscriber.findUnique({
      where: { email },
      select: {
        isVerified: true,
        referralCode: true,
        referralsMade: true,
      },
    });

    if (!subscriber) {
      return Response.json({ message: "Subscriber not found." }, { status: 404 });
    }

    return Response.json(
      {
        verified: subscriber.isVerified,
        referralCode: subscriber.referralCode,
        referralCount: subscriber.referralsMade,
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/waitlist]", error);
    }
    return Response.json(
      { message: "Something went wrong while fetching dashboard data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const prisma = getPrismaClient();
    const body = (await request.json()) as WaitlistBody;
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const ref = body.ref?.trim();
    const ip = getClientIp(request);

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json(
        { message: "Please provide a valid email.", requiresOtp: false, verified: false },
        { status: 400 },
      );
    }

    const existing = await prisma.waitlistSubscriber.findUnique({
      where: { email },
      select: {
        id: true,
        isVerified: true,
        referredById: true,
        referralCode: true,
        referralsMade: true,
        otpCode: true,
        otpExpiresAt: true,
      },
    });

    if (otp) {
      // Cap verify attempts per IP so the 6-digit code can't be brute-forced
      // within its 10-minute lifetime.
      const verifyLimit = await limitOtpVerify(ip);
      if (!verifyLimit.success) {
        return Response.json(
          {
            message: "Too many attempts. Please wait a moment and try again.",
            requiresOtp: true,
            verified: false,
            retryAfterSeconds: verifyLimit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": verifyLimit.retryAfterSeconds.toString(),
            },
          },
        );
      }

      if (!OTP_REGEX.test(otp)) {
        return Response.json(
          { message: "Enter a valid 6-digit code.", requiresOtp: true, verified: false },
          { status: 400 },
        );
      }

      if (!existing) {
        return Response.json(
          {
            message:
              "No waitlist request found for this email. Request a code first.",
            requiresOtp: false,
            verified: false,
          },
          { status: 404 },
        );
      }

      if (existing.isVerified) {
        return Response.json(
          {
            message: "Email already verified. You're already on the waitlist.",
            requiresOtp: false,
            verified: true,
            referralCode: existing.referralCode,
            referralCount: existing.referralsMade,
          },
          { status: 200 },
        );
      }

      const expired =
        !existing.otpExpiresAt || existing.otpExpiresAt.getTime() < Date.now();
      if (!existing.otpCode || expired || existing.otpCode !== otp) {
        return Response.json(
          {
            message: "Invalid or expired code. Please request a new one.",
            requiresOtp: true,
            verified: false,
          },
          { status: 400 },
        );
      }

      const verifiedSubscriber = await prisma.$transaction(async (tx) => {
        if (existing.referredById) {
          await tx.waitlistSubscriber.update({
            where: { id: existing.referredById },
            data: {
              referralsMade: {
                increment: 1,
              },
            },
          });
        }

        return tx.waitlistSubscriber.update({
          where: { email },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            otpCode: null,
            otpExpiresAt: null,
          },
          select: {
            referralCode: true,
            referralsMade: true,
          },
        });
      });

      try {
        await sendWaitlistConfirmationEmail({ to: email });
      } catch (error) {
        console.error("Failed to send waitlist confirmation email:", error);
      }

      return Response.json(
        {
          message: "Email verified. You're in the trenches.",
          requiresOtp: false,
          verified: true,
          referralCode: verifiedSubscriber.referralCode,
          referralCount: verifiedSubscriber.referralsMade,
        },
        { status: 200 },
      );
    }

    // ---- Bot defenses for the OTP-request path (the path that costs us a
    // Resend email + a DB write on every call). All three are invisible to a
    // real user. ----

    // 1) Honeypot: a hidden field humans never see. If it's filled, treat the
    // caller as a bot and return the normal "code sent" shape WITHOUT writing
    // a row or sending an email — so the bot believes it succeeded and wastes
    // its time, while we spend nothing.
    if (body.website && body.website.trim().length > 0) {
      return Response.json(
        {
          message: "Code sent. Check your inbox and verify to join the waitlist.",
          requiresOtp: true,
          verified: false,
          retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
        },
        { status: 200 },
      );
    }

    // 2) Cloudflare Turnstile (no-op until TURNSTILE_SECRET_KEY is set).
    const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstile.ok) {
      return Response.json(
        {
          message: "Couldn't verify you're human. Please refresh and try again.",
          requiresOtp: false,
          verified: false,
        },
        { status: 403 },
      );
    }

    // 3) Per-IP rate limit (no-op until Upstash/KV is configured). This is the
    // fix for the unique-email bypass of the existing per-email cooldown.
    const requestLimit = await limitOtpRequest(ip);
    if (!requestLimit.success) {
      return Response.json(
        {
          message: `Too many requests. Please wait ${requestLimit.retryAfterSeconds}s and try again.`,
          requiresOtp: false,
          verified: false,
          retryAfterSeconds: requestLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": requestLimit.retryAfterSeconds.toString() },
        },
      );
    }

    if (existing?.isVerified) {
      return Response.json(
        {
          message: "You're already on the waitlist.",
          requiresOtp: false,
          verified: true,
          referralCode: existing.referralCode,
          referralCount: existing.referralsMade,
        },
        { status: 200 },
      );
    }

    if (existing?.otpExpiresAt) {
      const issuedAtMs =
        existing.otpExpiresAt.getTime() - OTP_EXPIRY_MS;
      const cooldownEndsAtMs = issuedAtMs + OTP_RESEND_COOLDOWN_MS;
      const now = Date.now();
      if (now < cooldownEndsAtMs) {
        const retryAfterSeconds = Math.ceil(
          (cooldownEndsAtMs - now) / 1000,
        );
        return Response.json(
          {
            message: `Please wait ${retryAfterSeconds}s before requesting a new code.`,
            requiresOtp: true,
            verified: false,
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
    if (existing) {
      await prisma.waitlistSubscriber.update({
        where: { email },
        data: {
          otpCode,
          otpExpiresAt,
        },
      });
    } else {
      const referrer =
        ref && ref.length > 0
          ? await prisma.waitlistSubscriber.findUnique({
              where: { referralCode: ref },
              select: { id: true, email: true },
            })
          : null;

      await prisma.waitlistSubscriber.create({
        data: {
          email,
          referralCode: generateReferralCode(),
          referredById: referrer?.email !== email ? (referrer?.id ?? null) : null,
          otpCode,
          otpExpiresAt,
        },
      });
    }

    try {
      const sendResult = await sendWaitlistOtpEmail({ to: email, otp: otpCode });
      if ("skipped" in sendResult) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[POST /api/waitlist] OTP email skipped: set RESEND_API_KEY and RESEND_FROM_EMAIL in .env",
          );
        }
        return Response.json(
          {
            message:
              "Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL, then try again.",
            requiresOtp: false,
            verified: false,
          },
          { status: 503 },
        );
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to send waitlist OTP email:", detail, error);
      return Response.json(
        {
          message: "Unable to send code right now. Please try again.",
          requiresOtp: false,
          verified: false,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        message: "Code sent. Check your inbox and verify to join the waitlist.",
        requiresOtp: true,
        verified: false,
        retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/waitlist]", error);
    }
    return Response.json(
      {
        message: "Something went wrong while processing your request.",
        requiresOtp: false,
        verified: false,
      },
      { status: 500 },
    );
  }
}
