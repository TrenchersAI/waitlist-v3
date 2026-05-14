"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import {
  AnalyticsSidebar,
  MobileBottomNav,
  type AnalyticsSection,
} from "@/src/app/analytics/analytics-sidebar";
import { AnalyticsTimeseriesChart } from "@/src/app/analytics/analytics-timeseries-chart";
import {
  ReferrersStrip,
  type ReferralsPayload,
} from "@/src/app/analytics/analytics-referrals-view";
import {
  type DateRange,
  type HotkeyAction,
  type HotkeyState,
  type RangeKey,
  newHotkeyState,
  parseHotkey,
  priorRange,
  rangeForKey,
  rangeLabel,
} from "@/src/app/analytics/hotkeys";
import logoMark from "@/src/components/icons/logo-mark.svg";
import { Badge } from "@/src/components/ui/badge";
import { Button, buttonVariants } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import SiteNav from "@/src/components/site-nav";
import { getInternalAnalyticsEmailDomain } from "@/src/lib/analytics-email-domain";

type StatsPayload = {
  viewerEmail: string;
  range: { from: string; to: string };
  allTime: {
    totalSubscribers: number;
    verifiedSubscribers: number;
    pendingVerification: number;
  };
  rangeTotals: {
    signupsStarted: number;
    signupsVerified: number;
  };
  series: {
    signupsByDay: { date: string; count: number }[];
    verificationsByDay: { date: string; count: number }[];
    /** Present only when the requested range is a single UTC day. Each
       array has 24 entries keyed `YYYY-MM-DDTHH`. */
    signupsByHour?: { date: string; count: number }[];
    verificationsByHour?: { date: string; count: number }[];
  };
};

type SignupRow = {
  id: string;
  email: string;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  referralsMade: number;
  referralCode: string;
};

