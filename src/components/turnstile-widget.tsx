"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

/**
 * Invisible Cloudflare Turnstile widget.
 *
 * Renders in `interaction-only` mode: nothing is shown to the user unless
 * Cloudflare actually needs an interactive challenge, so the signup form
 * stays exactly as it was for real people. The widget hands us a single-use
 * token via `onToken`, which the form sends to `/api/waitlist` and the
 * server verifies before sending an OTP email.
 *
 * No-op when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset — the component renders
 * nothing and the server (which is also a no-op without its secret) accepts
 * requests as before. That lets the feature ship dark and be switched on by
 * adding the env vars, with no code change.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      "timeout-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      size?: "normal" | "flexible" | "compact";
      retry?: "auto" | "never";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${SCRIPT_SRC.split("?")[0]}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("turnstile script failed")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileHandle = {
  /** Discard the current token and request a fresh one (tokens are single-use). */
  reset: () => void;
};

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
};

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken, onExpire }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    // Keep the latest callbacks without forcing the render effect to re-run.
    const onTokenRef = useRef(onToken);
    const onExpireRef = useRef(onExpire);
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      if (!SITE_KEY) return;
      let cancelled = false;

      void loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          if (widgetIdRef.current) return; // already rendered
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            appearance: "interaction-only",
            size: "flexible",
            retry: "auto",
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onExpireRef.current?.(),
            "error-callback": () => onExpireRef.current?.(),
            "timeout-callback": () => onExpireRef.current?.(),
          });
        })
        .catch(() => {
          // Script blocked (e.g. ad blocker / offline). Fail open on the
          // client — the server still enforces if its secret is set, and a
          // genuinely blocked user shouldn't be hard-locked out of signup.
        });

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={containerRef} className="flex justify-center" />;
  },
);

export default TurnstileWidget;
