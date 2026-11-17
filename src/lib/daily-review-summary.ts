// =============================================================================
// daily-review-summary: shared types + the pure report builder (TRE-10014/15)
// =============================================================================
//
// The Daily Review page (/analytics, "Daily review") and the 07:00 IST report
// (cron at 01:30 UTC) read the SAME `DailyReview` object, built by
// `loadDailyReview` in `daily-review.ts`. This file holds only the types and
// the pure text/HTML builder, with no imports, so the unit test can run it
// without a database, Next.js or path aliases.
//
// Honesty rule (TRE-10008 done criterion 6): a section that could not be read
// is `state: "not_measured"` and renders as "not measured", never as 0.

/** Outcome of one manual execution_request. `pending` = still in flight. */
export type TradeOutcome = "success" | "failed" | "unknown" | "pending";

export type HourBucket = {
  /** Start of the UTC hour, ISO 8601. */
  hour: string;
  success: number;
  failed: number;
  unknown: number;
  pending: number;
};

export type FailureReason = { reason: string; count: number };

export type StageLatency = {
  stage: string;
  samples: number;
  p50Ms: number;
  p95Ms: number;
};

export type FailedTrade = {
  at: string;
  userId: string;
  side: string;
  mint: string | null;
  status: "failed" | "unknown";
  /** Last recorded error_kind, or "not recorded". */
  reason: string;
  detail: string | null;
  signature: string | null;
};

export type TradeTotals = {
  success: number;
  failed: number;
  unknown: number;
  pending: number;
  /** exec_attempt rows with outcome = rejected. These are ALSO counted in
   *  `failed` (a rejected attempt ends its request as failed), so this is a
   *  breakdown, not an extra outcome. */
  rejectedAttempts: number;
};

export type TradesSection =
  | {
      state: "ok";
      totals: TradeTotals;
      byHour: HourBucket[];
      reasons: FailureReason[];
      latency: StageLatency[];
      failedTrades: FailedTrade[];
      /** True when the failed-trade list hit its row cap. */
      failedTradesTruncated: boolean;
    }
  | { state: "not_measured"; reason: string };

/** Response of st-api `GET /admin/daily-review/metrics?hours=24`. */
export type HealthMetricsResponse = {
  generated_at: string;
  series: HealthSeries[];
};

export type HealthSeries = {
  name: string;
  unit: string;
  /** [unix timestamp, value]. Seconds or milliseconds; see `pointTimeMs`. */
  points: [number, number][];
};

export type HealthGroup =
  | "manual"
  | "browser"
  | "indexer"
  | "clickhouse"
  | "platform";

export const HEALTH_GROUPS: ReadonlyArray<{ id: HealthGroup; label: string }> =
  [
    { id: "manual", label: "Manual trading (Prometheus)" },
    { id: "browser", label: "Browser" },
    { id: "indexer", label: "Indexer" },
    { id: "clickhouse", label: "ClickHouse" },
    { id: "platform", label: "Platform" },
  ];

export type HealthSection =
  | { state: "ok"; generatedAt: string; series: HealthSeries[] }
  | { state: "not_measured"; reason: string };

export type DailyReview = {
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  trades: TradesSection;
  health: HealthSection;
};

export const NOT_MEASURED = "not measured";

/** Which page section a health series belongs to, from its name. */
export function healthGroupOf(name: string): HealthGroup {
  const n = name.toLowerCase();
  // st-api /admin/daily-review/metrics names: manual_trades_by_outcome_*,
  // manual_failures_by_reason_*, manual_p50/p95_click_to_confirm_s.
  if (n.startsWith("manual_")) return "manual";
  if (n.startsWith("rt_client") || n.startsWith("browser")) return "browser";
  if (n.includes("indexer")) return "indexer";
  if (n.includes("clickhouse") || n.startsWith("ch_")) return "clickhouse";
  return "platform";
}

