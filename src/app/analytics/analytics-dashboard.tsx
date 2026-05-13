"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { AnalyticsSidebar, type AnalyticsNavId } from "@/src/app/analytics/analytics-sidebar";
import {
  ReferralsView,
  type ReferralsPayload,
} from "@/src/app/analytics/analytics-referrals-view";
import { AnalyticsTimeseriesChart } from "@/src/app/analytics/analytics-timeseries-chart";
import { Badge } from "@/src/components/ui/badge";
import { Button, buttonVariants } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import SiteNav from "@/src/components/site-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
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
  };
};

type SignupsPayload = {
  items: Array<{
    id: string;
    email: string;
    isVerified: boolean;
    verifiedAt: string | null;
    createdAt: string;
    referralsMade: number;
    referralCode: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  status: string;
};

type PresetKey = "7d" | "14d" | "30d" | "90d" | "all";

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  if (key === "all") {
    return { from: "2020-01-01", to: toStr };
  }
  const days = key === "7d" ? 6 : key === "14d" ? 13 : key === "30d" ? 29 : 89;
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().slice(0, 10), to: toStr };
}

function formatDateTimeUtc(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex justify-between gap-2 text-xs text-zinc-400">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-zinc-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({
  initialEmail,
}: {
  initialEmail: string | null;
}) {
  const router = useRouter();
  const domain = useMemo(() => getInternalAnalyticsEmailDomain(), []);

  const [sessionEmail, setSessionEmail] = useState(initialEmail);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [signups, setSignups] = useState<SignupsPayload | null>(null);
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [appliedRange, setAppliedRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">(
    "all",
  );
  const [tablePage, setTablePage] = useState(0);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainNav, setMainNav] = useState<AnalyticsNavId>("overview");
  const [trendsTab, setTrendsTab] = useState<"chart" | "daily">("chart");
  const [referrals, setReferrals] = useState<ReferralsPayload | null>(null);
  const [referralsLoading, setReferralsLoading] = useState(false);

  const isSignedIn = Boolean(sessionEmail);

  const fetchDashboard = useCallback(
    async (range: { from: string; to: string } | null, page: number) => {
      const params = new URLSearchParams();
      if (range) {
        params.set("from", range.from);
        params.set("to", range.to);
      }
      params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "25");

      const [statsRes, signRes] = await Promise.all([
        fetch(`/api/analytics/stats?${params.toString()}`, {
          credentials: "include",
        }),
        fetch(`/api/analytics/signups?${params.toString()}`, {
          credentials: "include",
        }),
      ]);

      if (statsRes.status === 401 || signRes.status === 401) {
        setSessionEmail(null);
        setStats(null);
        setSignups(null);
        setPhase("email");
        return;
      }

      if (statsRes.ok) {
        const data = (await statsRes.json()) as StatsPayload;
        setStats(data);
        setFromFilter(data.range.from);
        setToFilter(data.range.to);
      }

      if (signRes.ok) {
        setSignups((await signRes.json()) as SignupsPayload);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (!isSignedIn) return;
    queueMicrotask(() => {
      void fetchDashboard(appliedRange, tablePage);
    });
  }, [isSignedIn, appliedRange, tablePage, statusFilter, fetchDashboard]);

  const fetchReferrals = useCallback(
    async (range: { from: string; to: string } | null) => {
      const params = new URLSearchParams();
      if (range) {
        params.set("from", range.from);
        params.set("to", range.to);
      }
      params.set("limit", "10");
      setReferralsLoading(true);
      try {
        const res = await fetch(`/api/analytics/referrals?${params.toString()}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          setSessionEmail(null);
          setReferrals(null);
          setPhase("email");
          return;
        }
        if (res.ok) {
          setReferrals((await res.json()) as ReferralsPayload);
        }
      } finally {
        setReferralsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isSignedIn) return;
    if (mainNav !== "referrals") return;
    queueMicrotask(() => {
      void fetchReferrals(appliedRange);
    });
  }, [isSignedIn, mainNav, appliedRange, fetchReferrals]);

  async function requestCode() {
    setMessage(null);
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setMessage(null);
    setLoading(true);
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
      setAppliedRange(null);
      setTablePage(0);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
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
      setAppliedRange(null);
      setEmailInput("");
      setOtpInput("");
      setPhase("email");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function applyRange() {
    setAppliedRange({ from: fromFilter, to: toFilter });
    setTablePage(0);
  }

  function applyPreset(key: PresetKey) {
    const range = presetRange(key);
    setFromFilter(range.from);
    setToFilter(range.to);
    setAppliedRange(range);
    setTablePage(0);
  }

  const csvExportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedRange) {
      params.set("from", appliedRange.from);
      params.set("to", appliedRange.to);
    } else if (stats?.range) {
      params.set("from", stats.range.from);
      params.set("to", stats.range.to);
    }
    params.set("status", statusFilter);
    return `/api/analytics/export?${params.toString()}`;
  }, [appliedRange, stats, statusFilter]);

  const chartMax = useMemo(() => {
    if (!stats) return 1;
    let m = 1;
    for (const row of stats.series.signupsByDay) {
      m = Math.max(m, row.count);
    }
    for (const row of stats.series.verificationsByDay) {
      m = Math.max(m, row.count);
    }
    return m;
  }, [stats]);

  const lastBars = useMemo(() => {
    type DayRow = { date: string; count: number };
    const empty: { created: DayRow[]; verified: DayRow[] } = {
      created: [],
      verified: [],
    };
    if (!stats) return empty;
    const n = 14;
    return {
      created: stats.series.signupsByDay.slice(-n),
      verified: stats.series.verificationsByDay.slice(-n),
    };
  }, [stats]);

  if (!isSignedIn) {
    const primaryCta =
      "h-11 w-full rounded-lg border border-emerald-500/30 bg-emerald-600 px-4 text-[15px] font-semibold text-white shadow-lg shadow-emerald-950/30 outline-none transition-colors hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:pointer-events-none disabled:opacity-40";

    return (
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgb(6_78_59/0.35),transparent_55%),var(--site-base-color,#0a0a0a)]">
        <SiteNav />
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-14 sm:px-6">
          <div className="w-full max-w-[440px] space-y-8">
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-inner shadow-emerald-950/20">
                <ShieldCheck
                  className="size-7 text-emerald-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-500/80 uppercase">
                Team access
              </p>
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                Internal analytics
              </h1>
              <p className="mx-auto mt-3 max-w-[40ch] text-pretty text-[15px] leading-relaxed text-zinc-400">
                Sign in with your{" "}
                <span className="font-medium text-zinc-200">@{domain}</span> email.
                We will send a one-time code to your inbox. This page is not indexed
                and is for the Trenchers team only.
              </p>
            </div>

            {phase === "email" ? (
              <Card className="border-zinc-700/80 bg-zinc-950/70 shadow-2xl shadow-black/40 ring-1 ring-white/[0.06] backdrop-blur-md">
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-lg text-white">Sign in</CardTitle>
                  <CardDescription>
                    Work email on your verified Trenchers domain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
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
                    className="h-11 w-full rounded-lg border border-zinc-600 bg-black/35 px-3.5 text-[15px] text-white outline-none ring-emerald-500/0 transition-[box-shadow,border-color] placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25"
                  />
                  <button
                    type="button"
                    className={primaryCta}
                    disabled={loading || !emailInput.trim()}
                    onClick={() => void requestCode()}
                  >
                    {loading ? "Sending code…" : "Email me a sign-in code"}
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-zinc-700/80 bg-zinc-950/70 shadow-2xl shadow-black/40 ring-1 ring-white/[0.06] backdrop-blur-md">
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-emerald-400/90" aria-hidden />
                    <CardTitle className="text-lg text-white">Check your email</CardTitle>
                  </div>
                  <CardDescription>
                    Enter the 6-digit code we sent to{" "}
                    <span className="font-medium text-zinc-200">{loginEmail}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
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
                    className="h-12 w-full rounded-lg border border-zinc-600 bg-black/35 px-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none ring-emerald-500/0 transition-[box-shadow,border-color] placeholder:text-zinc-700 placeholder:tracking-[0.35em] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/25"
                  />
                  <button
                    type="button"
                    className={primaryCta}
                    disabled={loading || otpInput.length !== 6}
                    onClick={() => void verifyOtp()}
                  >
                    {loading ? "Verifying…" : "Sign in to dashboard"}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
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
                className="rounded-lg border border-zinc-700/90 bg-zinc-900/60 px-4 py-3 text-center text-sm leading-snug text-zinc-300"
                role="status"
              >
                {message}
              </p>
            ) : null}

            <p className="text-center text-[11px] leading-relaxed text-zinc-600">
              Internal tooling · not indexed ·{" "}
              <Link
                href="/"
                className="text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
              >
                Return to marketing site
              </Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <SiteNav />
      <div className="flex min-h-0 w-full min-w-0 flex-1 pt-14">
        <AnalyticsSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          active={mainNav}
          onNavigate={setMainNav}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950/30">
          <main className="scrollbar-minimal-black min-h-0 flex-1 overflow-y-auto px-3 pb-12 sm:px-4 md:px-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 py-4 sm:gap-8 sm:py-6">
              <MobileAnalyticsTabs active={mainNav} onNavigate={setMainNav} />

              <header className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4 sm:gap-4 sm:pb-6">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                    Trenchers waitlist
                  </p>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Signup analytics
                  </h1>
                  <p className="mt-2 truncate text-xs text-zinc-400 sm:text-sm">
                    Signed in as{" "}
                    <span className="font-medium text-zinc-200">{sessionEmail}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:[&]:h-9 sm:[&]:px-4"
                  onClick={() => void logout()}
                >
                  Sign out
                </Button>
              </header>

              {mainNav === "overview" ? (
                <>
                  {stats ? (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        label="All-time signups"
                        value={stats.allTime.totalSubscribers}
                      />
                      <StatCard
                        label="Verified"
                        value={stats.allTime.verifiedSubscribers}
                      />
                      <StatCard
                        label="Pending verify"
                        value={stats.allTime.pendingVerification}
                      />
                      <StatCard
                        label="Range conversion"
                        value={
                          stats.rangeTotals.signupsStarted === 0
                            ? "—"
                            : `${Math.round(
                                (stats.rangeTotals.signupsVerified /
                                  stats.rangeTotals.signupsStarted) *
                                  100,
                              )}%`
                        }
                        hint={`${stats.rangeTotals.signupsVerified} verified / ${stats.rangeTotals.signupsStarted} started in range`}
                      />
                    </section>
                  ) : (
                    <p className="text-sm text-zinc-500">Loading metrics…</p>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Date range</CardTitle>
                      <CardDescription>
                        Full UTC days. Applies to charts, summary, and the signups table.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { key: "7d", label: "7 days" },
                            { key: "14d", label: "14 days" },
                            { key: "30d", label: "30 days" },
                            { key: "90d", label: "90 days" },
                            { key: "all", label: "All-time" },
                          ] as { key: PresetKey; label: string }[]
                        ).map(({ key, label }) => (
                          <Button
                            key={key}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset(key)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                        <label className="flex flex-col gap-1 text-xs text-zinc-400">
                          From
                          <input
                            type="date"
                            value={fromFilter}
                            onChange={(e) => setFromFilter(e.target.value)}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-400">
                          To
                          <input
                            type="date"
                            value={toFilter}
                            onChange={(e) => setToFilter(e.target.value)}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-400">
                          Table filter
                          <select
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value as typeof statusFilter);
                              setTablePage(0);
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
                          >
                            <option value="all">All statuses</option>
                            <option value="verified">Verified only</option>
                            <option value="pending">Pending only</option>
                          </select>
                        </label>
                        <Button type="button" onClick={() => applyRange()}>
                          Apply custom range
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {mainNav === "trends" && stats ? (
                <Tabs value={trendsTab} onValueChange={(v) => setTrendsTab(v as "chart" | "daily")}>
                  <TabsList className="w-full max-w-md">
                    <TabsTrigger value="chart" className="flex-1">
                      Chart
                    </TabsTrigger>
                    <TabsTrigger value="daily" className="flex-1">
                      Daily breakdown
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chart">
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily volume</CardTitle>
                        <CardDescription>
                          Selected range ({stats.range.from} → {stats.range.to}, UTC). Green
                          = new waitlist rows; blue = OTP verifications.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AnalyticsTimeseriesChart
                          signupsByDay={stats.series.signupsByDay}
                          verificationsByDay={stats.series.verificationsByDay}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="daily">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>New emails (by day)</CardTitle>
                          <CardDescription>
                            Last {lastBars.created.length} days in range (UTC).
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                          {lastBars.created.map((row) => (
                            <BarRow
                              key={row.date}
                              label={row.date}
                              value={row.count}
                              max={chartMax}
                            />
                          ))}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Verifications (by day)</CardTitle>
                          <CardDescription>
                            Last {lastBars.verified.length} days in range (UTC).
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                          {lastBars.verified.map((row) => (
                            <BarRow
                              key={row.date}
                              label={row.date}
                              value={row.count}
                              max={chartMax}
                            />
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : null}

              {mainNav === "trends" && !stats ? (
                <p className="text-sm text-zinc-500">Loading chart data…</p>
              ) : null}

              {mainNav === "referrals" ? (
                <ReferralsView
                  data={referrals}
                  loading={referralsLoading}
                  rangeStarted={stats?.rangeTotals.signupsStarted ?? null}
                  rangeVerified={stats?.rangeTotals.signupsVerified ?? null}
                />
              ) : null}

              {mainNav === "signups" ? (
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Recent signups</CardTitle>
                      <CardDescription>
                        Timestamps in UTC.{" "}
                        {signups ? (
                          <span className="text-zinc-500">
                            {signups.total} in range · page {signups.page + 1}
                          </span>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                      <label className="flex flex-col gap-1 text-xs text-zinc-400">
                        Status
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value as typeof statusFilter);
                            setTablePage(0);
                          }}
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
                        >
                          <option value="all">All</option>
                          <option value="verified">Verified</option>
                          <option value="pending">Pending</option>
                        </select>
                      </label>
                      <div className="flex gap-2 sm:ml-auto">
                        <a
                          href={csvExportHref}
                          download
                          title="Download current filter as CSV (cap 10,000 rows)"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Export CSV
                        </a>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!signups || tablePage <= 0}
                          onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            !signups ||
                            (tablePage + 1) * signups.pageSize >= signups.total
                          }
                          onClick={() => setTablePage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-0 sm:px-4">
                    <div className="overflow-x-auto px-4 sm:px-0">
                      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                            <th className="py-2 pr-4 font-medium">Email</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 pr-4 font-medium">Created (UTC)</th>
                            <th className="py-2 pr-4 font-medium">Verified (UTC)</th>
                            <th className="py-2 pr-4 font-medium">Referrals</th>
                            <th className="py-2 font-medium">Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {signups?.items.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-zinc-800/80 text-zinc-300"
                            >
                              <td className="py-2 pr-4 font-mono text-xs text-zinc-200">
                                {row.email}
                              </td>
                              <td className="py-2 pr-4">
                                {row.isVerified ? (
                                  <Badge variant="success">Verified</Badge>
                                ) : (
                                  <Badge variant="warning">Pending</Badge>
                                )}
                              </td>
                              <td className="py-2 pr-4 font-mono text-[11px] leading-snug text-zinc-400 whitespace-nowrap">
                                {formatDateTimeUtc(row.createdAt)}
                              </td>
                              <td className="py-2 pr-4 font-mono text-[11px] leading-snug text-zinc-400 whitespace-nowrap">
                                {row.verifiedAt
                                  ? formatDateTimeUtc(row.verifiedAt)
                                  : "—"}
                              </td>
                              <td className="py-2 pr-4 tabular-nums text-zinc-300">
                                {row.referralsMade}
                              </td>
                              <td className="py-2 font-mono text-xs text-zinc-500">
                                {row.referralCode}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!signups ? (
                        <p className="mt-4 text-sm text-zinc-500">Loading table…</p>
                      ) : null}
                      {signups && signups.items.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-500">
                          No rows for this filter.
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums text-white">
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-zinc-500">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

function MobileAnalyticsTabs({
  active,
  onNavigate,
}: {
  active: AnalyticsNavId;
  onNavigate: (id: AnalyticsNavId) => void;
}) {
  const items: { id: AnalyticsNavId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "trends", label: "Trends" },
    { id: "referrals", label: "Referrals" },
    { id: "signups", label: "Signups" },
  ];
  return (
    <nav
      aria-label="Analytics sections"
      className="-mx-3 flex gap-1 overflow-x-auto border-b border-zinc-800 px-3 pb-2 sm:-mx-4 sm:px-4 md:hidden"
    >
      {items.map(({ id, label }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (selected
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200")
            }
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
