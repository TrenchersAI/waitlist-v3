import type { Metadata, ResolvingMetadata } from "next";
import Hero from "../components/hero";
import TrenchersFeaturesGrid from "../components/trenchers-features-grid";
import {
  buildReferralMetadata,
  resolveReferralPath,
} from "@/src/lib/site-metadata";

type HomePageProps = {
  searchParams: Promise<{ ref?: string | string[] }>;
};

export async function generateMetadata({
  searchParams,
}: HomePageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await searchParams;
  const rawRefParam = params.ref;
  const rawRef = Array.isArray(rawRefParam) ? rawRefParam[0] : rawRefParam;
  const referralPath = resolveReferralPath(rawRef);

  if (!referralPath) return {};
  const parentMetadata = await parent;

  return {
    ...buildReferralMetadata(referralPath),
    openGraph: {
      ...parentMetadata.openGraph,
      url: referralPath,
    },
  };
}

export default function Home() {
  return (
    <div className="relative w-full min-w-0 font-sans">
      <Hero />
      <TrenchersFeaturesGrid />
    </div>
  );
}
