// Unit tests for the Daily Review report builder (TRE-10015).
// Run: pnpm test   (tsx --test, Node's built-in runner; no DB needed)

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDailyReviewReport,
  healthGroupOf,
  seriesStats,
  type DailyReview,
} from "./daily-review-summary";

const PAGE = "https://docs.trenchers.ai/analytics";

function review(over: Partial<DailyReview> = {}): DailyReview {
  return {
    windowStart: "2026-11-16T01:30:00.000Z",
    windowEnd: "2026-11-17T01:30:00.000Z",
    generatedAt: "2026-11-17T01:30:02.000Z",
    trades: {
      state: "ok",
      totals: { success: 40, failed: 3, unknown: 2, pending: 1, rejectedAttempts: 1 },
      byHour: [],
      reasons: [
        { reason: "insufficient_balance", count: 2 },
        { reason: "unknown outcome (jito)", count: 2 },
        { reason: "order_not_fillable", count: 1 },
      ],
      latency: [{ stage: "click_to_confirm", samples: 40, p50Ms: 1200, p95Ms: 3400 }],
      failedTrades: [
        {
          at: "2026-11-16T14:05:09.000Z",
          userId: "0b6f1c2e-1111-2222-3333-444455556666",
          side: "sell",
          mint: "Mint1",
          status: "failed",
          reason: "insufficient_balance",
          detail: "balance <0.01 SOL",
          signature: "5igSig",
        },
      ],
      failedTradesTruncated: false,
    },
    health: {
      state: "ok",
      generatedAt: "2026-11-17T01:30:01.000Z",
      series: [
        { name: "rt_client_stalls_total", unit: "count", points: [[1, 2], [2, 7], [3, 4]] },
        { name: "indexer_lag_seconds", unit: "s", points: [] },
      ],
    },
    ...over,
  };
}

test("counts, success rate, reasons and latency reach every channel", () => {
  const r = buildDailyReviewReport(review(), PAGE);
  assert.equal(r.subject, "Daily review 2026-11-17: 3 failed, 2 unknown of 46 manual trades");
  for (const body of [r.text, r.slackText]) {
    assert.match(body, /46 total: 40 success, 3 failed, 2 unknown, 1 in flight/);
    assert.match(body, /Success rate \(finished trades\): 88\.9%/);
    assert.match(body, /insufficient_balance: 2/);
    assert.match(body, /click_to_confirm: 1\.20 s \/ 3\.40 s \(40 samples\)/);
    assert.match(body, /14:05 UTC sell failed user 0b6f1c2e\.\.\.: insufficient_balance/);
  }
  assert.ok(r.text.includes("https://solscan.io/tx/5igSig"));
  assert.ok(r.slackText.includes("<https://solscan.io/tx/5igSig|tx>"));
  assert.ok(r.html.includes(`href="${PAGE}"`));
  assert.ok(r.slackText.includes(`<${PAGE}|Open the Daily Review page>`));
});

test("missing data renders as 'not measured', never as 0", () => {
  const r = buildDailyReviewReport(
    review({
      trades: { state: "not_measured", reason: "trading database query failed" },
      health: { state: "not_measured", reason: "metrics endpoint not deployed yet" },
    }),
    PAGE,
  );
  assert.equal(r.subject, "Daily review 2026-11-17: not measured");
  assert.match(r.text, /not measured \(trading database query failed\)/);
  assert.match(r.text, /not measured \(metrics endpoint not deployed yet\)/);
  assert.doesNotMatch(r.text, /\b0 total\b/);
});

test("health groups: empty series and empty groups are 'not measured'", () => {
  const r = buildDailyReviewReport(review(), PAGE);
  assert.match(r.text, /rt_client_stalls_total: latest 4 count, max 7 count/);
  assert.match(r.text, /indexer_lag_seconds: not measured/);
  // No ClickHouse series at all in the response.
  assert.match(r.text, /ClickHouse\n {2}- not measured/);
  assert.equal(seriesStats({ name: "x", unit: "", points: [] }), null);
  assert.equal(healthGroupOf("rt_client_price_stale_seconds"), "browser");
  assert.equal(healthGroupOf("clickhouse_query_p95_seconds"), "clickhouse");
  assert.equal(healthGroupOf("manual_trades_by_outcome_failed"), "manual");
  assert.equal(healthGroupOf("manual_p95_click_to_confirm_s"), "manual");
  assert.equal(healthGroupOf("pod_restarts"), "platform");
});

test("HTML and Slack output escape user-controlled text", () => {
  const base = review();
  if (base.trades.state !== "ok") throw new Error("fixture");
  base.trades.reasons = [{ reason: "<script>x</script> & co", count: 1 }];
  const r = buildDailyReviewReport(base, PAGE);
  assert.ok(!r.html.includes("<script>"));
  assert.ok(r.html.includes("&lt;script&gt;x&lt;/script&gt; &amp; co"));
  assert.ok(r.slackText.includes("&lt;script&gt;x&lt;/script&gt; &amp; co"));
});

test("no em-dash anywhere in the output", () => {
  const r = buildDailyReviewReport(review(), PAGE);
  for (const body of [r.subject, r.text, r.html, r.slackText]) {
    assert.ok(!body.includes("\u2014"));
  }
});
