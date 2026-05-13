import type { Metadata } from "next";

import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";

import AnalyticsDashboard from "./analytics-dashboard";

export const metadata: Metadata = {
  title: "Waitlist analytics",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  const session = await getAnalyticsSessionFromCookies();
  return (
    <AnalyticsDashboard
      key={session?.email ? `auth:${session.email}` : "guest"}
      initialEmail={session?.email ?? null}
    />
  );
}
