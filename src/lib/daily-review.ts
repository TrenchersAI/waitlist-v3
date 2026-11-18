// =============================================================================
// daily-review: data for the Daily Review page and the 07:00 IST report
// =============================================================================
//
// TRE-10014 / TRE-10015 (parent TRE-10008). Two sources:
//
//   1. Manual trades from the trenchers prod Postgres (`trenchers-db.ts`).
//      Manual = `bot_id IS NULL`. Tables:
//        execution_request  one row per trade click, status confirmed|failed|unknown
//        execution_event    per-request timeline (kind, error_kind, detail, signature)
//        exec_attempt       per-attempt timings (`stage_ms.stages[]`, t_click..t_confirmed)
//      Every query is bounded by the time window AND a LIMIT, and walks an index:
//        execution_request_retention (started_at, id)
//        execution_event_execution_id_sequence_key (execution_id, sequence)
//        exec_attempt_user_created_idx (user_id, created_at DESC)
//      exec_attempt has no created_at-only index, so it is reached through the
//      users who made a manual request in the window (verified with EXPLAIN on
//      prod, 2026-11-17: index scans only).
//
//   2. Health series from st-api `GET /admin/daily-review/metrics?hours=24`
//      (OPS_SERVICE_TOKEN, `X-Ops-Token`, same as `/admin/whitelist*`). Fetched
//      server-side only, so the token never reaches the browser. 404 / 503 /
//      timeout / bad body => "not measured", never zeros.

import { unstable_cache } from "next/cache";

import {
  type DailyReview,
  type FailedTrade,
  type EventInput,
  type AttemptInput,
  type ManualTradeRow,
  buildManualTradeRow,
  type FailureReason,
  type HealthSection,
  type HealthSeries,
  type HourBucket,
  type StageLatency,
  type TradeTotals,
  type TradesSection,
} from "@/src/lib/daily-review-summary";
import { getTrenchersPool } from "@/src/lib/trenchers-db";

export const DAILY_REVIEW_HOURS = 24;

/** Row caps. The prod baseline is ~60 manual trades a day, so these are far
 *  above normal and only stop a pathological day from loading unbounded. */
const MAX_HOUR_ROWS = 25 * 8; // up to 25 hour buckets x a few statuses
const MAX_FAILED_ROWS = 500;
const MAX_MANUAL_USERS = 2_000;
const MAX_ATTEMPTS = 5_000;
const MAX_STAGES = 40;
const MAX_ATTEMPT_ROWS = 500;
const MAX_ATTEMPT_EVENTS = 20_000;

/** TRE-10167 adds exec_attempt.sent_slot. Flip to true once that migration is
 *  on prod; until then the column is not selected, so the query cannot break
 *  and slots to land falls back to the receipt_read timeline or "not measured". */
const EXEC_ATTEMPT_HAS_SENT_SLOT = false;
const DETAIL_MAX_CHARS = 240;
const HEALTH_TIMEOUT_MS = 8_000;
const MAX_HEALTH_SERIES = 100;
const MAX_POINTS_PER_SERIES = 2_000;

export type ReviewWindow = { start: Date; end: Date };

export function lastHoursWindow(
  hours = DAILY_REVIEW_HOURS,
  now = new Date(),
): ReviewWindow {
  return { start: new Date(now.getTime() - hours * 3_600_000), end: now };
}

// -----------------------------------------------------------------------------
// Manual trades (prod Postgres)
// -----------------------------------------------------------------------------

function outcomeOf(status: string): keyof Omit<HourBucket, "hour"> {
  if (status === "confirmed") return "success";
  if (status === "failed") return "failed";
  if (status === "unknown") return "unknown";
  return "pending";
}

