import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "../components/site-footer";
import FinalCtaSection from "../components/final-cta-section";
import {
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  SITE_TITLE,
  SOCIAL_PREVIEW_IMAGE_ALT,
  SOCIAL_PREVIEW_IMAGE_HEIGHT,
  SOCIAL_PREVIEW_IMAGE_PATH,
  SOCIAL_PREVIEW_IMAGE_WIDTH,
  TRENCHERS_X_HANDLE,
} from "@/src/lib/site-metadata";
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
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: "%s · TrenchersAI",
  },
  description: SITE_DESCRIPTION,
  applicationName: "TrenchersAI",
  alternates: {
    canonical: "/",
  },
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    images: [
      {
        url: SOCIAL_PREVIEW_IMAGE_PATH,
        width: SOCIAL_PREVIEW_IMAGE_WIDTH,
        height: SOCIAL_PREVIEW_IMAGE_HEIGHT,
        alt: SOCIAL_PREVIEW_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: TRENCHERS_X_HANDLE,
    creator: TRENCHERS_X_HANDLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SOCIAL_PREVIEW_IMAGE_PATH,
        alt: SOCIAL_PREVIEW_IMAGE_ALT,
      },
    ],
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
