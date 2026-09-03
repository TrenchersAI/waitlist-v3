import type { Metadata } from "next";

import { UnsubscribeConfirm } from "./unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/// Confirmation page for the unsubscribe LINK.
///
/// The link used to unsubscribe on GET, which meant scanners and previewers
/// could opt someone out without them deciding anything. The mutation now
/// happens only on POST, and this page is what asks.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold text-white">
        Unsubscribe from Trenchers emails?
      </h1>
      <div className="mt-4">
        {token ? (
          <UnsubscribeConfirm token={token} />
        ) : (
          <p className="text-sm leading-relaxed text-white/60">
            This link is missing its token, so we cannot tell which address to
            unsubscribe. Please use the link from the email itself.
          </p>
        )}
      </div>
    </main>
  );
}
