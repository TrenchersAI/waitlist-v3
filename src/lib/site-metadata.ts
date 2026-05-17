import type { Metadata } from "next";

export const SITE_ORIGIN = "https://trenchers.ai";

export const SITE_TITLE =
  "TrenchersAI · AI-native trading terminal for the trenches";

export const SITE_DESCRIPTION =
  "Spawn AI trading agents from chat. One terminal to discover, snipe, copy, track, and manage positions on Solana.";

/** URL-encoded because the source asset file includes spaces. */
export const SOCIAL_PREVIEW_IMAGE_PATH =
  "/AI%20Naitve%20Trading%20Terminal.png";

export const SOCIAL_PREVIEW_IMAGE_ALT =
  "TrenchersAI AI Native Trading Terminal preview";

export const SOCIAL_PREVIEW_IMAGE_WIDTH = 2048;
export const SOCIAL_PREVIEW_IMAGE_HEIGHT = 1154;
export const TRENCHERS_X_HANDLE = "@TrenchersAI";

const REFERRAL_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

export function resolveReferralPath(rawRef: string | undefined): string | null {
  if (!rawRef) return null;
  const normalizedRef = rawRef.trim().toLowerCase();
  if (!REFERRAL_CODE_PATTERN.test(normalizedRef)) return null;
  return `/${encodeURIComponent(normalizedRef)}`;
}

export function buildReferralMetadata(pathname: string): Metadata {
  return {
    alternates: {
      canonical: pathname,
    },
    openGraph: {
      url: pathname,
    },
  };
}
