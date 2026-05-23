import { createHmac, timingSafeEqual } from "node:crypto";

import { getPrismaClient } from "@/src/lib/prisma";

export const runtime = "nodejs";

// Resend signs webhook bodies per the Svix spec — the same scheme used by
// Clerk, Stripe Connect-via-Svix, etc. Reference: https://docs.svix.com/
// receiving/verifying-payloads/how-manual. We verify the v1 signature
// against `RESEND_WEBHOOK_SECRET`; if the header is absent we reject so
// the endpoint can't be hit anonymously.
const SIG_HEADER = "svix-signature";
const ID_HEADER = "svix-id";
const TS_HEADER = "svix-timestamp";

// Reject events whose timestamp is too far from now — protects against
// replay if a signing secret is ever leaked but later rotated. Svix
// recommends 5 minutes.
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained"
  | "email.failed";

type ResendEvent = {
  type: ResendEventType;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    tags?: Record<string, string> | { name: string; value: string }[];
  };
};

function verifySignature(params: {
  rawBody: string;
  secret: string;
  svixId: string;
  svixTs: string;
  svixSig: string;
}): boolean {
  // Strip the optional `whsec_` prefix on the secret as documented by
  // Svix. The secret is base64 in that case; the HMAC then takes the
  // decoded bytes.
  let key: Buffer;
  if (params.secret.startsWith("whsec_")) {
    key = Buffer.from(params.secret.slice("whsec_".length), "base64");
  } else {
    key = Buffer.from(params.secret, "utf8");
  }

  const signedPayload = `${params.svixId}.${params.svixTs}.${params.rawBody}`;
  const expected = createHmac("sha256", key)
    .update(signedPayload, "utf8")
    .digest("base64");

  // The header can include multiple signatures separated by spaces, each
  // prefixed by a version (`v1,<sig>`). Accept the request if any v1
  // signature matches.
  const candidates = params.svixSig
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));
  for (const cand of candidates) {
    if (cand.length !== expected.length) continue;
    if (
      timingSafeEqual(Buffer.from(cand, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return true;
    }
  }
  return false;
}

function extractInviteIdFromTags(
  tags: NonNullable<ResendEvent["data"]>["tags"] | undefined,
): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (t && typeof t === "object" && t.name === "inviteId") {
        return typeof t.value === "string" ? t.value : null;
      }
    }
    return null;
  }
  if (typeof tags === "object") {
    const v = (tags as Record<string, string>).inviteId;
    return typeof v === "string" ? v : null;
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { message: "Webhook not configured." },
      { status: 503 },
    );
  }

  const svixId = request.headers.get(ID_HEADER);
  const svixTs = request.headers.get(TS_HEADER);
  const svixSig = request.headers.get(SIG_HEADER);
  if (!svixId || !svixTs || !svixSig) {
    return Response.json({ message: "Missing signature." }, { status: 401 });
  }

  const tsMs = Number(svixTs) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) {
    return Response.json({ message: "Stale event." }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature({ rawBody, secret, svixId, svixTs, svixSig })) {
    return Response.json({ message: "Bad signature." }, { status: 401 });
  }

  let evt: ResendEvent;
  try {
    evt = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return Response.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const resendMsgId = evt.data?.email_id;
  if (!resendMsgId) {
    // Without a message id we can't join this back to an invite. Persist
    // the raw event for forensics, then ack so Resend doesn't retry.
    const prisma = getPrismaClient();
    await prisma.emailEvent.create({
      data: {
        resendMsgId: "unknown",
        type: evt.type,
        payload: evt as never,
        occurredAt: new Date(tsMs),
      },
    });
    return Response.json({ ok: true });
  }

  const prisma = getPrismaClient();
  const occurredAt = new Date(tsMs);

  await prisma.emailEvent.create({
    data: {
      resendMsgId,
      type: evt.type,
      payload: evt as never,
      occurredAt,
    },
  });

  // Try to find the invite by the message id. Falls back to the inviteId
  // tag we attached when sending — useful when Resend retries and the
  // message id we stored is the most recent of multiple sends.
  const inviteIdFromTag = extractInviteIdFromTags(evt.data?.tags);
  const invite = await prisma.surveyInvite.findFirst({
    where: inviteIdFromTag
      ? { OR: [{ resendMsgId }, { id: inviteIdFromTag }] }
      : { resendMsgId },
    select: {
      id: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      complainedAt: true,
    },
  });
  if (!invite) {
    return Response.json({ ok: true });
  }

  const data: Record<string, Date> = {};
  switch (evt.type) {
    case "email.delivered":
      if (!invite.deliveredAt) data.deliveredAt = occurredAt;
      break;
    case "email.opened":
      if (!invite.openedAt) data.openedAt = occurredAt;
      break;
    case "email.clicked":
      if (!invite.clickedAt) data.clickedAt = occurredAt;
      break;
    case "email.bounced":
    case "email.failed":
      if (!invite.bouncedAt) data.bouncedAt = occurredAt;
      break;
    case "email.complained":
      if (!invite.complainedAt) data.complainedAt = occurredAt;
      break;
    default:
      // sent / delivery_delayed — already covered by sentAt or no signal
      // needed for the funnel.
      break;
  }

  if (Object.keys(data).length > 0) {
    await prisma.surveyInvite.update({
      where: { id: invite.id },
      data,
    });
  }

  return Response.json({ ok: true });
}
