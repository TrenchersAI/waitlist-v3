import { getPrismaClient } from "@/src/lib/prisma";

export const runtime = "nodejs";

/// One-click unsubscribe handler referenced by the survey email's
/// List-Unsubscribe header. Gmail/Yahoo POST to this with the token in
/// the URL query (RFC 8058 §3.1). Some inbox-provider clients GET the
/// same URL when the user clicks the visible "Unsubscribe" link in the
/// footer — handle both with the same logic so we never bounce a real
/// opt-out.

async function markUnsubscribed(token: string | null) {
  if (!token || token.length < 8) {
    return new Response("Invalid token.", { status: 400 });
  }
  const prisma = getPrismaClient();
  const invite = await prisma.surveyInvite.findUnique({
    where: { token },
    select: { id: true, unsubscribedAt: true },
  });
  if (!invite) {
    return new Response("Invalid token.", { status: 404 });
  }
  if (!invite.unsubscribedAt) {
    await prisma.surveyInvite.update({
      where: { id: invite.id },
      data: { unsubscribedAt: new Date() },
    });
  }
  // The List-Unsubscribe-Post one-click flow expects a 200 — no body
  // required. For the GET path the user lands on the human-readable
  // confirmation page (handled by the Next page route, not here).
  return new Response("Unsubscribed.", { status: 200 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  return markUnsubscribed(url.searchParams.get("token"));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const res = await markUnsubscribed(url.searchParams.get("token"));
  if (res.status !== 200) return res;
  // Redirect a human-initiated GET to a friendly confirmation page so the
  // browser shows something rather than a bare "Unsubscribed."
  return Response.redirect(new URL("/survey/unsubscribed", url), 302);
}
