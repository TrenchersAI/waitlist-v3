import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "../components/site-footer";
import FinalCtaSection from "../components/final-cta-section";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trenchers.ai"),
  title: {
    default: "TrenchersAI · AI-native trading terminal for the trenches",
    template: "%s · TrenchersAI",
  },
  description:
    "Spawn AI trading agents from chat. One terminal to discover, snipe, copy, track, and manage positions on Solana.",
  applicationName: "TrenchersAI",
  keywords: [
    "Solana",
    "trading terminal",
    "AI agents",
    "sniper bot",
    "copy trading",
    "memecoin",
  ],
  openGraph: {
    type: "website",
    siteName: "TrenchersAI",
    title: "TrenchersAI · AI-native trading terminal for the trenches",
    description:
      "Spawn AI trading agents from chat. One terminal to discover, snipe, copy, track, and manage positions on Solana.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrenchersAI · AI-native trading terminal for the trenches",
    description:
      "Spawn AI trading agents from chat. One terminal to discover, snipe, copy, track, and manage positions on Solana.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-dvh min-w-0 flex-col">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        <FinalCtaSection />
        <SiteFooter />
      </body>
    </html>
  );
}
