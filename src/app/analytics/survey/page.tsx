import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";

import SurveyAnalyticsView from "./survey-analytics-view";

export const metadata: Metadata = {
  title: "Survey analytics · Trenchers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SurveyAnalyticsPage() {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    // Bounce to the main /analytics page which handles the OTP login.
    // Once signed in there, the session cookie covers this page too.
    redirect("/analytics");
  }
  return <SurveyAnalyticsView viewerEmail={session.email} />;
}
