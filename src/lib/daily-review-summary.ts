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

/** One manual trade attempt (one execution_request). Every numeric field is
 *  null when it was not measured; the UI renders null as "not measured". */
export type AttemptOutcome = "success" | "failed" | "unknown" | "pending" | "rejected";

export type ManualTradeRow = {
  at: string;
  userId: string;
  side: string;
  mint: string | null;
  amountSol: number | null;
  outcome: AttemptOutcome;
  reason: string | null;
  detail: string | null;
  venue: string | null;
  rails: string[];
  firstAcceptedRail: string | null;
  clickToSignMs: number | null;
  signToSubmitMs: number | null;
  submitToConfirmMs: number | null;
  totalMs: number | null;
  landedSlot: number | null;
  slotsToLand: number | null;
  cuConsumed: number | null;
  cuPriceMicroLamports: number | null;
  slippageBps: number | null;
  signature: string | null;
};

export type RequestInput = {
  at: string;
  finishedAt: string | null;
  userId: string;
  side: string;
  mint: string | null;
  status: string;
};

export type EventInput = {
  kind: string;
  at: string;
  signature: string | null;
  rail: string | null;
  errorKind: string | null;
  detail: string | null;
  data: Record<string, unknown> | null;
};

/** exec_attempt columns joined by signature. Timestamps are ISO strings. */
export type AttemptInput = {
  venue: string | null;
  tClick: string | null;
  tSigned: string | null;
  tSent: string | null;
  tConfirmed: string | null;
  landedSlot: number | null;
  /** exec_attempt.sent_slot (TRE-10167). null until that column exists. */
  sentSlot: number | null;
  cuConsumed: number | null;
  cuPriceMicroLamports: number | null;
  slippageBps: number | null;
};

const WSOL = "So11111111111111111111111111111111111111112";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function gapMs(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const d = Date.parse(to) - Date.parse(from);
  return Number.isFinite(d) && d >= 0 ? d : null;
}

function lastOf(events: EventInput[], kinds: string[]): EventInput | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (kinds.includes(events[i].kind)) return events[i];
  }
  return undefined;
}

function firstOf(events: EventInput[], kinds: string[]): EventInput | undefined {
  return events.find((e) => kinds.includes(e.kind));
}

function solAmount(events: EventInput[]): number | null {
  for (const kind of ["receipt_read", "confirmed", "requested"]) {
    const d = lastOf(events, [kind])?.data;
    if (!d) continue;
    const input = str(d.input_mint);
    const output = str(d.output_mint);
    const raw =
      input === WSOL
        ? num(d.input_amount_raw)
        : output === WSOL
          ? num(d.output_amount_raw)
          : null;
    if (raw !== null) return raw / 1e9;
  }
  return null;
}

/** Pure row builder. Events must be ordered by sequence. Success-side columns
 *  come from the exec_attempt when it matched; otherwise from the events. */
