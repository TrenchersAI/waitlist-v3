// Renders the beta invite and optionally sends it to explicit test
// addresses. Touches no BetaInvite rows and never reads the waitlist, so it
// cannot accidentally mail a real subscriber.
//
// Use this to (a) eyeball the copy, (b) check Gmail/Outlook/Yahoo tab
// placement with your own eyes, and (c) get a mail-tester.com score by
// passing its generated address.
//
//   pnpm exec tsx scripts/send-beta-test.ts --preview
//   pnpm exec tsx scripts/send-beta-test.ts --to you@gmail.com --send
//   pnpm exec tsx scripts/send-beta-test.ts --to a@x.com,b@y.com --send

import "dotenv/config";
import { writeFile } from "node:fs/promises";

import { Resend } from "resend";

import {
  BETA_INVITE_SUBJECT,
  buildBetaInviteHtml,
  buildBetaInviteText,
} from "../src/lib/email";
import { BETA_CAMPAIGN } from "../src/lib/beta-invite";
import { getTrenchersPool } from "../src/lib/trenchers-db";

/// Confirms each test recipient is actually on the terminal's
/// login_whitelist before we tell them their access is open.
///
/// The bulk sender already refuses to mail anyone without accessGrantedAt.
/// This script bypassed that because it deliberately touches no BetaInvite
/// rows, which meant it could happily send "your access is open" to someone
/// who would then hit a 403 and the "your spot is reserved" card. Same
/// promise, same check.
///
/// Returns null when TRENCHERS_DATABASE_URL is unset, which is a refusal to
/// guess rather than a pass.
async function checkBetaAccess(
  emails: string[],
): Promise<Map<string, boolean> | null> {
  const pool = getTrenchersPool();
  if (!pool) return null;
  const values = emails.map((e) => e.trim().toLowerCase());
  const res = await pool.query<{ value: string }>(
    `SELECT value FROM login_whitelist
      WHERE enabled = TRUE AND kind = 'email' AND value = ANY($1::text[])`,
    [values],
  );
  const allowed = new Set(res.rows.map((r) => r.value));
  return new Map(values.map((v) => [v, allowed.has(v)]));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const readValue = (flag: string) => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return undefined;
    const a = args[idx];
    return a.includes("=") ? a.split("=").slice(1).join("=") : args[idx + 1];
  };
  return {
    send: args.includes("--send"),
    preview: args.includes("--preview"),
    to: (readValue("--to") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

async function main() {
  const { send, preview, to } = parseArgs();

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://trenchers.ai"
  ).replace(/\/$/, "");
  const accessUrl = process.env.BETA_ACCESS_URL ?? "https://beta.trenchers.ai";
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO ?? "team@trenchers.ai";

  console.log("\nBeta invite - test render");
  console.log(`From:       ${fromEmail ?? "(RESEND_FROM_EMAIL unset)"}`);
  console.log(`Reply-To:   ${replyTo}`);
  console.log(`Subject:    ${BETA_INVITE_SUBJECT}`);
  console.log(`Access URL: ${accessUrl}`);

  if (preview || to.length === 0) {
    // A token-shaped placeholder so the preview matches production layout.
    const copy = {
      accessUrl,
      unsubscribeUrl: `${siteUrl}/api/survey/unsubscribe?token=PREVIEW_TOKEN&c=beta`,
      recipientEmail: "you@example.com",
    };
    const html = await buildBetaInviteHtml(copy);
    const text = buildBetaInviteText(copy);

    const outPath = "/tmp/beta-invite-preview.html";
    await writeFile(outPath, html, "utf-8");
    console.log(`\nHTML written to ${outPath}`);
    console.log("\n--- plain-text part ---\n");
    console.log(text);
    console.log("\n--- end ---");

    if (to.length === 0) {
      console.log("\nNo --to given, so nothing was sent.");
      return;
    }
  }

  if (!send) {
    console.log("\nRe-run with --send to actually deliver to:", to.join(", "));
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !fromEmail) {
    console.error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set.");
    process.exit(1);
  }

  // Gate the send on real beta access unless explicitly overridden.
  const force = process.argv.includes("--force");
  const access = await checkBetaAccess(to);
  if (access === null) {
    console.error(
      "\nCannot verify beta access: TRENCHERS_DATABASE_URL is not set.\n" +
        "This email tells the recipient their access is open, so sending\n" +
        "without checking risks pointing them at a 403. Set the variable, or\n" +
        "pass --force if you accept that risk.",
    );
    if (!force) process.exit(4);
  } else {
    const denied = to.filter(
      (r) => !access.get(r.trim().toLowerCase()),
    );
    console.log("\nBeta access check:");
    for (const r of to) {
      const ok = access.get(r.trim().toLowerCase());
      console.log(`  ${r.padEnd(34)} ${ok ? "on whitelist" : "NOT on whitelist"}`);
    }
    if (denied.length > 0) {
      console.error(
        `\n${denied.length} recipient(s) are not on login_whitelist. They would\n` +
          "get a 403 and the waitlist card. Grant them access first, or pass\n" +
          "--force to send anyway.",
      );
      if (!force) process.exit(4);
    }
  }

  const resend = new Resend(apiKey);
  for (const recipient of to) {
    const copy = {
      accessUrl,
      // A real-looking but non-resolving token: clicking it returns 404
      // rather than unsubscribing anyone.
      unsubscribeUrl: `${siteUrl}/api/survey/unsubscribe?token=TESTTOKEN_NOT_REAL&c=beta`,
      recipientEmail: recipient,
    };
    const result = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject: BETA_INVITE_SUBJECT,
      html: await buildBetaInviteHtml(copy),
      text: buildBetaInviteText(copy),
      replyTo,
      headers: {
        "List-Unsubscribe": `<${copy.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      // Tagged as a test so these never pollute campaign analytics, and so
      // the webhook's campaign router ignores them.
      tags: [
        { name: "campaign", value: `${BETA_CAMPAIGN}-test` },
        { name: "kind", value: "test" },
      ],
      ...({ settings: { tracking: { open: false, click: false } } } as object),
    });
    if (result.error) {
      console.error(`  ${recipient}: FAILED - ${result.error.message}`);
    } else {
      console.log(`  ${recipient}: sent (id ${result.data?.id})`);
    }
  }

  console.log(
    "\nCheck which tab it landed in on each provider, and view the raw " +
      "source to confirm SPF/DKIM/DMARC all pass.",
  );
}

main()
  .catch((err) => {
    console.error("Test send failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });
