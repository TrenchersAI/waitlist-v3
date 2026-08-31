import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

let logoPngPromise: Promise<string> | null = null;

// Renders the white wordmark on a dark rounded-rect badge. Baking the dark
// background into the PNG means no email client (Gmail mobile included) can
// color-shift it during its dark-mode pass.
function getLogoPngBase64() {
  if (logoPngPromise) return logoPngPromise;
  const svgPath = join(process.cwd(), "public/logo.svg");
  logoPngPromise = readFile(svgPath)
    .then(async (svg) => {
      const wordmark = await sharp(svg, { density: 384 })
        .resize({ height: 60 })
        .png()
        .toBuffer();

      const meta = await sharp(wordmark).metadata();
      const wordW = meta.width ?? 260;
      const wordH = meta.height ?? 44;

      const padX = 28;
      const padY = 18;
      const radius = 24;
      const badgeW = wordW + padX * 2;
      const badgeH = wordH + padY * 2;

      const bgSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${badgeW}" height="${badgeH}"><rect width="${badgeW}" height="${badgeH}" rx="${radius}" ry="${radius}" fill="#000000"/></svg>`,
      );

      return sharp(bgSvg)
        .composite([{ input: wordmark, top: padY, left: padX }])
        .png()
        .toBuffer();
    })
    .then((png) => png.toString("base64"))
    .catch((err) => {
      logoPngPromise = null;
      throw err;
    });
  return logoPngPromise;
}

