"use client";

import { useState } from "react";

import { Badge } from "@/src/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

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
  /** Present only when the requested range is a single UTC day. 24 entries
     keyed `YYYY-MM-DDTHH`. */
  hourlySplit?: Array<{ date: string; referred: number; organic: number }>;
};

type Props = {
  data: ReferralsPayload | null;
  loading: boolean;
};

function emailInitial(email: string): string {
  const ch = email.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

function formatJoinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Leaderboard table for the Top referrers section. Sticky header, ranked #,
   compact avatar circle. Collapsed to top 5 by default; "View all" expands.
   The Top referrers row counts referrals across all time — the range picker
   isn't shown on this section. */
export function ReferrersStrip({ data, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading && !data) {
    return <ReferrersTableSkeleton />;
  }

  if (!data || data.topReferrers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top referrers</CardTitle>
          <CardDescription>
            No one has referred a signup yet. The leaderboard will appear here
            once referrals come in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const visible = expanded ? data.topReferrers : data.topReferrers.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Top referrers</CardTitle>
          <CardDescription>
            By total referrals on record. Showing {visible.length} of{" "}
            {data.topReferrers.length}.
          </CardDescription>
        </div>
        {data.topReferrers.length > 5 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
          >
            {expanded ? "Collapse" : "View all"}
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-black/85 backdrop-blur">
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/45">
                <th className="w-12 py-2.5 pl-4 pr-2 text-center font-medium">
                  #
                </th>
                <th className="py-2.5 pr-4 font-medium">Referrer</th>
                <th className="py-2.5 pr-4 text-right font-medium">
                  Referrals
                </th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Code</th>
                <th className="py-2.5 pr-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.04] text-white/80"
                >
                  <td className="py-3 pl-4 pr-2 text-center font-mono text-xs tabular-nums text-white/55">
                    {idx + 1}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-white/85"
                      >
                        {emailInitial(r.email)}
                      </div>
                      <span
                        className="truncate font-mono text-[12.5px] text-white/90"
                        title={r.email}
                      >
                        {r.email}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-mono text-base tabular-nums text-white">
                      {r.referralsMade}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {r.isVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-white/45">
                    {r.referralCode}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11px] whitespace-nowrap text-white/45">
                    {formatJoinedDate(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferrersTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/45">
                <th className="w-12 py-2.5 pl-4 pr-2 text-center font-medium">
                  #
                </th>
                <th className="py-2.5 pr-4 font-medium">Referrer</th>
                <th className="py-2.5 pr-4 text-right font-medium">
                  Referrals
                </th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Code</th>
                <th className="py-2.5 pr-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="py-3 pl-4 pr-2 text-center">
                    <Skeleton className="mx-auto h-3 w-3" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-3 w-40 max-w-full" />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="ml-auto h-4 w-6" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-3 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