/** Points may arrive in seconds or milliseconds; normalise to ms. */
export function pointTimeMs(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

export type SeriesStats = { latest: number; max: number; samples: number };

/** Latest and max of a series, or null when it has no points (not measured). */
export function seriesStats(series: HealthSeries): SeriesStats | null {
  if (series.points.length === 0) return null;
  let latestTs = -Infinity;
  let latest = 0;
  let max = -Infinity;
  for (const [ts, v] of series.points) {
    if (ts >= latestTs) {
      latestTs = ts;
      latest = v;
    }
    if (v > max) max = v;
  }
  return { latest, max, samples: series.points.length };
}

export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return NOT_MEASURED;
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}...` : id;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Slack mrkdwn treats &, < and > as control characters. */
function escapeSlack(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// -----------------------------------------------------------------------------
// Report builder
// -----------------------------------------------------------------------------

/** One logical line of the report, rendered three ways (text, HTML, Slack). */
type Line = { text: string; link?: { url: string; label: string } };
type Block = { title: string; lines: Line[] };

export type DailyReviewReport = {
  subject: string;
  text: string;
  html: string;
  slackText: string;
};

const MAX_FAILED_TRADES_IN_REPORT = 10;
const MAX_REASONS_IN_REPORT = 5;

function tradeBlocks(trades: TradesSection): Block[] {
  if (trades.state === "not_measured") {
    return [
      {
        title: "Manual trades",
        lines: [{ text: `${NOT_MEASURED} (${trades.reason})` }],
      },
    ];
  }
  const t = trades.totals;
  const finished = t.success + t.failed + t.unknown;
  const total = finished + t.pending;
  const successRate =
    finished > 0 ? `${((t.success / finished) * 100).toFixed(1)}%` : "n/a";

  const summary: Block = {
    title: "Manual trades",
    lines: [
      {
        text: `${total} total: ${t.success} success, ${t.failed} failed, ${t.unknown} unknown, ${t.pending} in flight`,
      },
      { text: `Success rate (finished trades): ${successRate}` },
      { text: `Rejected before send (included in failed): ${t.rejectedAttempts}` },
    ],
  };

  const reasons: Block = {
    title: "Failures by reason",
    lines:
      trades.reasons.length === 0
        ? [{ text: "No failed or unknown trades" }]
        : trades.reasons
            .slice(0, MAX_REASONS_IN_REPORT)
            .map((r) => ({ text: `${r.reason}: ${r.count}` })),
  };

  const latency: Block = {
    title: "Stage latency (p50 / p95)",
    lines:
      trades.latency.length === 0
        ? [{ text: `${NOT_MEASURED} (no timed attempts in window)` }]
        : trades.latency.map((s) => ({
            text: `${s.stage}: ${formatMs(s.p50Ms)} / ${formatMs(s.p95Ms)} (${s.samples} samples)`,
          })),
  };

  const shown = trades.failedTrades.slice(0, MAX_FAILED_TRADES_IN_REPORT);
  const failed: Block = {
    title: "Failed and unknown trades",
    lines:
      shown.length === 0
        ? [{ text: "None" }]
        : shown.map((f) => ({
            text: `${f.at.slice(11, 16)} UTC ${f.side} ${f.status} user ${shortId(f.userId)}: ${f.reason}`,
            link: f.signature
              ? { url: solscanTxUrl(f.signature), label: "tx" }
              : undefined,
          })),
  };
  const more = trades.failedTrades.length - shown.length;
  if (more > 0 || trades.failedTradesTruncated) {
    failed.lines.push({
      text: trades.failedTradesTruncated
        ? `More rows not shown (list capped); see the page`
        : `${more} more on the page`,
    });
  }

  return [summary, reasons, latency, failed];
}

function healthBlocks(health: HealthSection): Block[] {
  if (health.state === "not_measured") {
    return [
      {
        title: "Platform health",
        lines: [{ text: `${NOT_MEASURED} (${health.reason})` }],
      },
    ];
  }
  return HEALTH_GROUPS.map(({ id, label }) => {
    const series = health.series.filter((s) => healthGroupOf(s.name) === id);
    return {
      title: label,
      lines:
        series.length === 0
          ? [{ text: NOT_MEASURED }]
          : series.map((s) => {
              const st = seriesStats(s);
              const unit = s.unit ? ` ${s.unit}` : "";
              return {
                text: st
                  ? `${s.name}: latest ${formatNumber(st.latest)}${unit}, max ${formatNumber(st.max)}${unit}`
                  : `${s.name}: ${NOT_MEASURED}`,
              };
            }),
    };
  });
}

function renderText(blocks: Block[], header: string, pageUrl: string): string {
  const out: string[] = [header, ""];
  for (const b of blocks) {
    out.push(b.title);
    for (const l of b.lines) {
      out.push(`  - ${l.text}${l.link ? ` ${l.link.url}` : ""}`);
    }
    out.push("");
  }
  out.push(`Full page: ${pageUrl}`);
  return out.join("\n");
}

function renderHtml(blocks: Block[], header: string, pageUrl: string): string {
  const parts: string[] = [
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#111;line-height:1.5">`,
    `<p style="margin:0 0 12px"><strong>${escapeHtml(header)}</strong></p>`,
  ];
  for (const b of blocks) {
    parts.push(`<h3 style="margin:16px 0 4px;font-size:14px">${escapeHtml(b.title)}</h3><ul style="margin:0;padding-left:18px">`);
    for (const l of b.lines) {
      const link = l.link
        ? ` <a href="${escapeHtml(l.link.url)}">${escapeHtml(l.link.label)}</a>`
        : "";
      parts.push(`<li>${escapeHtml(l.text)}${link}</li>`);
    }
    parts.push(`</ul>`);
  }
  parts.push(
    `<p style="margin:16px 0 0"><a href="${escapeHtml(pageUrl)}">Open the Daily Review page</a></p></div>`,
  );
  return parts.join("");
}

function renderSlack(blocks: Block[], header: string, pageUrl: string): string {
  const out: string[] = [`*${escapeSlack(header)}*`];
  for (const b of blocks) {
    out.push("", `*${escapeSlack(b.title)}*`);
    for (const l of b.lines) {
      const link = l.link ? ` <${l.link.url}|${escapeSlack(l.link.label)}>` : "";
      out.push(`- ${escapeSlack(l.text)}${link}`);
    }
  }
  out.push("", `<${pageUrl}|Open the Daily Review page>`);
  return out.join("\n");
}

/** Build the email + Slack report from the same object the page renders. */
export function buildDailyReviewReport(
  review: DailyReview,
  pageUrl: string,
): DailyReviewReport {
  const day = review.windowEnd.slice(0, 10);
  const header = `Manual trading daily review, ${review.windowStart.slice(0, 16).replace("T", " ")} to ${review.windowEnd.slice(0, 16).replace("T", " ")} UTC`;
  const blocks = [...tradeBlocks(review.trades), ...healthBlocks(review.health)];

  let subjectTail = NOT_MEASURED;
  if (review.trades.state === "ok") {
    const t = review.trades.totals;
    subjectTail = `${t.failed} failed, ${t.unknown} unknown of ${t.success + t.failed + t.unknown + t.pending} manual trades`;
  }

  return {
    subject: `Daily review ${day}: ${subjectTail}`,
    text: renderText(blocks, header, pageUrl),
    html: renderHtml(blocks, header, pageUrl),
    slackText: renderSlack(blocks, header, pageUrl),
  };
}
