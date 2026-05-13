/** Shared helpers for /analytics access rules (no server-only imports). */
export function getInternalAnalyticsEmailDomain() {
  return (
    process.env.INTERNAL_ANALYTICS_EMAIL_DOMAIN?.trim().toLowerCase() ??
    "trenchers.ai"
  );
}

export function isInternalAnalyticsEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const domain = getInternalAnalyticsEmailDomain();
  return normalized.endsWith(`@${domain}`);
}