/** All 24 hour slots, so an hour with no trades shows a measured 0. */
function emptyHours(w: ReviewWindow): HourBucket[] {
  const out: HourBucket[] = [];
  const first = new Date(w.start);
  first.setUTCMinutes(0, 0, 0);
  for (let t = first.getTime(); t < w.end.getTime(); t += 3_600_000) {
    out.push({
      hour: new Date(t).toISOString(),
      success: 0,
      failed: 0,
      unknown: 0,
      pending: 0,
    });
  }
  return out;
}

type HourRow = { hour: Date; status: string; n: string };
type FailedRow = {
  id: string;
  user_id: string;
  side: string;
  mint: string | null;
  started_at: Date;
  status: string;
  error_kind: string | null;
  kind: string | null;
  detail: string | null;
  signature: string | null;
};
type LatencyRow = { stage: string; samples: string; p50: number; p95: number };

const HOURLY_SQL = `
  SELECT date_trunc('hour', started_at) AS hour, status, count(*)::text AS n
  FROM execution_request
  WHERE started_at >= $1 AND started_at < $2 AND bot_id IS NULL
  GROUP BY 1, 2
  ORDER BY 1
  LIMIT ${MAX_HOUR_ROWS}`;

// Latest event with an error for each failed/unknown request, plus the latest
// signature it recorded (the Solscan link).
const FAILED_SQL = `
  WITH r AS (
    SELECT id, user_id, side, mint, started_at, status
    FROM execution_request
    WHERE started_at >= $1 AND started_at < $2 AND bot_id IS NULL
      AND status IN ('failed', 'unknown')
    ORDER BY started_at DESC
    LIMIT ${MAX_FAILED_ROWS + 1}
  )
  SELECT r.id, r.user_id::text AS user_id, r.side, r.mint, r.started_at, r.status,
         ev.error_kind, ev.kind, left(ev.detail, ${DETAIL_MAX_CHARS}) AS detail,
         sig.signature
  FROM r
  LEFT JOIN LATERAL (
    SELECT e.error_kind, e.kind, e.detail
    FROM execution_event e
    WHERE e.execution_id = r.id
      AND (e.error_kind IS NOT NULL OR e.detail IS NOT NULL)
    ORDER BY e.sequence DESC
    LIMIT 1
  ) ev ON true
  LEFT JOIN LATERAL (
    SELECT e.signature
    FROM execution_event e
    WHERE e.execution_id = r.id AND e.signature IS NOT NULL
    ORDER BY e.sequence DESC
    LIMIT 1
  ) sig ON true
  ORDER BY r.started_at DESC`;

// One row per manual request (execution_request_retention index on started_at),
// left-joined to exec_attempt by the request's signature (partial index on
// signature). Failed requests have no exec_attempt, so they keep NULL columns.
const ATTEMPTS_SQL = `
  WITH r AS (
    SELECT id, user_id, side, mint, started_at, finished_at, status
    FROM execution_request
    WHERE started_at >= $1 AND started_at < $2 AND bot_id IS NULL
    ORDER BY started_at DESC
    LIMIT ${MAX_ATTEMPT_ROWS + 1}
  )
  SELECT r.id::text AS id, r.user_id::text AS user_id, r.side, r.mint,
         r.started_at, r.finished_at, r.status,
         a.quote_venue, a.t_click, a.t_signed, a.t_sent, a.t_confirmed,
         a.landed_slot, ${EXEC_ATTEMPT_HAS_SENT_SLOT ? "a.sent_slot" : "NULL::bigint AS sent_slot"},
         a.cu_consumed, a.cu_price_micro_lamports, a.slip_vs_quote_bps
  FROM r
  LEFT JOIN LATERAL (
    SELECT x.quote_venue, x.t_click, x.t_signed, x.t_sent, x.t_confirmed,
           x.landed_slot, ${EXEC_ATTEMPT_HAS_SENT_SLOT ? "x.sent_slot," : ""}
           x.cu_consumed, x.cu_price_micro_lamports, x.slip_vs_quote_bps
    FROM exec_attempt x
    WHERE x.signature IN (
      SELECT e.signature FROM execution_event e
      WHERE e.execution_id = r.id AND e.signature IS NOT NULL)
    ORDER BY x.created_at DESC
    LIMIT 1
  ) a ON true
  ORDER BY r.started_at DESC`;

