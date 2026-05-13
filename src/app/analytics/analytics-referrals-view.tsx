"use client";

import { Badge } from "@/src/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

export type ReferralsPayload = {
  range: { from: string; to: string };
  stats: {
    referredCreatedInRange: number;
    referredVerifiedInRange: number;
    referrersInRange: number;
    avgReferralsPerReferrerInRange: number;
    allTimeReferred: number;
  };
  topReferrers: Array<{
    id: string;
    email: string;
    referralCode: string;
    referralsMade: number;
    isVerified: boolean;
    createdAt: string;
  }>;
  dailySplit: Array<{ date: string; referred: number; organic: number }>;
};

type Props = {
  data: ReferralsPayload | null;
  loading: boolean;
  rangeStarted: number | null;
  rangeVerified: number | null;
};

export function ReferralsView({
  data,
  loading,
  rangeStarted,
  rangeVerified,
}: Props) {
  if (loading && !data) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        Loading referral analytics…
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-zinc-500">
        Referral data will load when you open this tab. Set the date range in
        Overview if needed.
      </p>
    );
  }

  const { stats, topReferrers, dailySplit, range } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
            Referrals
          </p>
          <p className="text-sm text-zinc-400">
            Range {range.from} → {range.to} (UTC)
            {rangeStarted != null && rangeVerified != null ? (
              <span className="text-zinc-600">
                {" "}
                · signups in range: {rangeStarted} total / {rangeVerified} verified
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Referred signups (range)" value={stats.referredCreatedInRange} />
        <Stat label="Referred + verified (range)" value={stats.referredVerifiedInRange} />
        <Stat label="Active referrers (range)" value={stats.referrersInRange} />
        <Stat
          label="Avg referrals / referrer"
          value={stats.avgReferralsPerReferrerInRange.toFixed(2)}
        />
        <Stat label="All-time referred signups" value={stats.allTimeReferred} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
            <CardDescription>By total referrals made (all time).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 sm:px-4">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 text-right font-medium">Referrals</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/70 text-zinc-300">
                    <td className="max-w-[200px] truncate py-2 pr-3 font-mono text-xs">
                      {row.email}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-500">
                      {row.referralCode}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.referralsMade}</td>
                    <td className="py-2">
                      {row.isVerified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referred vs organic (daily)</CardTitle>
            <CardDescription>
              New subscribers in range with a referrer vs without (UTC days).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {dailySplit.map((row) => {
              const total = row.referred + row.organic;
              const max = Math.max(1, total);
              return (
                <div key={row.date} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{row.date}</span>
                    <span className="tabular-nums text-zinc-300">
                      {row.referred} ref · {row.organic} org
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-sky-500/80"
                      style={{ width: `${Math.round((row.referred / max) * 100)}%` }}
                    />
                    <div
                      className="h-full bg-zinc-600/90"
                      style={{ width: `${Math.round((row.organic / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums text-white">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
