import Hero from "../components/hero";
import NFTList from "../components/tokens";
import TokenList from "../components/tokens";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col items-center justify-center font-sans">
      <Hero />
      {/* <TokenList /> */}
    </div>
  );
}
