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
