"use client";

import { useState } from "react";

/// The confirmation step between an unsubscribe LINK and an unsubscribe.
///
/// It exists because the link is fetched by machines. Mail security scanners
/// pull every URL in a message before it reaches the inbox, link previewers
/// pull them again, and corporate proxies a third time. When the GET itself
/// unsubscribed, any one of those silently opted someone out of every future
/// mail, with nothing to distinguish it from a real decision.
///
/// The one-click path in Gmail is untouched: RFC 8058 requires
/// `List-Unsubscribe-Post`, providers send a POST, and that still takes effect
/// immediately without this page.
export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("working");
    setError(null);
    try {
      const res = await fetch(
        `/api/survey/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(await res.text());
      setState("done");
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm leading-relaxed text-white/60">
        You have been unsubscribed. You will not receive further emails from us.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-white/60">
        This stops <strong className="text-white/80">all</strong> email from
        Trenchers, not just this one. Your account and any rewards you hold are
        unaffected.
      </p>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={state === "working" || !token}
        className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-40"
      >
        {state === "working" ? "Unsubscribing…" : "Unsubscribe me"}
      </button>
    </div>
  );
}
