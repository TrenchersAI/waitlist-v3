import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-IP rate limiting for the waitlist signup flow.
 *
 * The OTP-request path is the expensive one: every call writes a row AND
 * sends a Resend email. The pre-existing 60s cooldown is keyed to the
 * *email*, so a bot cycling unique emails bypasses it entirely. These
 * limiters are keyed to the client IP instead, which is the dimension a
 * scripted flood actually shares.
 *
 * Backed by Upstash Redis (durable + shared across all serverless
 * instances — in-memory counters would reset per cold start and per
 * instance, making them useless under fan-out). Reads either the native
 * Upstash env vars or the Vercel KV / Marketplace ones, so it works
 * whichever integration you add in the Vercel dashboard.
 *
 * If neither is configured the limiters become no-ops (fail open) so local
 * dev and a not-yet-configured deploy keep working. Configure them in prod.
 */

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV !== "development") {
      console.warn(
        "[rate-limit] Upstash/KV env vars not set — rate limiting is DISABLED. " +
          "Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the KV_* equivalents).",
      );
    }
    return null;
  }

  return new Redis({ url, token });
}

const redis = getRedis();

/**
 * OTP requests (send/resend): 5 per IP per 10 minutes. Generous enough for
 * a real person who fat-fingers their email a couple of times, tight enough
 * that a flood from one source stops paying for emails almost immediately.
 */
const otpRequestRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "rl:waitlist:otp-request",
      analytics: false,
    })
  : null;

/**
 * OTP verify attempts: 10 per IP per 10 minutes. The code is 6 digits and
 * lives for 10 minutes, so without a cap it is brute-forceable. This bounds
 * the guesses per source well below the keyspace.
 */
const otpVerifyRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "rl:waitlist:otp-verify",
      analytics: false,
    })
  : null;

export type RateLimitResult = {
  success: boolean;
  /** Seconds the caller should wait before retrying (best-effort). */
  retryAfterSeconds: number;
};

const ALLOWED: RateLimitResult = { success: true, retryAfterSeconds: 0 };

async function run(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) return ALLOWED;
  try {
    const { success, reset } = await limiter.limit(key);
    if (success) return ALLOWED;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((reset - Date.now()) / 1000),
    );
    return { success: false, retryAfterSeconds };
  } catch (error) {
    // Never let a Redis hiccup take down signups. Fail open and log.
    console.error("[rate-limit] limiter error, failing open:", error);
    return ALLOWED;
  }
}

export function limitOtpRequest(ip: string) {
  return run(otpRequestRatelimit, ip);
}

export function limitOtpVerify(ip: string) {
  return run(otpVerifyRatelimit, ip);
}

/**
 * Best-effort client IP. `request.ip` / `request.geo` were removed in
 * Next 15, so on Vercel we read the forwarded headers Vercel sets at the
 * edge. `x-forwarded-for` is a comma-separated list; the first entry is the
 * original client. Falls back to a constant so a missing header degrades to
 * a single shared bucket rather than throwing.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    "unknown"
  );
}
