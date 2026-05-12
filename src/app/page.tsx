import { cookies } from "next/headers";
import Hero from "../components/hero";
import TrenchersFeaturesGrid from "../components/trenchers-features-grid";
import { VERIFIED_COOKIE_NAME } from "../lib/waitlist-session-client";

export default async function Home() {
  /** Server-side mirror of the verified-session flag. The actual referral
     data still comes from localStorage post-hydration; this cookie just
     lets us SSR the right shell so returning users don't see the
     unverified flash on refresh. See `setVerifiedSession` for the writer
     and Hero's `initialVerified` prop for the consumer. */
  const cookieStore = await cookies();
  const initialVerified =
    cookieStore.get(VERIFIED_COOKIE_NAME)?.value === "1";

  return (
    <div className="relative w-full min-w-0 font-sans">
      <Hero initialVerified={initialVerified} />
      <TrenchersFeaturesGrid />
    </div>
  );
}
