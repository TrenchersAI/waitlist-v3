import type { Metadata } from "next";

import SurveyEntry from "./survey-entry";

export const metadata: Metadata = {
  title: "Trenchers · Trader research",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/// Public landing for the survey. Users with a token in their inbox open
/// /survey/<token> directly; this page handles the case where a verified
/// subscriber wants to fill the survey without finding the email — they
/// enter their address, we look them up and route them to the form (or
/// fall back to OTP verification if they're not verified yet).
export default function SurveyEntryPage() {
  return <SurveyEntry />;
}