const ATTEMPT_EVENTS_SQL = `
  SELECT e.execution_id::text AS execution_id, e.kind, e.at, e.signature, e.rail,
         e.error_kind, left(e.detail, ${DETAIL_MAX_CHARS}) AS detail,
         CASE WHEN e.kind IN ('requested', 'plan', 'receipt_read', 'confirmed',
                              'transaction_confirmed', 'confirmed_failure')
              THEN e.data END AS data
  FROM execution_event e
  WHERE e.execution_id::text = ANY($1::text[])
  ORDER BY e.execution_id, e.sequence
  LIMIT ${MAX_ATTEMPT_EVENTS}`;

type AttemptSqlRow = {
  id: string;
  user_id: string;
  side: string;
  mint: string | null;
  started_at: Date;
  finished_at: Date | null;
  status: string;
  quote_venue: string | null;
  t_click: Date | null;
  t_signed: Date | null;
  t_sent: Date | null;
  t_confirmed: Date | null;
  landed_slot: string | number | null;
  sent_slot: string | number | null;
  cu_consumed: string | number | null;
  cu_price_micro_lamports: string | number | null;
  slip_vs_quote_bps: string | number | null;
};
type EventSqlRow = {
  execution_id: string;
  kind: string;
  at: Date;
  signature: string | null;
  rail: string | null;
  error_kind: string | null;
  detail: string | null;
  data: Record<string, unknown> | null;
};

const iso = (d: Date | null): string | null => (d ? new Date(d).toISOString() : null);
const n = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;

async function loadAttempts(
  pool: NonNullable<ReturnType<typeof getTrenchersPool>>,
  params: string[],
): Promise<{ rows: ManualTradeRow[]; truncated: boolean }> {
  const reqs = await pool.query<AttemptSqlRow>(ATTEMPTS_SQL, params);
  const truncated = reqs.rows.length > MAX_ATTEMPT_ROWS;
  const kept = reqs.rows.slice(0, MAX_ATTEMPT_ROWS);
  const byId = new Map<string, EventInput[]>();
  if (kept.length > 0) {
    const ev = await pool.query<EventSqlRow>(ATTEMPT_EVENTS_SQL, [
      kept.map((r) => r.id),
    ]);
    for (const e of ev.rows) {
      const list = byId.get(e.execution_id) ?? [];
      list.push({
        kind: e.kind,
        at: new Date(e.at).toISOString(),
        signature: e.signature,
        rail: e.rail,
        errorKind: e.error_kind,
        detail: e.detail,
        data: e.data && typeof e.data === "object" ? e.data : null,
      });
      byId.set(e.execution_id, list);
    }
  }
  const rows = kept.map((r) => {
    const matched = r.t_click !== null || r.t_confirmed !== null || r.landed_slot !== null || r.quote_venue !== null || r.cu_consumed !== null;
    const attempt: AttemptInput | null = matched
      ? {
          venue: r.quote_venue,
          tClick: iso(r.t_click),
          tSigned: iso(r.t_signed),
          tSent: iso(r.t_sent),
          tConfirmed: iso(r.t_confirmed),
          landedSlot: n(r.landed_slot),
          sentSlot: n(r.sent_slot),
          cuConsumed: n(r.cu_consumed),
          cuPriceMicroLamports: n(r.cu_price_micro_lamports),
          slippageBps: n(r.slip_vs_quote_bps),
        }
      : null;
    return buildManualTradeRow(
      {
        at: new Date(r.started_at).toISOString(),
        finishedAt: iso(r.finished_at),
        userId: r.user_id,
        side: r.side,
        mint: r.mint,
        status: r.status,
      },
      byId.get(r.id) ?? [],
      attempt,
    );
  });
  return { rows, truncated };
}