export function buildManualTradeRow(
  req: RequestInput,
  events: EventInput[],
  attempt: AttemptInput | null,
): ManualTradeRow {
  const sentEvent = firstOf(events, ["provider_submitted"]);
  const outcome: AttemptOutcome =
    req.status === "confirmed"
      ? "success"
      : req.status === "unknown"
        ? "unknown"
        : req.status === "failed"
          ? // Failed with no provider submission = refused before it was sent.
            sentEvent
            ? "failed"
            : "rejected"
          : "pending";

  const requested = firstOf(events, ["requested"]);
  const signed = firstOf(events, ["signed"]);
  const confirmEvent = lastOf(events, ["transaction_confirmed", "confirmed_failure"]);

  const tClick = attempt?.tClick ?? requested?.at ?? req.at;
  const tSigned = attempt?.tSigned ?? signed?.at ?? null;
  const tSent = attempt?.tSent ?? sentEvent?.at ?? null;
  const tConfirmed = attempt?.tConfirmed ?? confirmEvent?.at ?? null;

  const errEvent = lastOf(events, ["confirmed_failure", "failed", "unknown"]);
  const errored = [...events].reverse().find((e) => e.errorKind || e.detail);
  const reason =
    outcome === "success" ? null : (errored?.errorKind ?? errEvent?.errorKind ?? null);

  const receipt = lastOf(events, ["receipt_read", "confirmed"])?.data;
  const timeline =
    receipt && typeof receipt.timeline === "object" && receipt.timeline
      ? (receipt.timeline as Record<string, unknown>)
      : null;
  const landedSlot =
    attempt?.landedSlot ??
    num(confirmEvent?.data?.landed_slot) ??
    num(confirmEvent?.data?.slot) ??
    num(timeline?.landed_slot);
  const sentSlot = attempt?.sentSlot ?? num(timeline?.submitted_slot);
  const slotsToLand =
    landedSlot !== null && sentSlot !== null && landedSlot >= sentSlot
      ? landedSlot - sentSlot
      : num(timeline?.slots_to_land);

  const rails: string[] = [];
  for (const e of events) {
    if (
      (e.kind === "provider_submitted" || e.kind === "provider_accepted") &&
      e.rail &&
      !rails.includes(e.rail)
    ) {
      rails.push(e.rail);
    }
  }

  return {
    at: req.at,
    userId: req.userId,
    side: req.side,
    mint: req.mint,
    amountSol: solAmount(events),
    outcome,
    reason: outcome === "success" ? null : (reason ?? "not recorded"),
    detail: outcome === "success" ? null : (errored?.detail ?? null),
    venue:
      attempt?.venue ?? str(firstOf(events, ["plan"])?.data?.venue) ?? null,
    rails,
    firstAcceptedRail: firstOf(events, ["provider_accepted"])?.rail ?? null,
    clickToSignMs: gapMs(tClick, tSigned),
    signToSubmitMs: gapMs(tSigned, tSent),
    submitToConfirmMs: gapMs(tSent, tConfirmed),
    totalMs: gapMs(tClick, tConfirmed),
    landedSlot,
    slotsToLand,
    cuConsumed: attempt?.cuConsumed ?? null,
    cuPriceMicroLamports: attempt?.cuPriceMicroLamports ?? null,
    slippageBps: attempt?.slippageBps ?? null,
    signature:
      attempt === null
        ? (lastOf(events, ["signed"])?.signature ??
          [...events].reverse().find((e) => e.signature)?.signature ??
          null)
        : ([...events].reverse().find((e) => e.signature)?.signature ?? null),
  };
}

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
      /** Every manual attempt in the window, newest first (TRE-10168). */
      attempts: ManualTradeRow[];
      attemptsTruncated: boolean;
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

const MAX_FAILED_TRADES_IN_REPORT = 50;
const MAX_SLOWEST_IN_REPORT = 10;
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

  const slowest = [...trades.attempts]
    .filter((a) => a.totalMs !== null)
    .sort((a, b) => (b.totalMs ?? 0) - (a.totalMs ?? 0))
    .slice(0, MAX_SLOWEST_IN_REPORT);
  const byOutcome = new Map<string, number>();
  for (const a of trades.attempts) {
    byOutcome.set(a.outcome, (byOutcome.get(a.outcome) ?? 0) + 1);
  }
  const perTx: Block = {
    title: "Per-transaction view",
    lines: [
      {
        text: `${trades.attempts.length} attempts${trades.attemptsTruncated ? " (capped)" : ""}: ${["success", "failed", "rejected", "unknown", "pending"].map((o) => `${byOutcome.get(o) ?? 0} ${o}`).join(", ")}`,
      },
      ...(slowest.length === 0
        ? [{ text: `Slowest: ${NOT_MEASURED}` }]
        : slowest.map((a) => ({
            text: `Slow ${formatMs(a.totalMs ?? 0)} ${a.at.slice(11, 16)} UTC ${a.side} ${a.outcome} user ${shortId(a.userId)}`,
            link: a.signature
              ? { url: solscanTxUrl(a.signature), label: "tx" }
              : undefined,
          }))),
    ],
  };

  return [summary, reasons, latency, failed, perTx];
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
