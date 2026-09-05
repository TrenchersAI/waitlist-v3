import { getPrismaClient } from "@/src/lib/prisma";

export const runtime = "nodejs";

/// One-click unsubscribe handler referenced by the survey email's
/// List-Unsubscribe header. Gmail/Yahoo POST to this with the token in
/// the URL query (RFC 8058 §3.1). Some inbox-provider clients GET the
/// same URL when the user clicks the visible "Unsubscribe" link in the
/// footer — handle both with the same logic so we never bounce a real
/// opt-out.

/// Resolves a token against either campaign. The token space is shared
/// (both tables generate 24 random bytes), so we look in both rather than
/// trusting a query param that a mail client could strip.
///
/// An opt-out is treated as GLOBAL: someone clicking unsubscribe on the
/// beta invite is saying "stop emailing me", not "stop emailing me about
/// this one campaign". We suppress every campaign row for that subscriber.
/// Getting this wrong is how a sender ends up mailing people who already
/// opted out, which is the fastest route to a complaint spike.
async function markUnsubscribed(token: string | null) {
  if (!token || token.length < 8) {
    return new Response("Invalid token.", { status: 400 });
  }
  const prisma = getPrismaClient();
  const now = new Date();

  // THREE token sources, and the third is not redundant. Opt-out tokens used
  // to live only on the two invite tables, so a subscriber holding neither --
  // 1,801 of them at the time of writing -- had an unsubscribe link that
  // resolved to a 404. Whole-list sends reach exactly those people, and a
  // recipient who wants out and cannot get out reports spam instead. Mailbox
  // providers weigh a complaint far more heavily than an unsubscribe, so that
  // 404 was a direct route to damaging a domain that also carries OTP login
  // mail. `WaitlistSubscriber.unsubscribeToken` closes it.
  const [surveyRow, betaRow, subRow, campaignRow] = await Promise.all([
    prisma.surveyInvite.findUnique({
      where: { token },
      select: { subscriberId: true },
    }),
    prisma.betaInvite.findUnique({
      where: { token },
      select: { subscriberId: true },
    }),
    prisma.waitlistSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true },
    }),
    // A FOURTH source, and not a redundant one: a campaign sent to an audience
    // that is not the waitlist has recipients with no subscriber row at all.
    // 37 of the 109 Founding Falcons signed up to the product directly and
    // never joined the list, so without this their unsubscribe link 404s and
    // the only way out is a spam complaint.
    prisma.campaignSend.findFirst({
      where: { token },
      select: { id: true, email: true },
    }),
  ]);

  // A campaign-only recipient is opted out on their campaign rows and, if they
  // also happen to be on the list, on the subscriber row too -- an opt-out is
  // GLOBAL, so it must stop every future send regardless of which audience
  // produced this particular link.
  if (campaignRow) {
    const email = campaignRow.email;
    await Promise.all([
      prisma.campaignSend.updateMany({
        where: { email, unsubscribedAt: null },
        data: { unsubscribedAt: now },
      }),
      prisma.waitlistSubscriber.updateMany({
        where: { email, unsubscribedAt: null },
        data: { unsubscribedAt: now },
      }),
    ]);
    return new Response("Unsubscribed.", { status: 200 });
  }

  const subscriberId =
    surveyRow?.subscriberId ?? betaRow?.subscriberId ?? subRow?.id;
  if (!subscriberId) {
    return new Response("Invalid token.", { status: 404 });
  }

  // The subscriber row is stamped too, not just the invites. It is the only
  // record that exists for every recipient, so it is the only one a
  // whole-list send can filter on.
  await Promise.all([
    prisma.surveyInvite.updateMany({
      where: { subscriberId, unsubscribedAt: null },
      data: { unsubscribedAt: now },
    }),
    prisma.betaInvite.updateMany({
      where: { subscriberId, unsubscribedAt: null },
      data: { unsubscribedAt: now },
    }),
    prisma.waitlistSubscriber.updateMany({
      where: { id: subscriberId, unsubscribedAt: null },
      data: { unsubscribedAt: now },
    }),
  ]);

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