// Users with a manual request in the window: the index path into exec_attempt.
const MANUAL_USERS_CTE = `
  u AS (
    SELECT DISTINCT user_id FROM execution_request
    WHERE started_at >= $1 AND started_at < $2 AND bot_id IS NULL
    LIMIT ${MAX_MANUAL_USERS}
  ),
  a AS (
    SELECT outcome, stage_ms, t_click, t_confirmed
    FROM exec_attempt
    WHERE user_id IN (SELECT user_id FROM u)
      AND created_at >= $1 AND created_at < $2 AND bot_id IS NULL
    ORDER BY created_at DESC
    LIMIT ${MAX_ATTEMPTS}
  )`;

const REJECTED_SQL = `
  WITH ${MANUAL_USERS_CTE}
  SELECT count(*) FILTER (WHERE outcome = 'rejected')::text AS rejected FROM a`;

// Per-stage p50/p95 from `stage_ms.stages[] = {stage, ms}`, plus
// click_to_confirm from the attempt's own timestamps (shared-contract stage).
const LATENCY_SQL = `
  WITH ${MANUAL_USERS_CTE},
  samples AS (
    SELECT s->>'stage' AS stage, (s->>'ms')::float8 AS ms
    FROM a, jsonb_array_elements(
      CASE WHEN jsonb_typeof(a.stage_ms->'stages') = 'array'
           THEN a.stage_ms->'stages' ELSE '[]'::jsonb END) AS s
    WHERE jsonb_typeof(s->'ms') = 'number' AND s->>'stage' IS NOT NULL
    UNION ALL
    SELECT 'click_to_confirm',
           extract(epoch FROM (t_confirmed - t_click)) * 1000
    FROM a
    WHERE t_click IS NOT NULL AND t_confirmed IS NOT NULL AND t_confirmed >= t_click
  )
  SELECT stage, count(*)::text AS samples,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) AS p50,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) AS p95
  FROM samples
  GROUP BY stage
  ORDER BY (stage = 'click_to_confirm') DESC, p95 DESC
  LIMIT ${MAX_STAGES}`;

export async function loadManualTrades(w: ReviewWindow): Promise<TradesSection> {
  const pool = getTrenchersPool();
  if (!pool) {
    return { state: "not_measured", reason: "trading database not configured" };
  }
  const params = [w.start.toISOString(), w.end.toISOString()];
  try {
    const [hourly, failed, rejected, latency, attemptsRes] = await Promise.all([
      pool.query<HourRow>(HOURLY_SQL, params),
      pool.query<FailedRow>(FAILED_SQL, params),
      pool.query<{ rejected: string }>(REJECTED_SQL, params),
      pool.query<LatencyRow>(LATENCY_SQL, params),
      loadAttempts(pool, params),
    ]);

    const byHour = emptyHours(w);
    const index = new Map(byHour.map((b, i) => [b.hour, i]));
    const totals: TradeTotals = {
      success: 0,
      failed: 0,
      unknown: 0,
      pending: 0,
      rejectedAttempts: Number(rejected.rows[0]?.rejected ?? 0),
    };
    for (const row of hourly.rows) {
      const key = outcomeOf(row.status);
      const n = Number(row.n);
      totals[key] += n;
      const i = index.get(new Date(row.hour).toISOString());
      if (i !== undefined) byHour[i][key] += n;
    }

    const failedTradesTruncated = failed.rows.length > MAX_FAILED_ROWS;
    const failedTrades: FailedTrade[] = failed.rows
      .slice(0, MAX_FAILED_ROWS)
      .map((r) => ({
        at: new Date(r.started_at).toISOString(),
        userId: r.user_id,
        side: r.side,
        mint: r.mint,
        status: r.status === "unknown" ? "unknown" : "failed",
        reason: r.error_kind ?? "not recorded",
        detail: r.detail,
        signature: r.signature,
      }));

    const reasonCounts = new Map<string, number>();
    for (const f of failedTrades) {
      const key = f.status === "unknown" ? `unknown outcome (${f.reason})` : f.reason;
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
    const reasons: FailureReason[] = [...reasonCounts]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

    const stages: StageLatency[] = latency.rows.map((r) => ({
      stage: r.stage,
      samples: Number(r.samples),
      p50Ms: Number(r.p50),
      p95Ms: Number(r.p95),
    }));

    return {
      state: "ok",
      totals,
      byHour,
      reasons,
      latency: stages,
      failedTrades,
      failedTradesTruncated,
      attempts: attemptsRes.rows,
      attemptsTruncated: attemptsRes.truncated,
    };
  } catch (err) {
    console.error(
      "[daily-review] trade query failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return { state: "not_measured", reason: "trading database query failed" };
  }
}

// -----------------------------------------------------------------------------
// Health series (st-api)
// -----------------------------------------------------------------------------

function parseSeries(raw: unknown): HealthSeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !Array.isArray(r.points)) return null;
  const points: [number, number][] = [];
  for (const p of r.points.slice(0, MAX_POINTS_PER_SERIES)) {
    if (
      Array.isArray(p) &&
      p.length >= 2 &&
      typeof p[0] === "number" &&
      typeof p[1] === "number" &&
      Number.isFinite(p[0]) &&
      Number.isFinite(p[1])
    ) {
      points.push([p[0], p[1]]);
    }
  }
  return {
    name: r.name,
    unit: typeof r.unit === "string" ? r.unit : "",
    points,
  };
}

