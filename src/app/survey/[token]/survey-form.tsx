"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

import SiteNav from "@/src/components/site-nav";
import { Skeleton } from "@/src/components/ui/skeleton";
import { setVerifiedSession } from "@/src/lib/waitlist-session-client";
import {
  FREEFORM_MAX_CHARS,
  HANDLE_MAX_CHARS,
  TOOLS_OTHER_MAX_CHARS,
  TOOL_OPTIONS,
  VOLUME_OPTIONS,
  WANT_OPTIONS,
  type QuestionKey,
  type ToolOption,
  type VolumeBucket,
  type WantOption,
} from "@/src/lib/survey";

type GetResponse = {
  email: string | null;
  campaign: string;
  completed: boolean;
  answers: Record<string, unknown>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_HIDE_MS = 1400;

// Reusable token strings. Centralizing these keeps the visual rhythm
// consistent across the page — every card, input, and chip pulls from
// the same palette of borders, shadows, and focus rings.
const CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.04] backdrop-blur-md";
const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-[14px] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15";
const TEXTAREA_CLASS =
  "min-h-[160px] w-full rounded-lg border border-white/12 bg-black/35 p-3.5 text-[14px] leading-[1.6] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15";

export default function SurveyForm({
  token,
  email,
  campaign,
  initialCompleted = false,
}: {
  token: string;
  email: string;
  campaign: string;
  /** SSR'd from page.tsx so a re-visit by a submitted user renders the
     Thanks screen on first paint instead of flashing the empty shell. */
  initialCompleted?: boolean;
}) {
  const apiUrl = `/api/survey/${token}`;
  const prefersReducedMotion = useReducedMotion();

  const [hydrated, setHydrated] = useState(initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [tools, setTools] = useState<ToolOption[]>([]);
  const [toolsOther, setToolsOther] = useState("");
  const [volume, setVolume] = useState<VolumeBucket | "">("");
  const [wants, setWants] = useState<WantOption[]>([]);
  const [freeform, setFreeform] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [country, setCountry] = useState("");

  // A valid survey token can only exist for a verified subscriber, so the
  // user landing here is *by definition* already on the waitlist. Mirror
  // that into the homepage's verified session so when they navigate back
  // to / they see the "You're in the trenches" dashboard instead of the
  // marketing pre-signup hero — common when they followed the email link
  // directly without ever going through the homepage OTP flow on this
  // device.
  useEffect(() => {
    if (email) setVerifiedSession(email);
  }, [email]);

  // --- hydrate from server ------------------------------------------------

  useEffect(() => {
    // Already submitted — page.tsx told us so. No need to hit the API,
    // and skipping it avoids a spurious clickedAt update on what is
    // effectively a confirmation-page re-visit.
    if (initialCompleted) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setHydrated(true);
          return;
        }
        const data = (await res.json()) as GetResponse;
        if (cancelled) return;
        const a = data.answers ?? {};
        if (Array.isArray(a.tools)) setTools(a.tools as ToolOption[]);
        if (typeof a.toolsOther === "string") setToolsOther(a.toolsOther);
        if (typeof a.volume === "string") setVolume(a.volume as VolumeBucket);
        if (Array.isArray(a.wants)) setWants(a.wants as WantOption[]);
        if (typeof a.freeform === "string") setFreeform(a.freeform);
        if (typeof a.twitter === "string") setTwitter(a.twitter);
        if (typeof a.telegram === "string") setTelegram(a.telegram);
        if (typeof a.country === "string") setCountry(a.country);
        setCompleted(data.completed);
        setHydrated(true);
      } catch {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, initialCompleted]);

  // --- saving -------------------------------------------------------------

  const saveTimeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef<Set<QuestionKey>>(new Set());
  const pendingRef = useRef<Map<QuestionKey, unknown>>(new Map());

  const flushPending = useCallback(async () => {
    const pending = pendingRef.current;
    if (pending.size === 0) return;
    const entries = Array.from(pending.entries());
    pending.clear();

    setSaveState("saving");
    let anyError = false;
    await Promise.all(
      entries.map(async ([key, value]) => {
        inFlightRef.current.add(key);
        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionKey: key, value }),
          });
          if (!res.ok) anyError = true;
        } catch {
          anyError = true;
        } finally {
          inFlightRef.current.delete(key);
        }
      }),
    );
    if (anyError) {
      setSaveState("error");
    } else {
      setSaveState("saved");
      window.setTimeout(() => {
        setSaveState((s) => (s === "saved" ? "idle" : s));
      }, SAVED_HIDE_MS);
    }
  }, [apiUrl]);

  const scheduleSave = useCallback(
    (key: QuestionKey, value: unknown, debounceMs: number) => {
      if (completed) return;
      pendingRef.current.set(key, value);
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveTimeoutRef.current = null;
        void flushPending();
      }, debounceMs);
    },
    [completed, flushPending],
  );

  const saveNow = useCallback(
    (key: QuestionKey, value: unknown) => {
      if (completed) return;
      pendingRef.current.set(key, value);
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      void flushPending();
    },
    [completed, flushPending],
  );

  // Send anything pending if the user tries to close the tab. The Fetch
  // is "keepalive" so the browser will let it finish after unload.
  useEffect(() => {
    const handler = () => {
      if (pendingRef.current.size === 0) return;
      const entries = Array.from(pendingRef.current.entries());
      pendingRef.current.clear();
      for (const [key, value] of entries) {
        try {
          fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionKey: key, value }),
            keepalive: true,
          });
        } catch {
          // best-effort
        }
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [apiUrl]);

  // --- handlers -----------------------------------------------------------

  const toggleTool = useCallback(
    (t: ToolOption) => {
      setTools((cur) => {
        const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
        saveNow("tools", next);
        return next;
      });
    },
    [saveNow],
  );

  const toggleWant = useCallback(
    (w: WantOption) => {
      setWants((cur) => {
        const next = cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w];
        saveNow("wants", next);
        return next;
      });
    },
    [saveNow],
  );

  const pickVolume = useCallback(
    (v: VolumeBucket) => {
      setVolume(v);
      saveNow("volume", v);
    },
    [saveNow],
  );

  const onSubmit = useCallback(async () => {
    if (submitting || completed) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      await flushPending();

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        setSubmitError(data?.message ?? "Could not submit.");
        return;
      }
      setCompleted(true);
    } finally {
      setSubmitting(false);
    }
  }, [apiUrl, completed, flushPending, submitting]);

  const headerSubtitle = useMemo(
    () =>
      campaign === "trader-research-v1"
        ? "Five quick questions about how you trade, what you use, and what hurts."
        : "Quick research questions from the Trenchers team.",
    [campaign],
  );

  // --- views --------------------------------------------------------------

  if (completed) {
    return (
      <div className="site-canvas-bg relative flex min-h-dvh flex-col overflow-x-clip">
        <BackdropGlow />
        <SiteNav />
        <main className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-24 sm:px-6">
          <div className={`${CARD_CLASS} w-full max-w-xl p-8 sm:p-10`}>
            <div className="mb-5 inline-flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white">
              <CheckCircle2 className="size-6" aria-hidden />
            </div>
            <h1 className="text-balance text-2xl font-medium leading-[1.2] tracking-tight text-white sm:text-3xl">
              Thanks. You&apos;re on the priority list.
            </h1>
            <p className="mt-3 text-pretty text-[15px] leading-[1.65] text-white/65">
              It will help us know you better.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="site-canvas-bg relative flex min-h-dvh flex-col overflow-x-clip">
      <BackdropGlow />
      <SiteNav />
      <main className="relative flex-1 px-5 pb-24 pt-24 sm:px-6 sm:pt-28 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
          {/* HERO */}
          <header className="relative isolate flex flex-col gap-3">
            {/* Indigo wash behind the headline — same recipe as the
               analytics hero metric card, bleeding out past the text to
               either side. Sits at -z-10 so it never intercepts clicks. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-16 -top-20 bottom-0 -z-10 overflow-hidden"
            >
              <div className="absolute left-1/2 top-[42%] h-[340px] w-[min(820px,120%)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.28),transparent_72%)] blur-2xl" />
            </div>
            <h1 className="text-balance text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-[2.5rem]">
              Tell us about your trenches.
            </h1>
            <p className="max-w-[52ch] text-pretty text-[15px] leading-[1.65] text-white/65">
              {headerSubtitle}
              {" "}
              The more we know about you, the sharper Trencher gets when you
              pick it up, and the higher you move on the priority list for
              early access.
            </p>
            <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/55">
              <span aria-hidden className="size-1.5 rounded-full bg-white/70" />
              Replying as{" "}
              <span className="font-mono text-white/80">{email}</span>
            </div>
          </header>

          {!hydrated ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {/* CONTACT BLOCK */}
              <SectionCard
                eyebrow="About you"
                title="A few details"
                description="Optional. Helps us reach out for early-access drops."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <HandleInput
                    label="X / Twitter"
                    prefix="@"
                    value={twitter}
                    onChange={(v) => {
                      setTwitter(v);
                      scheduleSave("twitter", v, 600);
                    }}
                    placeholder="handle"
                  />
                  <HandleInput
                    label="Telegram"
                    prefix="@"
                    value={telegram}
                    onChange={(v) => {
                      setTelegram(v);
                      scheduleSave("telegram", v, 600);
                    }}
                    placeholder="handle"
                  />
                  <HandleInput
                    label="Country"
                    value={country}
                    onChange={(v) => {
                      setCountry(v);
                      scheduleSave("country", v, 600);
                    }}
                    placeholder="e.g. Switzerland"
                  />
                </div>
              </SectionCard>

              {/* Q1 */}
              <SectionCard
                eyebrow="Question 1 of 4"
                title="Which tools do you currently use?"
                description="Select all that apply."
                badge={tools.length > 0 ? `${tools.length} selected` : null}
              >
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {TOOL_OPTIONS.map((opt) => (
                    <CheckboxChip
                      key={opt.key}
                      checked={tools.includes(opt.key)}
                      onChange={() => toggleTool(opt.key)}
                      label={opt.label}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <label className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-white/50 uppercase">
                    Other
                  </label>
                  <input
                    type="text"
                    value={toolsOther}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, TOOLS_OTHER_MAX_CHARS);
                      setToolsOther(v);
                      scheduleSave("toolsOther", v, 600);
                    }}
                    placeholder="Anything we missed"
                    className={INPUT_CLASS}
                  />
                </div>
              </SectionCard>

              {/* Q2 */}
              <SectionCard
                eyebrow="Question 2 of 4"
                title="Approximate monthly trading volume?"
                description="Pick one."
                badge={volume ? "answered" : null}
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {VOLUME_OPTIONS.map((opt) => (
                    <RadioRow
                      key={opt.key}
                      name="volume"
                      checked={volume === opt.key}
                      onChange={() => pickVolume(opt.key)}
                      label={opt.label}
                    />
                  ))}
                </div>
              </SectionCard>

              {/* Q3 */}
              <SectionCard
                eyebrow="Question 3 of 4"
                title="What would you want an AI trading agent to help you with most?"
                description="Select all that apply."
                badge={wants.length > 0 ? `${wants.length} selected` : null}
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {WANT_OPTIONS.map((opt) => (
                    <CheckboxChip
                      key={opt.key}
                      checked={wants.includes(opt.key)}
                      onChange={() => toggleWant(opt.key)}
                      label={opt.label}
                    />
                  ))}
                </div>
              </SectionCard>

              {/* Q4 */}
              <SectionCard
                eyebrow="Question 4 of 4"
                title="What would make your life easier, faster, or safer?"
                description="What you trade, tools you use, biggest pains, what an AI agent should handle. Long-form is welcome."
                badge={
                  freeform.length > 0 ? `${freeform.length} chars` : null
                }
              >
                <textarea
                  value={freeform}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, FREEFORM_MAX_CHARS);
                    setFreeform(v);
                    scheduleSave("freeform", v, 800);
                  }}
                  rows={6}
                  placeholder="Tell us what you actually need…"
                  className={TEXTAREA_CLASS}
                />
                <p className="mt-1.5 text-right text-[11px] tabular-nums text-white/40">
                  {freeform.length.toLocaleString()} /{" "}
                  {FREEFORM_MAX_CHARS.toLocaleString()}
                </p>
              </SectionCard>

              {/* SUBMIT BAR */}
              <div className={`${CARD_CLASS} p-5 sm:p-6`}>
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <SaveIndicator state={saveState} />
                    <p className="text-[11px] leading-snug text-white/40">
                      Your answers save automatically. Submit when you&apos;re done.
                    </p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    {submitError ? (
                      <span className="text-[12px] text-amber-300/85">
                        {submitError}
                      </span>
                    ) : null}
                    <BorderBeam
                      size="line"
                      theme="dark"
                      colorVariant="ocean"
                      duration={2.4}
                      strength={0.62}
                      borderRadius={9999}
                      active={!prefersReducedMotion && !submitting}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      <button
                        type="button"
                        onClick={() => void onSubmit()}
                        disabled={submitting}
                        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 bg-black px-7 text-[14px] font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                      >
                        {submitting ? "Submitting…" : "Submit & get priority"}
                      </button>
                    </BorderBeam>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] leading-relaxed text-white/35">
                Your answers are tied to your waitlist email. We only use them
                to prioritize Trencher access and shape the product.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// =========================================================================
