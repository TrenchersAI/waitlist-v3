"use client";

import { useCallback, useEffect, useState } from "react";

import type { FalconClaimStats } from "@/src/app/api/analytics/falcon-claim/route";

const pct = (v: number | null, digits = 2) =>
  v == null ? "—" : `${(v * 100).toFixed(digits)}%`;
const num = (n: number) => n.toLocaleString("en-US");

/// A single figure. `tone` colours only the two numbers that can mean trouble,
/// so a healthy board is monochrome and a problem is the one thing that is not.
function Stat({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "plain" | "good" | "warn" | "bad";
}) {
  const colour =
    tone === "bad"
      ? "text-rose-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "good"
          ? "text-emerald-400"
          : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] tracking-wide text-white/45 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colour}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/40">{sub}</div> : null}
    </div>
  );
}

/// One bar. The send is long-running, so progress is a live number rather than
/// a historical one and deserves to be the first thing on the page.
function Bar({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "emerald" }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-indigo-500"}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export function FalconClaimContent() {
  const [data, setData] = useState<FalconClaimStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/falcon-claim", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json())?.message ?? `HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polled, because a send in flight changes underneath the reader. 30s is
  // slower than a batch (~2 min), so the numbers always move between refreshes
  // without hammering two databases.
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return <div className="p-6 text-sm text-white/50">Loading Falcon claim analytics…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-rose-400">Could not load: {error}</div>;
  }
  if (!data) return null;

  const { send, claim, unmeasured } = data;
  const bounceTone =
    send.bounceRate != null && send.bounceRate > send.bounceLimit
      ? "bad"
      : send.bounceRate != null && send.bounceRate > send.bounceLimit / 2
        ? "warn"
        : "good";
  const complaintTone =
    send.complaintRate != null && send.complaintRate > send.complaintLimit
      ? "bad"
      : send.complaintRate != null && send.complaintRate > send.complaintLimit / 2
        ? "warn"
        : "good";

  return (
    <div className="space-y-8 p-1">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold text-white">Send progress</h2>
          <span className="text-xs text-white/40">
            {num(send.mailed)} of {num(send.listTotal)} · {pct(send.progress, 1)}
          </span>
        </div>
        <Bar value={send.progress} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Mailed" value={num(send.mailed)} />
          <Stat label="Still to send" value={num(send.pending)} />
          <Stat
            label="Unmailable"
            value={num(send.unmailable)}
            sub="malformed or reserved domain"
          />
          <Stat label="List size" value={num(send.listTotal)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">Deliverability</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Delivered"
            value={pct(send.deliveryRate)}
            sub={`${num(send.delivered)} confirmed`}
            tone="good"
          />
          <Stat
            label="Bounced"
            value={pct(send.bounceRate)}
            sub={`${num(send.bounced)} · aborts at ${pct(send.bounceLimit, 0)}`}
            tone={bounceTone}
          />
          <Stat
            label="Complaints"
            value={pct(send.complaintRate, 3)}
            sub={`${num(send.complained)} · aborts at ${pct(send.complaintLimit, 1)}`}
            tone={complaintTone}
          />
          <Stat
            label="Suppressed"
            value={num(send.suppressed)}
            sub="never left, costs nothing"
          />
        </div>
        <p className="text-xs leading-relaxed text-white/40">
          Delivery confirmations arrive by webhook a little behind the send, so
          while a run is in flight this rate reads low and catches up. Bounce and
          complaint rates are the two the sender itself watches: it re-reads them
          before every batch and stops the run if either crosses its limit.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">Did it work?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Claimed Falcon"
            value={num(claim.mailedClaimed)}
            sub={`${pct(claim.claimRateOfMailed, 2)} of everyone mailed`}
          />
          <Stat
            label="Claim rate"
            value={pct(claim.claimRateOfAccounts, 1)}
            sub="of those who COULD claim today"
          />
          <Stat
            label="Have an account"
            value={num(claim.mailedWithAccount)}
            sub={`${pct(claim.accountRate, 1)} of mailed`}
          />
          <Stat
            label="Claimed, all time"
            value={num(claim.claimedTotal)}
            sub={`of ${num(claim.grantsTotal)} grants`}
          />
        </div>
        <p className="text-xs leading-relaxed text-white/40">
          <strong className="text-white/60">Claim rate is the number that matters.</strong>{" "}
          Most of this list has never signed up, and someone with no account
          cannot claim in one click — they have to sign up first, which is a far
          bigger ask than the mail makes. Measuring claims against everyone
          mailed therefore understates the mail; measuring against people who
          already have an account is what tells you whether the copy worked.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">Not measured</h2>
        <div className="space-y-2">
          {unmeasured.map((u) => (
            <div
              key={u.metric}
              className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3"
            >
              <div className="text-sm font-medium text-amber-300/90">{u.metric}</div>
              <div className="mt-1 text-xs leading-relaxed text-white/50">{u.reason}</div>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-white/40">
          Shown as unavailable rather than as zero on purpose. A zero beside a
          real metric reads as &ldquo;nobody did this&rdquo; when the truth is
          &ldquo;we did not measure it&rdquo;, and that difference changes what
          you would do next. The claim count above is the honest substitute:
          someone who claims necessarily received, opened and acted on the mail.
        </p>
      </section>

      <div className="text-[11px] text-white/25">
        Updated {new Date(data.generatedAt).toLocaleTimeString()} · refreshes every 30s
      </div>
    </div>
  );
}
