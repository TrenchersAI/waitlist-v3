import { NextResponse, type NextRequest } from "next/server";
import { resolveReferralPath } from "@/src/lib/site-metadata";

/** Paths that must never be treated as referral codes. Both real Next.js
   routes and well-known assets/endpoints. Keep this in sync as the app grows. */
const RESERVED_SEGMENTS = new Set([
  "",
  "api",
  "analytics",
  "about-us",
  "privacy",
  "terms",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const segment = pathname.slice(1).split("/")[0];

  if (RESERVED_SEGMENTS.has(segment)) return NextResponse.next();
  const referralPath = resolveReferralPath(segment);
  if (!referralPath) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("ref", referralPath.slice(1));
  return NextResponse.rewrite(url);
}

export const config = {
  /** Skip Next internals, API routes, and any path with a file extension
     (images, fonts, etc.) so the proxy only inspects "page-shaped" URLs. */
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
