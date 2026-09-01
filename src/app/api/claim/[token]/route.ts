import { NextRequest } from "next/server";

import { getPrismaClient } from "@/src/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// First-party click attribution for the Falcon claim campaign.
///
/// WHY THIS EXISTS RATHER THAN ESP CLICK TRACKING. The alternative is letting
/// Resend rewrite every link through its redirect domain, which measures the
/// same thing at a real deliverability cost: a mail whose links all point at a
/// tracking host looks like bulk marketing to a spam filter, and the campaign
/// this was built for deliberately turned that off. A token on our OWN domain
/// costs nothing, is not a Promotions signal, and cannot be stripped by a
/// privacy proxy the way a pixel can.
///
/// WHY IT ALWAYS REDIRECTS. Attribution is a side effect, never a gate. If the
/// write fails, the token is unknown, or the database is down, the visitor
/// still lands where the mail promised. A recipient who clicks a link in a
/// gift email and gets an error page has been given a worse experience than if
/// we had measured nothing, so every failure path falls through to the
/// redirect.
///
/// FIRST CLICK ONLY. `falconClaimClickedAt` is set once and never overwritten:
/// the question is "did this mail get a response", not "how many times did the
/// link get fetched". Mail clients prefetch links, and security scanners fetch
/// every URL in every message -- counting those would inflate the number
/// without meaning anything.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const siteUrl = (
    process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai"
  ).replace(/\/$/, "");

  try {
    const { token } = await ctx.params;
    if (token && token.length >= 16) {
      const prisma = getPrismaClient();
      // `updateMany` with the null guard, not `update`: it is one statement,
      // it cannot throw on a token we do not recognise, and the guard is what
      // keeps the FIRST click rather than the latest.
      await prisma.waitlistSubscriber.updateMany({
        where: { claimClickToken: token, falconClaimClickedAt: null },
        data: { falconClaimClickedAt: new Date() },
      });
    }
  } catch {
    // Swallowed on purpose. See "WHY IT ALWAYS REDIRECTS" above.
  }

  return Response.redirect(siteUrl, 302);
}
