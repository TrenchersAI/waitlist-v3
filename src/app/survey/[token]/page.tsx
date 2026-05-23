import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPrismaClient } from "@/src/lib/prisma";

import SurveyForm from "./survey-form";

export const metadata: Metadata = {
  title: "Trenchers · Trader research",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  // We hit the DB here so the page can SSR the user's email and the
  // completion state without a client-side fetch round-trip. The /api
  // route still owns the "create-response-on-first-visit" + clickedAt
  // bookkeeping — it gets called by the client in a useEffect to keep
  // SSR free of side-effects (avoids double-running under React strict
  // mode or prefetch). Reading `completedAt` here means a re-visit by a
  // submitted user renders the Thanks screen on first paint instead of
  // flashing the empty survey shell.
  const prisma = getPrismaClient();
  const invite = await prisma.surveyInvite.findUnique({
    where: { token },
    select: {
      campaign: true,
      subscriber: { select: { email: true } },
      response: { select: { completedAt: true } },
    },
  });
  if (!invite) notFound();

  return (
    <SurveyForm
      token={token}
      email={invite.subscriber.email}
      campaign={invite.campaign}
      initialCompleted={Boolean(invite.response?.completedAt)}
    />
  );
}
