import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

export const metadata: Metadata = {
  title: "Trenchers · Unsubscribed",
  robots: { index: false, follow: false },
};

export default function UnsubscribedPage() {
  return (
    <div className="site-canvas-bg flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-white/10 bg-black/55 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl text-white">
            You&apos;re unsubscribed
          </CardTitle>
          <CardDescription className="text-white/65">
            We won&apos;t email you about Trencher research again. Your spot on
            the waitlist itself is unaffected: you&apos;ll still get launch
            access when we drop it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm text-white/85 hover:bg-white/10"
          >
            Return to trenchers.ai
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