/** Validates the st-api body. Exported for the unit test. */
export function parseHealthResponse(body: unknown): HealthSection {
  if (!body || typeof body !== "object") {
    return { state: "not_measured", reason: "metrics endpoint returned no data" };
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.series)) {
    return { state: "not_measured", reason: "metrics endpoint returned an unexpected shape" };
  }
  const series = b.series
    .slice(0, MAX_HEALTH_SERIES)
    .map(parseSeries)
    .filter((s): s is HealthSeries => s !== null);
  return {
    state: "ok",
    generatedAt:
      typeof b.generated_at === "string" ? b.generated_at : new Date().toISOString(),
    series,
  };
}

export async function loadHealth(hours = DAILY_REVIEW_HOURS): Promise<HealthSection> {
  const baseUrl = (process.env.ST_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = process.env.OPS_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    return { state: "not_measured", reason: "metrics endpoint not configured" };
  }
  try {
    const res = await fetch(`${baseUrl}/admin/daily-review/metrics?hours=${hours}`, {
      headers: { "X-Ops-Token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (res.status === 404) {
      return { state: "not_measured", reason: "metrics endpoint not deployed yet" };
    }
    if (res.status === 503) {
      return { state: "not_measured", reason: "metrics backend unavailable" };
    }
    if (!res.ok) {
      return { state: "not_measured", reason: `metrics endpoint returned HTTP ${res.status}` };
    }
    return parseHealthResponse(await res.json());
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      state: "not_measured",
      reason: timedOut ? "metrics endpoint timed out" : "metrics endpoint unreachable",
    };
  }
}

// -----------------------------------------------------------------------------
// The whole review
// -----------------------------------------------------------------------------

/** Uncached build. The cron uses this so the report reads fresh data. */
export async function loadDailyReview(now = new Date()): Promise<DailyReview> {
  const w = lastHoursWindow(DAILY_REVIEW_HOURS, now);
  const [trades, health] = await Promise.all([loadManualTrades(w), loadHealth()]);
  return {
    windowStart: w.start.toISOString(),
    windowEnd: w.end.toISOString(),
    generatedAt: new Date().toISOString(),
    trades,
    health,
  };
}

/** Page build: a 60 s cache keeps repeated page loads off the prod DB. */
export const fetchDailyReview = unstable_cache(
  () => loadDailyReview(),
  ["daily-review"],
  { revalidate: 60 },
);