export async function sendWaitlistConfirmationEmail(params: {
  to: string;
  subject?: string;
}) {
  const appName = process.env.WAITLIST_APP_NAME ?? "Trenchers";
  const subject = params.subject ?? `Welcome to ${appName} early access`;

  let html: string | undefined;
  try {
    html = await buildWelcomeEmailHtml();
  } catch (err) {
    console.error(
      "Failed to build welcome email, falling back to simple template:",
      err,
    );
  }

  const result = await sendEmail({
    to: params.to,
    subject,
    heading: html ? undefined : "You're in.",
    body: html
      ? undefined
      : `Thanks for joining the <strong>${appName}</strong> waitlist. We’ll email you when we drop access.`,
    html,
  });

  if ("skipped" in result) {
    return result;
  }

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export async function sendWaitlistOtpEmail(params: {
  to: string;
  otp: string;
}) {
  const appName = process.env.WAITLIST_APP_NAME ?? "Trenchers";
  const subject = `${appName} Follow on X`;
  let html: string;

  try {
    html = await buildOtpEmailHtml(params.otp);
  } catch {
    // Fallback to simple template if custom HTML template fails to load.
    html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p style="margin: 0 0 12px;">
          Use this one-time code to verify your waitlist signup:
          <strong style="font-size: 20px; letter-spacing: 4px;">${params.otp}</strong>.
          The code expires in 10 minutes.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you didn’t sign up, you can ignore this email.
        </p>
      </div>
    `;
  }

  let logoAttachment: NonNullable<
    Parameters<typeof sendEmail>[0]["attachments"]
  >[number] | undefined;
  try {
    const content = await getLogoPngBase64();
    logoAttachment = {
      filename: "logo.png",
      content,
      contentId: "logo",
      contentType: "image/png",
    };
  } catch (err) {
    console.error("Failed to load OTP email logo attachment:", err);
  }

  const result = await sendEmail({
    to: params.to,
    subject,
    html,
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });

  if ("skipped" in result) {
    return result;
  }

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export async function sendInternalAnalyticsOtpEmail(params: {
  to: string;
  otp: string;
}) {
  const appName = process.env.WAITLIST_APP_NAME ?? "Trenchers";
  const subject = `${appName} · Internal analytics sign-in code`;
  let html: string;

  try {
    html = await buildOtpEmailHtml(params.otp);
  } catch {
    html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin: 0 0 12px;">Sign in to analytics</h2>
        <p style="margin: 0 0 12px;">
          Your one-time code:
          <strong style="font-size: 20px; letter-spacing: 4px;">${params.otp}</strong>.
          Expires in 10 minutes.
        </p>
      </div>
    `;
  }

  let logoAttachment: NonNullable<
    Parameters<typeof sendEmail>[0]["attachments"]
  >[number] | undefined;
  try {
    const content = await getLogoPngBase64();
    logoAttachment = {
      filename: "logo.png",
      content,
      contentId: "logo",
      contentType: "image/png",
    };
  } catch (err) {
    console.error("Failed to load internal analytics OTP logo attachment:", err);
  }

  const result = await sendEmail({
    to: params.to,
    subject,
    html,
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });

  if ("skipped" in result) {
    return result;
  }

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export type SurveyVariant = "invite" | "reminder";

/// Per-variant copy. The HTML body lives in the template files
/// (src/email-templates/survey-{invite,reminder}/); `intro` + `askLead`
/// here drive the plain-text alternative and the HTML fallback so they
/// stay consistent with the template wording.
const SURVEY_COPY: Record<
  SurveyVariant,
  { subject: string; templateDir: string; intro: string; askLead: string }
> = {
  invite: {
    subject: "You're being considered for priority access",
    templateDir: "survey-invite",
    intro: "You're being considered for early access to Trenchers.",
    askLead:
      "To make our final call on who joins the first wave in the trenches, we need to know more about how you trade. It's a quick 2-minute survey, and",
  },
  reminder: {
    subject: "You're still being considered for priority access",
    templateDir: "survey-reminder",
    intro:
      "You're still being considered for early access to Trenchers, and your spot is being held.",
    askLead:
      "To make our final call, we need to know how you trade. It's a quick 2-minute survey, and",
  },
};

export type SurveyInviteSendParams = {
  to: string;
  surveyUrl: string;
  unsubscribeUrl: string;
  inviteId: string;
  campaign: string;
  /// "invite" = first send to new signups; "reminder" = follow-up to
  /// non-completers. Selects subject, template, and body copy.
  variant: SurveyVariant;
};

/// Sends one survey email (invite or reminder). The batch scripts call this
/// in chunks. We set RFC-8058 List-Unsubscribe headers and a `tags` payload
/// so the Resend webhook can join events back to the SurveyInvite row via
/// either resendMsgId or inviteId.
export async function sendSurveyInviteEmail(params: SurveyInviteSendParams) {
  const copy = SURVEY_COPY[params.variant];
  // Subject kept conversational: no brackets, all-caps, or "trigger" words
  // ("FREE / exclusive / limited time") — those read as automated/bulk to
  // Gmail's Primary-tab classifier.
  const subject = copy.subject;

  let html: string;
  try {
    html = await buildSurveyInviteHtml({
      surveyUrl: params.surveyUrl,
      unsubscribeUrl: params.unsubscribeUrl,
      variant: params.variant,
    });
  } catch (err) {
    console.error(
      "Failed to build survey invite html, falling back:",
      err,
    );
    html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 24px;color:#1a1a1a;font-size:16px;line-height:1.6;">
        <p>Hey,</p>
        <p>${copy.intro}</p>
        <p>${copy.askLead} <a href="${params.surveyUrl}" style="color:#1a1a1a;text-decoration:underline;">you can take it here</a>.</p>
        <p style="color:#555;">Thanks,<br/>TrenchersAI</p>
      </div>
    `;
  }

  const text = buildSurveyInviteText({
    surveyUrl: params.surveyUrl,
    unsubscribeUrl: params.unsubscribeUrl,
    variant: params.variant,
  });

  const result = await sendEmail({
    to: params.to,
    subject,
    html,
    text,
    // Disable BOTH open and click tracking on this send. The 1x1 open
    // pixel and the click-tracking URL rewrite (links repointed at a
    // Resend tracking domain) are two of the strongest "this is bulk
    // marketing" signals to Gmail/Yahoo. We lose nothing useful: opens
    // were inflated by Apple Mail Privacy Protection anyway, and the
    // click is recorded first-party when the survey page loads.
    trackOpens: false,
    trackClicks: false,
    headers: {
      // Gmail/Yahoo's Feb-2024 bulk-sender rules require List-Unsubscribe
      // with the POST companion header. Without these, deliverability for
      // a 2k blast tanks. Also set a Reply-To so replies go to a real
      // address instead of bouncing — another deliverability signal.
      "List-Unsubscribe": `<${params.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Reply-To": process.env.RESEND_REPLY_TO ?? "prakhar@trenchers.ai",
    },
    tags: [
      { name: "campaign", value: params.campaign },
      { name: "inviteId", value: params.inviteId },
    ],
  });

  if ("skipped" in result) {
    return result;
  }
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
  return { ok: true as const, id: result.data?.id ?? null };
}

async function sendEmail(params: {
  to: string;
  subject: string;
  heading?: string;
  body?: string;
  html?: string;
  /** Plain-text alternative. RFC 2822 spam scoring penalizes HTML-only
     mail; including a text part improves Primary-tab placement. */
  text?: string;
  /** Pass false to disable Resend's 1x1 open-tracking pixel for this
     send. The pixel is a strong "bulk marketing" signal for Gmail. */
  trackOpens?: boolean;
  /** Pass false to disable Resend's click-tracking URL rewrite. Rewritten
     links point at a Resend tracking domain — another "bulk" signal. */
  trackClicks?: boolean;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentId?: string;
    contentType?: string;
  }>;
}) {
  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[email] RESEND_API_KEY is missing. Emails are not sent. Set it in .env",
      );
    }
    return { ok: false as const, skipped: true as const };
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[email] RESEND_FROM_EMAIL is missing. Use an address on your verified Resend domain",
      );
    }
    throw new Error("RESEND_FROM_EMAIL is not set.");
  }

  // Resend's per-message settings object — used here to override the
  // project-default open/click tracking for transactional/personal mail.
  // The shape comes from Resend's REST API (`tracking.open|click`).
  const tracking: { open?: boolean; click?: boolean } = {};
  if (params.trackOpens === false) tracking.open = false;
  if (params.trackClicks === false) tracking.click = false;
  const settings =
    Object.keys(tracking).length > 0 ? { tracking } : undefined;

  return resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    attachments: params.attachments,
    headers: params.headers,
    tags: params.tags,
    text: params.text,
    ...(settings ? { settings } : {}),
    html:
      params.html ??
      `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin: 0 0 12px;">${params.heading ?? ""}</h2>
        <p style="margin: 0 0 12px;">
          ${params.body ?? ""}
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you didn’t sign up, you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function buildWelcomeEmailHtml() {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/early-access-hero/index.html",
  );
  const stylesPath = join(
    process.cwd(),
    "src/email-templates/early-access-hero/styles.css",
  );
  const [templateHtml, templateCss] = await Promise.all([
    readFile(templatePath, "utf-8"),
    readFile(stylesPath, "utf-8"),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai";
  const assetsUrl =
    process.env.EMAIL_ASSETS_URL ??
    "https://assets.trenchers.ai/email-assets";

  return templateHtml
    .replace(
      '<link rel="stylesheet" href="./styles.css" />',
      `<style>${templateCss}</style>`,
    )
    .replace(
      'src="/email-templates/early-access-hero/logo.svg"',
      `src="${assetsUrl}/welcome-logo.png?v=2"`,
    )
    .replace(
      'src="/Low-Poly%20Owl%202.svg"',
      `src="${assetsUrl}/welcome-owl.png?v=2"`,
    )
    .replace(
      'src="/trenchers-component.svg"',
      `src="${assetsUrl}/welcome-component.jpg?v=2"`,
    )
    .replace(/href="\/terms"/g, `href="${appUrl}/terms"`)
    .replace(/href="\/privacy"/g, `href="${appUrl}/privacy"`);
}

export async function buildSurveyInviteHtml(params: {
  surveyUrl: string;
  unsubscribeUrl: string;
  variant: SurveyVariant;
}) {
  // Inline styles only — no separate stylesheet. Marketing-CSS shells
  // (linked stylesheet, multi-column tables, gradient header) push the
  // message into Gmail's Promotions tab; the founder-style 1:1 template
  // stays in Primary.
  const templatePath = join(
    process.cwd(),
    `src/email-templates/${SURVEY_COPY[params.variant].templateDir}/index.html`,
  );
  const templateHtml = await readFile(templatePath, "utf-8");

  return templateHtml
    .replaceAll("{{SURVEY_URL}}", params.surveyUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl);
}

/// Plain-text alternative for the survey invite. RFC 2822 spam scoring
/// penalizes HTML-only messages, and some clients (Outlook in reading
/// pane, watch / terminal readers) actually show this version. Keep it
/// in sync with the HTML copy.
export function buildSurveyInviteText(params: {
  surveyUrl: string;
  unsubscribeUrl: string;
  variant: SurveyVariant;
}) {
  const copy = SURVEY_COPY[params.variant];
  return [
    "Hey,",
    "",
    copy.intro,
    "",
    `${copy.askLead} you can take it here:`,
    "",
    params.surveyUrl,
    "",
    "Thanks,",
    "TrenchersAI",
  ].join("\n");
}

export type BetaInviteCopy = {
  accessUrl: string;
  unsubscribeUrl: string;
  recipientEmail: string;
};

/// Subject for the beta invite. Deliberately plain and declarative.
///
/// Avoided on purpose: brackets, ALL CAPS, emoji, exclamation marks, and the
/// words free / exclusive / limited / hurry / act now, all of which push a
/// message toward Promotions or a spam-score penalty. Also avoided: "invite"
/// and "invitation", which are overwhelmingly used by bulk senders. A short
/// possessive statement of fact reads like a human wrote it.
export const BETA_INVITE_SUBJECT = "Your Trenchers access is open";

export async function buildBetaInviteHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-invite/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");

  return (
    templateHtml
      // The template carries a long rationale comment explaining why the
      // markup is as austere as it is. That is for whoever edits it next,
      // not for the recipient, so strip it: we neither ship our own
      // deliverability notes to 10k inboxes nor pay for the bytes.
      .replace(/<!--[\s\S]*?-->/g, "")
      .replaceAll("{{ACCESS_URL}}", params.accessUrl)
      .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
      .replaceAll("{{RECIPIENT_EMAIL}}", escapeHtml(params.recipientEmail))
      .trim()
  );
}

/// Plain-text alternative. Kept in sync with the HTML wording, since a text part
/// that diverges from the HTML part is itself a spam-filter signal, and
/// HTML-only mail scores worse than multipart regardless.
export function buildBetaInviteText(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "You are in. Your early access to Trenchers is now open.",
    "",
    params.accessUrl,
    "",
    `Sign in with ${params.recipientEmail} using email or Google.`,
    "X and Apple will not work.",
    "",
    "You joined the waitlist early, so you are in the first group through the",
    "door. Your feedback is greatly appreciated and will help us shape this to",
    "perfection. Just reply to this email and it comes straight to us.",
    "",
    "Thank you,",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

/// Subject for the second touch: a reminder that carries the incident
/// notice.
///
/// Reminder-led rather than apology-led, because most recipients never hit
/// the bug and "the sign-in issue is fixed" means nothing to them. Stating
/// that their access is still open gives every recipient a reason to act,
/// and the fix inside removes the obstacle for the subset who were blocked.
export const BETA_REMINDER_SUBJECT = "Your Trenchers access is still open";

export async function buildBetaReminderHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-reminder/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .replaceAll("{{RECIPIENT_EMAIL}}", escapeHtml(params.recipientEmail))
    .trim();
}

export function buildBetaReminderText(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "A quick reminder that your early access to Trenchers is open and",
    "waiting.",
    "",
    "We also noticed that some users were not able to sign in earlier today.",
    "That was a fault on our side. We found it and fixed it fast, so if you",
    "tried and could not get in, please try again.",
    "",
    "Your access is here:",
    params.accessUrl,
    "",
    `Sign in with ${params.recipientEmail} using email or Google. Signing in`,
    "through X or Apple will not resolve your access.",
    "",
    "If anything else blocks you, reply to this email. It reaches the team",
    "directly, and we act on it.",
    "",
    "Thank you,",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

/// Subject for the activation nudge, sent only to people who have already
/// signed in. Taken from the closing line of the body: short, not in
/// marketing register, and the most memorable thing in the email.
export const BETA_NUDGE_SUBJECT = "You're early. Make it count.";

export async function buildBetaNudgeHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-nudge/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .trim();
}

export function buildBetaNudgeText(params: BetaInviteCopy) {
  return [
    "Hi,",
    "",
    "You have early access to Trenchers, and we want you to actively test",
    "the platform.",
    "",
    "Users are already trading both manually and through AI agents, testing",
    "different strategies, and sharing feedback that is directly shaping",
    "what we ship next.",
    "",
    "If you haven't spawned a bot yet, start there. Deploy one, explore the",
    "platform, and experience the full trading workflow.",
    "",
    params.accessUrl,
    "",
    "Once you've tested it, tell us what worked, what didn't, and what you",
    "want improved. You can reach us anytime through the Support button",
    "inside Trenchers for issues or feedback, or simply reply to this email.",
    "",
    "Users who actively trade, test agents, and provide meaningful feedback",
    "will be prioritized for upcoming early-user rewards and access.",
    "",
    "You're early. Make it count.",
    "",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

/// Subject for the product-change announcement. The founder's own line,
/// kept verbatim including the emoji.
///
/// Worth knowing when judging a future subject: an emoji leans slightly
/// toward Gmail's Promotions classifier. The evidence for that is weak, and
/// after four sends with zero spam complaints this domain has the
/// reputation to absorb it, so it is a fair trade for a subject that sounds
/// like a person wrote it.
export const BETA_FEATURE_SUBJECT = "The agents got more patient \u{1F440}";

export async function buildBetaFeatureHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-feature/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .trim();
}

export function buildBetaFeatureText(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "Something changed at Trenchers.",
    "",
    "Our agents are now holding through migration, giving them a chance to",
    "catch what happens after graduation, where the real runners can begin.",
    "",
    "10x. 50x. 100x.",
    "You never know which one is going to keep running.",
    "",
    "The upgrade is already live. Nothing to switch on.",
    "",
    "You are among the few early users seeing this first hand. The first",
    "Trenchers cohort gets our best pricing, lowest fees and highest",
    "cashback, and a place in our priority group where we read every piece",
    "of feedback ourselves.",
    "",
    "See what the agents are finding:",
    params.accessUrl,
    "",
    "If you spot something interesting, reply to this email. It comes",
    "straight to us.",
    "",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

/// Subject for the wave 2 invite. First contact, so it is allowed to sound
/// like an arrival rather than a notification. "Welcome to the trenches"
/// leans on the product's own name instead of generic excitement.
export const BETA_INVITE_W2_SUBJECT = "You're in. Welcome to the trenches.";

export async function buildBetaInviteW2Html(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-invite-w2/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .replaceAll("{{RECIPIENT_EMAIL}}", escapeHtml(params.recipientEmail))
    .trim();
}

export function buildBetaInviteW2Text(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "You are in.",
    "",
    "Your early access to Trenchers is now open.",
    "",
    params.accessUrl,
    "",
    `Sign in with ${params.recipientEmail} (email or Google).`,
    "",
    "Being early pays:",
    "",
    "  Best pricing. Lowest fees. Highest cashback.",
    "  A seat in our priority group.",
    "  First in line for early-user rewards.",
    "",
    "See what the agents are finding.",
    "",
    "Thank you,",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

/// The recipient's own address is interpolated into the HTML body. It comes
/// from our database rather than user input at send time, but escaping it
/// costs nothing and stops a stored `<` in an address from breaking the
/// markup for that one recipient.
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function buildOtpEmailHtml(otp: string) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/otp-email/index.html",
  );
  const stylesPath = join(
    process.cwd(),
    "src/email-templates/otp-email/styles.css",
  );
  const [templateHtml, templateCss] = await Promise.all([
    readFile(templatePath, "utf-8"),
    readFile(stylesPath, "utf-8"),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai";
  return templateHtml
    .replace(
      '<link rel="stylesheet" href="./styles.css" />',
      `<style>${templateCss}</style>`,
    )
    .replaceAll("{{OTP_CODE}}", otp)
    .replace(/href="\/terms"/g, `href="${appUrl}/terms"`)
    .replace(/href="\/privacy"/g, `href="${appUrl}/privacy"`);
}

/// Subject for the Falcon tier-upgrade mail to wave 1.
///
/// Deliberately plain and declarative, per the rule stated above the invite
/// subject: no emoji, no exclamation mark, no "exclusive" / "reward" language.
/// This mail goes to 1,364 people at once and a Promotions-tab placement would
/// cost more reach than an excited subject line buys.
export const BETA_FALCON_SUBJECT = "You are now Falcon, our top tier";

/// Seventh touch: public-beta launch, gifting Falcon to the WHOLE waitlist.
/// Names the action rather than the feeling — the recipient has to click to
/// redeem, so a subject that only celebrates would bury the one thing the
/// mail needs them to do.
export const BETA_FALCON_CLAIM_SUBJECT = "We are live. Your Falcon tier is waiting.";

export async function buildBetaFalconHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-falcon/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .trim();
}

/// Plain-text mirror. Kept in step with beta-falcon/index.html by hand; if the
/// HTML changes, change this too. Note it makes NO permanence claim, for the
/// same reason the HTML does not: the Plus floor was revoked, so the tier
/// decays after TIER_DEMOTION_PERIOD_DAYS without qualifying volume.
export function buildBetaFalconText(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "You were in the first trench.",
    "",
    "You did not just try Trenchers, you gave valuable feedback. Those",
    "replies mean more to us than anything else we have been given, and a",
    "lot of what the terminal does today started in one of them.",
    "",
    "So we want to thank you properly. You now hold Falcon, our top tier:",
    "",
    "  * 50% cashback on every fee. Get half your trading fees back, paid",
    "    in SOL. No tier earns more.",
    "  * 4x points on every trade. Four times what a new trader earns.",
    "",
    "Cashback lands on the Rewards page in SOL, and you claim it yourself.",
    "",
    "Not signed in yet? Sign in and get rewarded:",
    params.accessUrl,
    "",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}

export async function buildBetaFalconClaimHtml(params: BetaInviteCopy) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/beta-falcon-claim/index.html",
  );
  const templateHtml = await readFile(templatePath, "utf-8");
  return templateHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replaceAll("{{ACCESS_URL}}", params.accessUrl)
    .replaceAll("{{UNSUBSCRIBE_URL}}", params.unsubscribeUrl)
    .trim();
}

/// Plain-text mirror. Kept in step with beta-falcon-claim/index.html by hand;
/// if the HTML changes, change this too.
///
/// Like its predecessor it makes NO permanence claim, and unlike its
/// predecessor it says why out loud: a claimed tier writes no `plus_tier`
/// floor, so it decays after TIER_DEMOTION_PERIOD_DAYS without qualifying
/// volume. Telling 14,199 people they hold the top tier and letting the
/// step-down arrive unannounced is the failure mode that sentence prevents.
export function buildBetaFalconClaimText(params: BetaInviteCopy) {
  return [
    "Hello,",
    "",
    "Trenchers is live in public beta.",
    "",
    "You signed up before there was much to sign up for. Early believers",
    "are the only reason we got here, and we wanted to thank the people",
    "who backed us when it was still a promise.",
    "",
    "So Falcon, our top tier, is a gift to you. It is sitting on your",
    "account, waiting to be claimed:",
    "",
    "  * 50% cashback on every fee. Get half your trading fees back, paid",
    "    in SOL. No tier earns more.",
    "  * 4x points on every trade. Four times what a new trader earns.",
    "",
    "Sign in and you will see it. One click and it is yours.",
    "",
    "Falcon is a trading tier, so it is held by volume. Claiming gives you",
    "a full 30 days at the top, and it stays as long as you keep trading.",
    "",
    "Claim your Falcon:",
    params.accessUrl,
    "",
    "Trenchers",
    "",
    "---",
    "You are receiving this because you joined the Trenchers waitlist.",
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}
