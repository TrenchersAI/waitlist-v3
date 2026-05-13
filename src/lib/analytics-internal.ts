import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { getPrismaClient } from "@/src/lib/prisma";

export const ANALYTICS_SESSION_COOKIE_NAME = "trenchers_analytics_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export { isInternalAnalyticsEmail } from "@/src/lib/analytics-email-domain";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function getAnalyticsSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ANALYTICS_SESSION_COOKIE_NAME)?.value;
  if (!token || token.length < 32) return null;

  const prisma = getPrismaClient();
  const tokenHash = hashSessionToken(token);
  const row = await prisma.analyticsSession.findUnique({
    where: { tokenHash },
    select: { email: true, expiresAt: true },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return { email: row.email };
}

export async function revokeCurrentAnalyticsSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ANALYTICS_SESSION_COOKIE_NAME)?.value;
  const prisma = getPrismaClient();
  if (token && token.length >= 32) {
    const tokenHash = hashSessionToken(token);
    await prisma.analyticsSession.deleteMany({ where: { tokenHash } });
  }
  cookieStore.delete(ANALYTICS_SESSION_COOKIE_NAME);
}

export async function createAnalyticsSession(email: string) {
  const prisma = getPrismaClient();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction([
    prisma.analyticsSession.deleteMany({ where: { email } }),
    prisma.analyticsSession.create({
      data: { email, tokenHash, expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

export async function setAnalyticsSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  cookieStore.set(ANALYTICS_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}