// LAYOUT PRIMITIVES
// =========================================================================

/** Top-of-page indigo wash. Mirrors the analytics dashboard hero — keeps the
   survey visually tied to the rest of the site without re-using the
   FinalCtaSection / SiteFooter that the marketing layout normally injects. */
function BackdropGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px] overflow-hidden"
    >
      <div className="absolute left-1/2 top-0 h-[460px] w-[min(900px,110vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.22),transparent_72%)] blur-2xl" />
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD_CLASS} p-6 sm:p-7`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold tracking-[0.22em] text-white/45 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-[17px] font-medium leading-[1.3] tracking-tight text-white sm:text-[18px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-[60ch] text-pretty text-[13.5px] leading-[1.55] text-white/55">
              {description}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-white/70"
            />
            {badge}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function HandleInput({
  label,
  prefix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  prefix?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-white/50 uppercase">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-lg border border-white/12 bg-black/35 px-3 transition-[box-shadow,border-color] focus-within:border-white/35 focus-within:ring-2 focus-within:ring-white/15">
        {prefix ? (
          <span className="mr-1 text-[14px] text-white/40">{prefix}</span>
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, HANDLE_MAX_CHARS))}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  );
}

function CheckboxChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={
        "group flex h-11 items-center gap-2.5 rounded-lg border px-3 text-left text-[14px] transition-[background-color,border-color,transform] active:scale-[0.99] " +
        (checked
          ? "border-white/35 bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          : "border-white/10 bg-black/25 text-white/75 hover:border-white/22 hover:bg-white/[0.05]")
      }
    >
      <span
        aria-hidden
        className={
          "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors " +
          (checked
            ? "border-white bg-white text-zinc-950"
            : "border-white/30 bg-transparent group-hover:border-white/55")
        }
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="size-3" fill="none">
            <path
              d="M2.5 6.5l2.5 2.5 4.5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function RadioRow({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      data-name={name}
      className={
        "group flex h-11 items-center gap-3 rounded-lg border px-3 text-left text-[14px] transition-[background-color,border-color,transform] active:scale-[0.99] " +
        (checked
          ? "border-white/35 bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          : "border-white/10 bg-black/25 text-white/75 hover:border-white/22 hover:bg-white/[0.05]")
      }
    >
      <span
        aria-hidden
        className={
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors " +
          (checked
            ? "border-white"
            : "border-white/30 group-hover:border-white/55")
        }
      >
        {checked ? (
          <span className="size-2 rounded-full bg-white" />
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const dotClass =
    state === "idle"
      ? "bg-white/25"
      : state === "saving"
        ? "bg-white/55 animate-pulse"
        : state === "saved"
          ? "bg-white/85"
          : "bg-amber-300";
  const text =
    state === "idle"
      ? "Autosaved"
      : state === "saving"
        ? "Saving…"
        : state === "saved"
          ? "Saved"
          : "Save failed. Try again";
  const tone =
    state === "saved"
      ? "text-white/80"
      : state === "error"
        ? "text-amber-300/85"
        : "text-white/55";
  return (
    <span className={`inline-flex items-center gap-2 text-[12px] ${tone}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dotClass}`} />
      {text}
    </span>
  );
}
