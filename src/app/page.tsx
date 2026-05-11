import Hero from "../components/hero";
import TrenchersFeaturesGrid from "../components/trenchers-features-grid";
import WhyTrenchersAI from "../components/why-trenchersai";

export default function Home() {
  return (
    <div className="relative w-full font-sans">
      <Hero />
      <WhyTrenchersAI />
      <TrenchersFeaturesGrid />
    </div>
  );
}