type SignupsPayload = {
  items: SignupRow[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
};

/** A SignupRow annotated with its chronological position in the full list
   (latest user = highest rank). Computed client-side after the fetch. */
type RankedSignupRow = SignupRow & { signupRank: number };

type RankedSignupsPayload = Omit<SignupsPayload, "items"> & {
  items: RankedSignupRow[];
};

type StatusFilter = "all" | "verified" | "pending";
type SortKey = "createdAt" | "verifiedAt" | "email" | "referralsMade";
type SortDir = "asc" | "desc";

function formatDateTimeUtc(iso: string) {
  const d = new Date(iso);
  // Locale is pinned to en-US so SSR and CSR render identical text — relying
  // on the runtime default produced hydration mismatches.
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Drop leading days where both primary and secondary buckets are empty so
   the "All-time" chart starts at the first signup rather than the hardcoded
   2020-01-01 anchor. Walks both arrays together to keep them aligned. */
/** When the hourly window covers today, drop bucket entries for hours that
   haven't happened yet — otherwise the chart wastes pixels on a flat tail of
   future zeros. Returns the array untouched when the day isn't today. */
function trimHourlyToNow<T>(arr: T[], isToday: boolean): T[] {
  if (!isToday) return arr;
  const cutoff = new Date().getUTCHours() + 1;
  return arr.slice(0, Math.min(arr.length, cutoff));
}

function trimLeadingEmpty<T extends { count: number }>(
  primary: T[],
  secondary?: T[],
): { primary: T[]; secondary: T[] } {
  const sec = secondary ?? [];
  const len = primary.length;
  let cut = 0;
  while (
    cut < len &&
    primary[cut].count === 0 &&
    (sec[cut]?.count ?? 0) === 0
  ) {
    cut++;
  }
  return { primary: primary.slice(cut), secondary: sec.slice(cut) };
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** Compact `Mon DD, YYYY` for the Users table — keeps the column narrow but
   keeps the year so old signups don't look like recent ones. */
function formatJoinedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function emailInitial(email: string): string {
  const ch = email.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

function pct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export default function AnalyticsDashboard({
  initialEmail,
}: {
  initialEmail: string | null;
}) {
  const router = useRouter();
  const domain = useMemo(() => getInternalAnalyticsEmailDomain(), []);

  // Auth state.
  const [sessionEmail, setSessionEmail] = useState(initialEmail);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard data + filters.
  const [rangeKey, setRangeKey] = useState<RangeKey>("last7");
  const [appliedRange, setAppliedRange] = useState<DateRange>(() =>
    rangeForKey("last7"),
  );

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [priorStats, setPriorStats] = useState<StatsPayload | null>(null);
  const [referrals, setReferrals] = useState<ReferralsPayload | null>(null);
  const [signups, setSignups] = useState<SignupsPayload | null>(null);

  const [signupsPage, setSignupsPage] = useState(0);
  const [signupsStatus, setSignupsStatus] = useState<StatusFilter>("all");
  const [signupsSearch, setSignupsSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "createdAt",
    dir: "desc",
  });

  // UI affordances.
  const [toast, setToast] = useState<{ id: number; label: string } | null>(
    null,
  );
  const [section, setSection] = useState<AnalyticsSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const hotkeyStateRef = useRef<HotkeyState>(newHotkeyState());

  const isSignedIn = Boolean(sessionEmail);

  // --- data fetching -----------------------------------------------------

  const fetchAll = useCallback(
    async (range: DateRange, key: RangeKey) => {
      const baseParams = (r: DateRange) => {
        const p = new URLSearchParams();
        p.set("from", r.from);
        p.set("to", r.to);
        return p;
      };

      const statsParams = baseParams(range);
      const referralsParams = baseParams(range);
      referralsParams.set("limit", "20");

      // Users section shows the complete directory, not just rows in the
      // currently-selected window — the range picker is hidden there for the
      // same reason. Always fetch signups with an all-time window.
      const signupsRange = rangeForKey("all");
      const signupsParams = baseParams(signupsRange);
      signupsParams.set("status", signupsStatus);
      signupsParams.set("page", String(signupsPage));
      signupsParams.set("limit", "50");

      const priorR = priorRange(range, key);
      const priorParams = priorR ? baseParams(priorR) : null;

      const safeFetch = async <T,>(
        url: string,
      ): Promise<{ status: number; data: T | null }> => {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (res.status === 401) return { status: 401, data: null };
          if (!res.ok) return { status: res.status, data: null };
          return { status: res.status, data: (await res.json()) as T };
        } catch {
          return { status: 0, data: null };
        }
      };

      const [s, sg, ref, pr] = await Promise.all([
        safeFetch<StatsPayload>(`/api/analytics/stats?${statsParams}`),
        safeFetch<SignupsPayload>(`/api/analytics/signups?${signupsParams}`),
        safeFetch<ReferralsPayload>(
          `/api/analytics/referrals?${referralsParams}`,
        ),
        priorParams
          ? safeFetch<StatsPayload>(`/api/analytics/stats?${priorParams}`)
          : Promise.resolve({ status: 0, data: null }),
      ]);

      if (s.status === 401 || sg.status === 401) {
        setSessionEmail(null);
        setStats(null);
        setSignups(null);
        setReferrals(null);
        setPriorStats(null);
        setPhase("email");
        return;
      }

      if (s.data) setStats(s.data);
      if (sg.data) setSignups(sg.data);
      if (ref.data) setReferrals(ref.data);
      setPriorStats(pr.data);
    },
    [signupsStatus, signupsPage],
  );

  useEffect(() => {
    if (!isSignedIn) return;
    void fetchAll(appliedRange, rangeKey);
  }, [isSignedIn, appliedRange, rangeKey, fetchAll]);

  // --- toast auto-clear --------------------------------------------------

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev));
    }, 1700);
    return () => clearTimeout(t);
  }, [toast]);

  const flashToast = useCallback((label: string) => {
    setToast({ id: Date.now() + Math.random(), label });
  }, []);

  // --- hotkey dispatch ---------------------------------------------------

  const csvExportHref = useMemo(() => {
    // Users page is all-time; the export matches what's on screen.
    const r = rangeForKey("all");
    const p = new URLSearchParams();
    p.set("from", r.from);
    p.set("to", r.to);
    p.set("status", signupsStatus);
    return `/api/analytics/export?${p.toString()}`;
  }, [signupsStatus]);

  const applyRange = useCallback((key: RangeKey) => {
    setRangeKey(key);
    setAppliedRange(rangeForKey(key));
    setSignupsPage(0);
    // Drop the previous-window data so each card paints its skeleton until the
    // new fetch returns. Without this, the hero shows the OLD signup count for
    // a frame after the tab change, which reads as a misleading flash.
    setStats(null);
    setPriorStats(null);
    setReferrals(null);
    setSignups(null);
  }, []);

  const dispatchAction = useCallback(
    (action: HotkeyAction) => {
      flashToast(action.label);
      switch (action.kind) {
        case "range":
          applyRange(action.key);
          break;
        case "nav":
          // Map the four hotkey targets onto the three sidebar sections.
          // "overview" / "trends" → Dashboard; "referrals" → Referrals; the
          // signups list lives under the Users section.
          if (action.target === "referrals") {
            setSection("referrals");
          } else if (action.target === "signups") {
            setSection("users");
          } else {
            setSection("dashboard");
          }
          break;
        case "refetch":
          void fetchAll(appliedRange, rangeKey);
          break;
        case "export":
          window.location.assign(csvExportHref);
          break;
        case "focus-search":
          setSection("users");
          // Give the section a tick to mount before we focus the input.
          setTimeout(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
          }, 0);
          break;
      }
    },
    [
      flashToast,
      applyRange,
      fetchAll,
      appliedRange,
      rangeKey,
      csvExportHref,
    ],
  );

  useEffect(() => {
    if (!isSignedIn) return;
    const handler = (e: KeyboardEvent) => {
      const { action, next } = parseHotkey(e, hotkeyStateRef.current);
      hotkeyStateRef.current = next;
      if (!action) return;
      e.preventDefault();
      dispatchAction(action);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSignedIn, dispatchAction]);

  // --- auth handlers (login view) ----------------------------------------

  async function requestCode() {
    setMessage(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/analytics/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request", email: emailInput.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage(data.message ?? "Something went wrong.");
        return;
      }
      setLoginEmail(emailInput.trim().toLowerCase());
      setPhase("otp");
      setMessage(data.message ?? null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyOtp() {
    setMessage(null);
    setAuthLoading(true);
    try {
      const res = await fetch("/api/analytics/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "verify",
          email: loginEmail,
          otp: otpInput.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; email?: string };
      if (!res.ok) {
        setMessage(data.message ?? "Verification failed.");
        return;
      }
      setSessionEmail(data.email ?? loginEmail);
      setOtpInput("");
      setPhase("email");
      router.refresh();
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    setAuthLoading(true);
    try {
      await fetch("/api/analytics/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "logout" }),
      });
      setSessionEmail(null);
      setStats(null);
      setSignups(null);
      setReferrals(null);
      setPriorStats(null);
      setEmailInput("");
      setOtpInput("");
      setPhase("email");
      router.refresh();
    } finally {
      setAuthLoading(false);
    }
  }

  // --- derived data ------------------------------------------------------

  const visibleSignups = useMemo(() => {
    if (!signups) return null;
    // Compute each row's "signup rank" — i.e. their position in the full
    // chronological list, with the latest user holding the highest number.
    // The API returns items in createdAt-desc order, so item 0 on page 0 is
    // the most recent overall. We attach the rank BEFORE search/sort so the
    // displayed number tracks the user, not their position in the current
    // view.
    const ranked: RankedSignupRow[] = signups.items.map((row, i) => ({
      ...row,
      signupRank: signups.total - (signups.page * signups.pageSize + i),
    }));
    const q = signupsSearch.trim().toLowerCase();
    let items = ranked;
    if (q) items = items.filter((r) => r.email.toLowerCase().includes(q));
    items = [...items].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "createdAt":
          return dir * (a.createdAt.localeCompare(b.createdAt));
        case "verifiedAt": {
          const av = a.verifiedAt ?? "";
          const bv = b.verifiedAt ?? "";
          return dir * av.localeCompare(bv);
        }
        case "email":
          return dir * a.email.localeCompare(b.email);
        case "referralsMade":
          return dir * (a.referralsMade - b.referralsMade);
      }
    });
    return { ...signups, items };
  }, [signups, signupsSearch, sort]);

  // --- LOGIN VIEW (unchanged) --------------------------------------------

  if (!isSignedIn) {
    const primaryCta =
      "inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-[15px] font-semibold text-zinc-950 shadow-sm outline-none transition hover:bg-white/90 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-40";

    return (
      <div className="site-canvas-bg flex min-h-dvh flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[460px] w-[min(900px,110vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.22),transparent_72%)] blur-2xl"
        />
        <SiteNav />
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-14 sm:px-6">
          <div className="w-full max-w-[440px] space-y-8">
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-inner shadow-black/40">
                <Image
                  src={logoMark}
                  alt="TrenchersAI"
                  width={28}
                  height={25}
                  className="h-[25px] w-[28px]"
                  priority
                />
              </div>
              <p className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
                <span aria-hidden className="h-px w-6 bg-white/15" />
                Team access
                <span aria-hidden className="h-px w-6 bg-white/15" />
              </p>
              <h1 className="mt-3 text-balance text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[2rem]">
                Internal analytics
              </h1>
              <p className="mx-auto mt-3 max-w-[40ch] text-pretty text-[15px] leading-[1.65] text-white/60">
                Sign in with your{" "}
                <span className="font-medium text-white/85">@{domain}</span>{" "}
                email. We will send a one-time code to your inbox. This page is
                not indexed and is for the Trenchers team only.
              </p>
            </div>

            {phase === "email" ? (
              <Card className="border-white/10 bg-black/55 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-md">
                <CardHeader className="space-y-1 p-6 pb-4">
                  <CardTitle className="text-lg text-white">Sign in</CardTitle>
                  <CardDescription className="text-white/55">
                    Work email on your verified Trenchers domain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-5">
                  <label className="sr-only" htmlFor="analytics-admin-email">
                    Work email
                  </label>
                  <input
                    id="analytics-admin-email"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={`you@${domain}`}
                    className="h-11 w-full rounded-lg border border-white/12 bg-black/35 px-3.5 text-[15px] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15"
                  />
                  <button
                    type="button"
                    className={primaryCta}
                    disabled={authLoading || !emailInput.trim()}
                    onClick={() => void requestCode()}
                  >
                    {authLoading ? "Sending code…" : "Email me a sign-in code"}
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-white/10 bg-black/55 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-md">
                <CardHeader className="space-y-1 p-6 pb-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-white/65" aria-hidden />
                    <CardTitle className="text-lg text-white">
                      Check your email
                    </CardTitle>
                  </div>
                  <CardDescription className="text-white/55">
                    Enter the 6-digit code we sent to{" "}
                    <span className="font-medium text-white/85">
                      {loginEmail}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-5">
                  <label className="sr-only" htmlFor="analytics-admin-otp">
                    One-time code
                  </label>
                  <input
                    id="analytics-admin-otp"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) =>
                      setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="• • • • • •"
                    className="h-12 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/20 placeholder:tracking-[0.35em] focus:border-white/35 focus:ring-2 focus:ring-white/15"
                  />
                  <button
                    type="button"
                    className={primaryCta}
                    disabled={authLoading || otpInput.length !== 6}
                    onClick={() => void verifyOtp()}
                  >
                    {authLoading ? "Verifying…" : "Sign in to dashboard"}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-white/12 bg-transparent text-white/60 hover:bg-white/5 hover:text-white"
                    onClick={() => {
                      setPhase("email");
                      setOtpInput("");
                      setMessage(null);
                    }}
                  >
                    Use a different email
                  </Button>
                </CardContent>
              </Card>
            )}

            {message ? (
              <p
                className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center text-sm leading-snug text-white/70"
                role="status"
              >
                {message}
              </p>
            ) : null}

            <p className="text-center text-[11px] leading-relaxed text-white/35">
              Internal tooling · not indexed ·{" "}
              <Link
                href="/"
                className="text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Return to marketing site
              </Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --- DASHBOARD VIEW ----------------------------------------------------

  return (
    <div className="site-canvas-bg flex min-h-dvh flex-col">
      <SiteNav
        analyticsActions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void logout()}
            className="h-7 rounded-full border-white/15 bg-transparent px-3 text-[12.5px] font-medium text-white/85 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        }
      />
      <div className="flex flex-1 pt-14">
        <AnalyticsSidebar
          active={section}
          onChange={setSection}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-28 pt-6 sm:gap-8 sm:px-6 sm:pb-10 sm:pt-10">
            <DashboardHeader
              sessionEmail={sessionEmail!}
              rangeKey={rangeKey}
              range={appliedRange}
              section={section}
            />

            {section === "dashboard" ? <AllTimeStrip stats={stats} /> : null}

            {section === "top-referrers" || section === "users" ? null : (
              <InPageNav
                activeRangeKey={rangeKey}
                onPickRange={applyRange}
              />
            )}

            {section === "dashboard" ? (
              <DashboardSection
                stats={stats}
                priorStats={priorStats}
                referrals={referrals}
                rangeKey={rangeKey}
                range={appliedRange}
              />
            ) : section === "referrals" ? (
              <ReferralsSection
                referrals={referrals}
                stats={stats}
                rangeKey={rangeKey}
                range={appliedRange}
              />
            ) : section === "top-referrers" ? (
              <TopReferrersSection referrals={referrals} />
            ) : (
              <UsersSection
                data={visibleSignups}
                page={signupsPage}
                onPageChange={setSignupsPage}
                status={signupsStatus}
                onStatusChange={(s) => {
                  setSignupsStatus(s);
                  setSignupsPage(0);
                }}
                search={signupsSearch}
                onSearchChange={setSignupsSearch}
                searchRef={searchRef}
                sort={sort}
                onSortChange={setSort}
                exportHref={csvExportHref}
              />
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav active={section} onChange={setSection} />
      <ToastChip toast={toast} />
    </div>
  );
}

// =========================================================================
// SECTIONS
// =========================================================================

function DashboardSection({
  stats,
  priorStats,
  referrals,
  rangeKey,
  range,
}: {
  stats: StatsPayload | null;
  priorStats: StatsPayload | null;
  referrals: ReferralsPayload | null;
  rangeKey: RangeKey;
  range: DateRange;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = range.from === todayStr && range.to === todayStr;
  const sparkSeries = (() => {
    if (stats?.series.signupsByHour) {
      return trimHourlyToNow(stats.series.signupsByHour, isToday);
    }
    if (!stats?.series.signupsByDay) return null;
    if (rangeKey === "all") {
      return trimLeadingEmpty(stats.series.signupsByDay).primary;
    }
    return stats.series.signupsByDay;
  })();

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <HeroMetric
        stats={stats}
        priorStats={priorStats}
        sparkSeries={sparkSeries}
        rangeKey={rangeKey}
        range={range}
      />
      <ActivityChart stats={stats} rangeKey={rangeKey} range={range} />
      <KpiRow stats={stats} referrals={referrals} rangeKey={rangeKey} />
    </div>
  );
}

/** Fixed all-time signups summary at the top of the Dashboard. Doesn't move
   with the range picker — gives the team a stable headline number that's
   always the same regardless of the active window. */
function AllTimeStrip({ stats }: { stats: StatsPayload | null }) {
  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardContent className="flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            All-time signups
          </p>
          {stats ? (
            <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight text-white sm:text-3xl">
              {stats.allTime.totalSubscribers}
            </p>
          ) : (
            <Skeleton className="mt-1 h-8 w-24" />
          )}
        </div>
        <div className="text-xs text-white/45">
          {stats ? (
            <>
              <span className="tabular-nums text-white/75">
                {stats.allTime.verifiedSubscribers}
              </span>{" "}
              verified ·{" "}
              <span className="tabular-nums text-white/75">
                {stats.allTime.pendingVerification}
              </span>{" "}
              pending
            </>
          ) : (
            <Skeleton className="h-3 w-40" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralsSection({
  referrals,
  stats,
  rangeKey,
  range,
}: {
  referrals: ReferralsPayload | null;
  stats: StatsPayload | null;
  rangeKey: RangeKey;
  range: DateRange;
}) {
  // A reduced KPI row (the two referral KPIs only) sits above the leaderboard
  // — Verification rate lives on Dashboard, so this section is referral-only.
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ReferralKpiRow
        referrals={referrals}
        stats={stats}
        rangeKey={rangeKey}
      />
      <ReferralActivityChart
        referrals={referrals}
        rangeKey={rangeKey}
        range={range}
      />
    </div>
  );
}

function TopReferrersSection({
  referrals,
}: {
  referrals: ReferralsPayload | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ReferrersStrip data={referrals} loading={referrals === null} />
    </div>
  );
}

/** Mirror of the dashboard's `ActivityChart` but with the secondary-bar
   overlay turned on. Light bar = total signups in the bucket; bright bar on
   top = the portion that came through a referral. Switches to hourly
   buckets when the range is a single UTC day. */
function ReferralActivityChart({
  referrals,
  rangeKey,
  range,
}: {
  referrals: ReferralsPayload | null;
  rangeKey: RangeKey;
  range: DateRange;
}) {
  const isLoading = referrals === null;
  const hourly = referrals?.hourlySplit ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = range.from === todayStr && range.to === todayStr;

  const pairs: { total: { date: string; count: number }[]; referred: { date: string; count: number }[] } | null = (() => {
    if (!referrals) return null;
    if (hourly) {
      const trimmed = trimHourlyToNow(hourly, isToday);
      return {
        total: trimmed.map((d) => ({
          date: d.date,
          count: d.referred + d.organic,
        })),
        referred: trimmed.map((d) => ({ date: d.date, count: d.referred })),
      };
    }
    let daily = referrals.dailySplit;
    if (rangeKey === "all") {
      // Trim leading no-activity days so the All-time axis starts at the
      // first signup, matching the dashboard's activity chart behaviour.
      const totals = daily.map((d) => ({
        date: d.date,
        count: d.referred + d.organic,
      }));
      const referred = daily.map((d) => ({
        date: d.date,
        count: d.referred,
      }));
      const trimmed = trimLeadingEmpty(totals, referred);
      // Snap dailySplit back together using the trimmed primary's dates.
      const trimmedDates = new Set(trimmed.primary.map((p) => p.date));
      daily = daily.filter((d) => trimmedDates.has(d.date));
    }
    return {
      total: daily.map((d) => ({
        date: d.date,
        count: d.referred + d.organic,
      })),
      referred: daily.map((d) => ({ date: d.date, count: d.referred })),
    };
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Referral activity</CardTitle>
            <CardDescription>
              {hourly
                ? "Signups per UTC hour, with the referred portion overlaid in bright white."
                : "Signups per UTC day, with the referred portion overlaid in bright white."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !pairs ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <AnalyticsTimeseriesChart
            signupsByDay={pairs.total}
            verificationsByDay={pairs.referred}
            bucketType={hourly ? "hour" : "day"}
            showSecondaryBar
            primaryLabel="total"
            secondaryLabel="referred"
            primaryLegend="Total signups"
            secondaryLegend="Referred"
          />
        )}
      </CardContent>
    </Card>
  );
}

function UsersSection(props: React.ComponentProps<typeof SignupsTable>) {
  return (
    <div className="flex flex-col gap-6">
      <SignupsTable {...props} />
    </div>
  );
}


// =========================================================================
// HEADER
// =========================================================================

const SECTION_TITLE: Record<AnalyticsSection, string> = {
  dashboard: "Dashboard",
  referrals: "Referrals",
  "top-referrers": "Top referrers",
  users: "Users",
};

function DashboardHeader({
  sessionEmail,
  rangeKey,
  range,
  section,
}: {
  sessionEmail: string;
  rangeKey: RangeKey;
  range: DateRange;
  section: AnalyticsSection;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
          Trenchers · Analytics
        </p>
        <h1 className="mt-1 text-xl font-medium tracking-tight text-white sm:text-2xl">
          {SECTION_TITLE[section]}
        </h1>
        <p className="mt-1 truncate text-xs text-white/45">
          Signed in as{" "}
          <span className="text-white/70">{sessionEmail}</span>
        </p>
      </div>
      {section === "top-referrers" || section === "users" ? null : (
        <RangePill rangeKey={rangeKey} range={range} />
      )}
    </header>
  );
}

function RangePill({
  rangeKey,
  range,
}: {
  rangeKey: RangeKey;
  range: DateRange;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
      <span aria-hidden className="size-1.5 rounded-full bg-indigo-400" />
      <span className="font-medium text-white/90">{rangeLabel(rangeKey)}</span>
      <span className="hidden text-white/40 sm:inline">
        · {formatShortDate(range.from)} → {formatShortDate(range.to)} UTC
      </span>
    </span>
  );
}

// =========================================================================
// IN-PAGE NAV
// =========================================================================

const RANGE_QUICK: { key: RangeKey; label: string }[] = [
  { key: "last1", label: "1d" },
  { key: "last2", label: "2d" },
  { key: "last3", label: "3d" },
  { key: "last7", label: "1w" },
  { key: "last30", label: "1m" },
  { key: "last90", label: "3m" },
  { key: "all", label: "All" },
];

function InPageNav({
  activeRangeKey,
  onPickRange,
}: {
  activeRangeKey: RangeKey;
  onPickRange: (key: RangeKey) => void;
}) {
  return (
    <nav
      aria-label="Range presets"
      className="mt-4 flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-1"
    >
      {RANGE_QUICK.map((r) => {
        const active = activeRangeKey === r.key;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onPickRange(r.key)}
            className={
              "inline-flex flex-1 shrink-0 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
              (active
                ? "bg-white text-zinc-950"
                : "text-white/65 hover:bg-white/[0.04] hover:text-white")
            }
          >
            {r.label}
          </button>
        );
      })}
    </nav>
  );
}

// =========================================================================
// HERO METRIC
// =========================================================================

function HeroMetric({
  stats,
  priorStats,
  sparkSeries,
  rangeKey,
  range,
}: {
  stats: StatsPayload | null;
  priorStats: StatsPayload | null;
  sparkSeries: { date: string; count: number }[] | null;
  rangeKey: RangeKey;
  range: DateRange;
}) {
  const current = stats?.rangeTotals.signupsStarted ?? null;
  const prior = priorStats?.rangeTotals.signupsStarted ?? null;
  const deltaPct =
    current != null && prior != null && prior > 0
      ? ((current - prior) / prior) * 100
      : null;
  const deltaTone: "up" | "down" | "flat" | "neutral" =
    deltaPct == null
      ? "neutral"
      : deltaPct > 0
        ? "up"
        : deltaPct < 0
          ? "down"
          : "flat";
  const deltaGlyph =
    deltaTone === "up" ? "↑" : deltaTone === "down" ? "↓" : "";

  return (
    <Card className="relative overflow-hidden border-white/10 bg-black/55 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[min(720px,110%)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(94,104,255,0.22),transparent_72%)] blur-2xl"
      />
      <CardContent className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            New signups · {rangeLabel(rangeKey)}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            {current != null ? (
              <span className="text-4xl font-medium tabular-nums tracking-tight text-white sm:text-6xl">
                {current}
              </span>
            ) : (
              <Skeleton className="h-12 w-28 sm:h-16 sm:w-40" />
            )}
            {deltaPct != null ? (
              <span
                className={
                  "text-sm font-medium tabular-nums " +
                  (deltaTone === "up"
                    ? "text-white"
                    : deltaTone === "down"
                      ? "text-white/55"
                      : "text-white/50")
                }
              >
                {deltaGlyph} {Math.abs(Math.round(deltaPct))}%
                <span className="font-normal text-white/35">
                  {" "}
                  vs prior {rangeLabel(rangeKey).toLowerCase()}
                </span>
              </span>
            ) : rangeKey === "all" ? null : prior != null && prior === 0 && current != null && current > 0 ? (
              <span className="text-sm font-medium tabular-nums text-white">
                ↑ new
                <span className="font-normal text-white/35">
                  {" "}
                  vs prior {rangeLabel(rangeKey).toLowerCase()}
                </span>
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-white/55">
            {formatShortDate(range.from)} → {formatShortDate(range.to)} (UTC)
            {stats ? (
              <span className="text-white/35">
                {" · "}
                {stats.rangeTotals.signupsVerified} verified
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          {sparkSeries && sparkSeries.length > 1 ? (
            <Sparkline
              values={sparkSeries.map((d) => d.count)}
              width={200}
              height={52}
            />
          ) : (
            <Skeleton className="h-12 w-48" />
          )}
          <span className="text-[10px] font-medium tracking-[0.15em] text-white/35 uppercase">
            {rangeLabel(rangeKey)}
            {sparkSeries && sparkSeries[0]?.date.includes("T")
              ? " · by hour"
              : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({
  values,
  width,
  height,
  color = "white",
  strokeWidth = 1.5,
}: {
  values: number[];
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const max = Math.max(1, ...values);
  const pad = strokeWidth;
  const w = width;
  const h = height;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPts = `${pad},${h} ${pts} ${w - pad},${h}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-fill-${width}-${height}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#spark-fill-${width}-${height})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeOpacity="0.85"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

// =========================================================================
// ACTIVITY CHART
// =========================================================================

function ActivityChart({
  stats,
  rangeKey,
  range,
}: {
  stats: StatsPayload | null;
  rangeKey: RangeKey;
  range: DateRange;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = range.from === todayStr && range.to === todayStr;
  // Hourly view is server-gated: the stats route only populates `signupsByHour`
  // when the requested range is a single UTC day, so the chart switches modes
  // automatically when the user picks "1d" / "Today". Future hours of today
  // are trimmed off so the axis doesn't carry a flat tail of zeros.
  const hourly =
    stats?.series.signupsByHour && stats.series.verificationsByHour
      ? {
          signups: trimHourlyToNow(stats.series.signupsByHour, isToday),
          verifications: trimHourlyToNow(
            stats.series.verificationsByHour,
            isToday,
          ),
        }
      : null;
  // For "All-time", drop leading days with no activity so the axis starts at
  // the first signup instead of 2020-01-01. Other windows respect the picker
  // exactly — even empty days are shown.
  const daily =
    stats && rangeKey === "all"
      ? trimLeadingEmpty(
          stats.series.signupsByDay,
          stats.series.verificationsByDay,
        )
      : stats
        ? {
            primary: stats.series.signupsByDay,
            secondary: stats.series.verificationsByDay,
          }
        : null;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Daily activity</CardTitle>
            <CardDescription>
              {hourly
                ? "New signups per UTC hour. Hover a bar to see the hour breakdown."
                : "New signups per UTC day. Hover a bar to see the day breakdown."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats && daily ? (
          hourly ? (
            <AnalyticsTimeseriesChart
              signupsByDay={hourly.signups}
              verificationsByDay={hourly.verifications}
              bucketType="hour"
            />
          ) : (
            <AnalyticsTimeseriesChart
              signupsByDay={daily.primary}
              verificationsByDay={daily.secondary}
            />
          )
        ) : (
          <Skeleton className="h-[260px] w-full" />
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// KPI ROW
// =========================================================================

function KpiRow({
  stats,
  referrals,
  rangeKey,
}: {
  stats: StatsPayload | null;
  referrals: ReferralsPayload | null;
  rangeKey: RangeKey;
}) {
  // Same All-time fix as the hero/activity charts: when the user picks
  // All-time, walk past the leading days that have no activity so the
  // sparkline isn't a flat line that spikes at the end.
  const verifySeries = (() => {
    if (!stats) return null;
    if (stats.series.verificationsByHour) {
      return stats.series.verificationsByHour.map((d) => d.count);
    }
    if (rangeKey === "all") {
      return trimLeadingEmpty(
        stats.series.verificationsByDay,
        stats.series.signupsByDay,
      ).primary.map((d) => d.count);
    }
    return stats.series.verificationsByDay.map((d) => d.count);
  })();
  const dailySplitTrimmed = (() => {
    if (!referrals) return null;
    if (rangeKey === "all") {
      // Use the referred+organic sum as the "is this day empty?" signal so
      // both sparklines (referred, total) trim at the same anchor.
      const totals = referrals.dailySplit.map((d) => ({
        date: d.date,
        count: d.referred + d.organic,
      }));
      const referredAligned = referrals.dailySplit.map((d) => ({
        date: d.date,
        count: d.referred,
      }));
      const trimmed = trimLeadingEmpty(totals, referredAligned);
      return {
        referred: trimmed.secondary.map((d) => d.count),
        total: trimmed.primary.map((d) => d.count),
      };
    }
    return {
      referred: referrals.dailySplit.map((d) => d.referred),
      total: referrals.dailySplit.map((d) => d.referred + d.organic),
    };
  })();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        label="Verification rate"
        value={
          stats && stats.rangeTotals.signupsStarted > 0
            ? pct(
                stats.rangeTotals.signupsVerified /
                  stats.rangeTotals.signupsStarted,
              )
            : null
        }
        hint={
          stats
            ? `${stats.rangeTotals.signupsVerified} / ${stats.rangeTotals.signupsStarted} verified`
            : null
        }
        sparkValues={verifySeries}
      />
      <KpiCard
        label="Referred share"
        value={
          referrals && stats && stats.rangeTotals.signupsStarted > 0
            ? pct(
                referrals.stats.referredCreatedInRange /
                  stats.rangeTotals.signupsStarted,
              )
            : null
        }
        hint={
          referrals
            ? `${referrals.stats.referredCreatedInRange} of ${stats?.rangeTotals.signupsStarted ?? "—"} came via referral`
            : null
        }
        sparkValues={dailySplitTrimmed?.referred ?? null}
      />
      <KpiCard
        label="Active referrers"
        value={
          referrals
            ? String(referrals.stats.referrersInRange)
            : null
        }
        hint={
          referrals
            ? `${referrals.stats.avgReferralsPerReferrerInRange.toFixed(2)} referrals per referrer (avg)`
            : null
        }
        sparkValues={dailySplitTrimmed?.total ?? null}
      />
    </div>
  );
}

/** Two-card KPI strip for the Referrals section — drops Verification rate
   (which lives on the Dashboard section) and reuses the same trim/skeleton
   logic as the full KpiRow. */
function ReferralKpiRow({
  referrals,
  stats,
  rangeKey,
}: {
  referrals: ReferralsPayload | null;
  stats: StatsPayload | null;
  rangeKey: RangeKey;
}) {
  const dailySplitTrimmed = (() => {
    if (!referrals) return null;
    if (rangeKey === "all") {
      const totals = referrals.dailySplit.map((d) => ({
        date: d.date,
        count: d.referred + d.organic,
      }));
      const referredAligned = referrals.dailySplit.map((d) => ({
        date: d.date,
        count: d.referred,
      }));
      const trimmed = trimLeadingEmpty(totals, referredAligned);
      return {
        referred: trimmed.secondary.map((d) => d.count),
        total: trimmed.primary.map((d) => d.count),
      };
    }
    return {
      referred: referrals.dailySplit.map((d) => d.referred),
      total: referrals.dailySplit.map((d) => d.referred + d.organic),
    };
  })();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <KpiCard
        label="Referred share"
        value={
          referrals && stats && stats.rangeTotals.signupsStarted > 0
            ? pct(
                referrals.stats.referredCreatedInRange /
                  stats.rangeTotals.signupsStarted,
              )
            : null
        }
        hint={
          referrals
            ? `${referrals.stats.referredCreatedInRange} of ${stats?.rangeTotals.signupsStarted ?? "—"} came via referral`
            : null
        }
        sparkValues={dailySplitTrimmed?.referred ?? null}
      />
      <KpiCard
        label="Active referrers"
        value={referrals ? String(referrals.stats.referrersInRange) : null}
        hint={
          referrals
            ? `${referrals.stats.avgReferralsPerReferrerInRange.toFixed(2)} referrals per referrer (avg)`
            : null
        }
        sparkValues={dailySplitTrimmed?.total ?? null}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  sparkValues,
}: {
  label: string;
  value: string | null;
  hint: string | null;
  sparkValues: number[] | null;
}) {
  return (
    <Card>
      <CardHeader className="gap-3 border-b-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <span className="rounded-full border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/55">
            In range
          </span>
        </div>
        {value != null ? (
          <CardTitle className="text-3xl font-medium tabular-nums tracking-tight text-white">
            {value}
          </CardTitle>
        ) : (
          <Skeleton className="h-8 w-24" />
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {hint != null ? (
          <p className="text-xs text-white/45">{hint}</p>
        ) : (
          <Skeleton className="h-3 w-44 max-w-full" />
        )}
        <div className="-mx-1">
          {sparkValues === null ? (
            <Skeleton className="h-9 w-full" />
          ) : sparkValues.length > 1 ? (
            <Sparkline
              values={sparkValues}
              width={260}
              height={36}
              color="rgb(129 140 248)"
              strokeWidth={1.25}
            />
          ) : (
            // Loaded but not enough points to draw — leave the slot empty
            // rather than show a misleading skeleton or a flat dot.
            <div aria-hidden />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// SIGNUPS TABLE
// =========================================================================

function SignupsTable({
  data,
  page,
  onPageChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
  searchRef,
  sort,
  onSortChange,
  exportHref,
}: {
  data: RankedSignupsPayload | null;
  page: number;
  onPageChange: (page: number) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  search: string;
  onSearchChange: (q: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  sort: { key: SortKey; dir: SortDir };
  onSortChange: (next: { key: SortKey; dir: SortDir }) => void;
  exportHref: string;
}) {
  const toggleSort = (key: SortKey) => {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ key, dir: "desc" });
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader className="gap-4 border-b-0 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              All-time waitlist directory. Search by email, sort any column,
              or export the current view to CSV.
            </CardDescription>
          </div>
          <a
            href={exportHref}
            download
            title="Download current filter as CSV"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export CSV
          </a>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search email…"
              className="h-9 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35 focus:ring-2 focus:ring-white/15"
            />
          </div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-white/12 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/35 focus:ring-2 focus:ring-white/15"
          >
            <option value="all">All statuses</option>
            <option value="verified">Verified only</option>
            <option value="pending">Pending only</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative max-h-[560px] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-black/85 backdrop-blur">
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/45">
                <th className="w-12 py-2.5 pl-4 pr-2 text-center font-medium">
                  #
                </th>
                <SortHeader
                  label="User"
                  active={sort.key === "email"}
                  dir={sort.dir}
                  onClick={() => toggleSort("email")}
                />
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <SortHeader
                  label="Joined"
                  active={sort.key === "createdAt"}
                  dir={sort.dir}
                  onClick={() => toggleSort("createdAt")}
                />
                <SortHeader
                  label="Verified"
                  active={sort.key === "verifiedAt"}
                  dir={sort.dir}
                  onClick={() => toggleSort("verifiedAt")}
                />
                <SortHeader
                  label="Referrals"
                  active={sort.key === "referralsMade"}
                  dir={sort.dir}
                  onClick={() => toggleSort("referralsMade")}
                  align="right"
                />
                <th className="py-2.5 pr-4 font-medium">Code</th>
              </tr>
            </thead>
            <tbody>
              {!data
                ? Array.from({ length: 8 }).map((_, i) => (
                    <SignupsTableSkeletonRow key={i} />
                  ))
                : data.items.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-white/50"
                      >
                        No users match this filter.
                      </td>
                    </tr>
                  )
                  : data.items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-white/[0.04] text-white/80"
                      >
                        <td className="py-3 pl-4 pr-2 text-center font-mono text-xs tabular-nums text-white/55">
                          {row.signupRank}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div
                              aria-hidden
                              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-white/85"
                            >
                              {emailInitial(row.email)}
                            </div>
                            <span
                              className="truncate font-mono text-[12.5px] text-white/90"
                              title={row.email}
                            >
                              {row.email}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {row.isVerified ? (
                            <Badge variant="success">Verified</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[11px] whitespace-nowrap text-white/55">
                          {formatJoinedDate(row.createdAt)}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[11px] whitespace-nowrap text-white/45">
                          {row.verifiedAt
                            ? formatJoinedDate(row.verifiedAt)
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="font-mono text-sm tabular-nums text-white">
                            {row.referralsMade}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-white/40">
                          {row.referralCode}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3 text-xs text-white/55">
          <span>
            {data ? (
              <>
                {data.items.length} of {data.total} rows · page {page + 1} of{" "}
                {totalPages}
              </>
            ) : (
              "Loading…"
            )}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data || page <= 0}
              onClick={() => onPageChange(Math.max(0, page - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data || (page + 1) * data.pageSize >= data.total}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className = "",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={
        "py-2.5 pr-4 font-medium " +
        (align === "right" ? "text-right" : "text-left") +
        " " +
        className
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={
          "inline-flex items-center gap-1 transition-colors " +
          (active ? "text-white" : "text-white/45 hover:text-white/75")
        }
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function SignupsTableSkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-3 pl-4 pr-2 text-center">
        <Skeleton className="mx-auto h-3 w-3" />
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 w-44 max-w-full" />
        </div>
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-3 w-20" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-3 w-20" />
      </td>
      <td className="py-3 pr-4 text-right">
        <Skeleton className="ml-auto h-4 w-6" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-3 w-20" />
      </td>
    </tr>
  );
}

// =========================================================================
// TOAST
// =========================================================================

function ToastChip({
  toast,
}: {
  toast: { id: number; label: string } | null;
}) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[150] -translate-x-1/2 rounded-full border border-white/12 bg-black/85 px-3.5 py-1.5 text-xs font-medium text-white/85 shadow-2xl shadow-black/50 ring-1 ring-white/[0.04] backdrop-blur"
    >
      {toast.label}
    </div>
  );
}
