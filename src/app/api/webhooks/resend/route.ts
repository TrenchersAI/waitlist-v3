import { createHmac, timingSafeEqual } from "node:crypto";

import { BETA_CAMPAIGN } from "@/src/lib/beta-invite";
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
  | "email.failed"
  | "email.suppressed";

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

/// Resend hands tags back either as the array we sent or as a flattened
/// object, depending on the event type. Handle both shapes.
function extractTagValue(
  tags: NonNullable<ResendEvent["data"]>["tags"] | undefined,
  name: string,
): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (t && typeof t === "object" && t.name === name) {
        return typeof t.value === "string" ? t.value : null;
      }
    }
    return null;
  }
  if (typeof tags === "object") {
    const v = (tags as Record<string, string>)[name];
    return typeof v === "string" ? v : null;
  }
  return null;
}

function extractInviteIdFromTags(
  tags: NonNullable<ResendEvent["data"]>["tags"] | undefined,
): string | null {
  return extractTagValue(tags, "inviteId");
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

  // Which campaign this event belongs to. Both campaigns tag their sends,
  // so we route to the right table instead of guessing. Untagged events
  // fall through to the survey table, which is where all pre-existing
  // (untagged) traffic came from.
  const campaign = extractTagValue(evt.data?.tags, "campaign");
  const isBeta = campaign === BETA_CAMPAIGN;

  const where = inviteIdFromTag
    ? { OR: [{ resendMsgId }, { id: inviteIdFromTag }] }
    : { resendMsgId };
  const select = {
    id: true,
    deliveredAt: true,
    openedAt: true,
    clickedAt: true,
    bouncedAt: true,
    complainedAt: true,
  } as const;

  // The beta campaign sends twice to the same row (invite, then the signup
  // issue reminder), so a message id alone does not say which send an event
  // belongs to. Check the reminder id first: if it matches, fold the event
  // onto the reminder columns so the two sends keep independent delivery
  // stats instead of the second overwriting the first.
  if (isBeta) {
    const reminderRow = await prisma.betaInvite.findFirst({
      where: { reminderResendMsgId: resendMsgId },
      select: {
        id: true,
        reminderDeliveredAt: true,
        reminderOpenedAt: true,
        reminderBouncedAt: true,
        reminderComplainedAt: true,
      },
    });
    if (reminderRow) {
      const rdata: Record<string, Date> = {};
      switch (evt.type) {
        case "email.delivered":
          if (!reminderRow.reminderDeliveredAt) rdata.reminderDeliveredAt = occurredAt;
          break;
        case "email.opened":
          if (!reminderRow.reminderOpenedAt) rdata.reminderOpenedAt = occurredAt;
          break;
        case "email.bounced":
        case "email.failed":
          if (!reminderRow.reminderBouncedAt) rdata.reminderBouncedAt = occurredAt;
          break;
        case "email.complained":
          if (!reminderRow.reminderComplainedAt) rdata.reminderComplainedAt = occurredAt;
          break;
        default:
          break;
      }
      if (Object.keys(rdata).length > 0) {
        await prisma.betaInvite.update({ where: { id: reminderRow.id }, data: rdata });
      }
      return Response.json({ ok: true });
    }

    const nudgeRow = await prisma.betaInvite.findFirst({
      where: { nudgeResendMsgId: resendMsgId },
      select: {
        id: true,
        nudgeDeliveredAt: true,
        nudgeOpenedAt: true,
        nudgeBouncedAt: true,
        nudgeComplainedAt: true,
      },
    });
    if (nudgeRow) {
      const ndata: Record<string, Date> = {};
      switch (evt.type) {
        case "email.delivered":
          if (!nudgeRow.nudgeDeliveredAt) ndata.nudgeDeliveredAt = occurredAt;
          break;
        case "email.opened":
          if (!nudgeRow.nudgeOpenedAt) ndata.nudgeOpenedAt = occurredAt;
          break;
        case "email.bounced":
        case "email.failed":
          if (!nudgeRow.nudgeBouncedAt) ndata.nudgeBouncedAt = occurredAt;
          break;
        case "email.complained":
          if (!nudgeRow.nudgeComplainedAt) ndata.nudgeComplainedAt = occurredAt;
          break;
        default:
          break;
      }
      if (Object.keys(ndata).length > 0) {
        await prisma.betaInvite.update({ where: { id: nudgeRow.id }, data: ndata });
      }
      return Response.json({ ok: true });
    }

    const featureRow = await prisma.betaInvite.findFirst({
      where: { featureResendMsgId: resendMsgId },
      select: {
        id: true,
        featureDeliveredAt: true,
        featureOpenedAt: true,
        featureBouncedAt: true,
        featureComplainedAt: true,
      },
    });
    if (featureRow) {
      const fdata: Record<string, Date> = {};
      switch (evt.type) {
        case "email.delivered":
          if (!featureRow.featureDeliveredAt) fdata.featureDeliveredAt = occurredAt;
          break;
        case "email.opened":
          if (!featureRow.featureOpenedAt) fdata.featureOpenedAt = occurredAt;
          break;
        case "email.bounced":
        case "email.failed":
          if (!featureRow.featureBouncedAt) fdata.featureBouncedAt = occurredAt;
          break;
        case "email.complained":
          if (!featureRow.featureComplainedAt) fdata.featureComplainedAt = occurredAt;
          break;
        default:
          break;
      }
      if (Object.keys(fdata).length > 0) {
        await prisma.betaInvite.update({ where: { id: featureRow.id }, data: fdata });
      }
      return Response.json({ ok: true });
    }

    // Fifth send: the Falcon tier upgrade.
    //
    // Adding a send WITHOUT adding its branch here is silent, which is why
    // this comment exists. An unmatched id falls through to the base lookup
    // on `resendMsgId` (the FIRST send's column), matches nothing, and the
    // handler returns ok:true. The events are then gone: no delivery record,
    // and no bounce record either, so the address stays in the reachable set
    // and the campaign-wide reputation gate cannot see the damage the newest
    // send is doing. If you add a sixth send, add its branch here too.
    const falconRow = await prisma.betaInvite.findFirst({
      where: { falconResendMsgId: resendMsgId },
      select: {
        id: true,
        falconDeliveredAt: true,
        falconOpenedAt: true,
        falconBouncedAt: true,
        falconComplainedAt: true,
      },
    });
    if (falconRow) {
      const fadata: Record<string, Date> = {};
      switch (evt.type) {
        case "email.delivered":
          if (!falconRow.falconDeliveredAt) fadata.falconDeliveredAt = occurredAt;
          break;
        case "email.opened":
          if (!falconRow.falconOpenedAt) fadata.falconOpenedAt = occurredAt;
          break;
        case "email.bounced":
        case "email.failed":
          if (!falconRow.falconBouncedAt) fadata.falconBouncedAt = occurredAt;
          break;
        case "email.complained":
          if (!falconRow.falconComplainedAt) fadata.falconComplainedAt = occurredAt;
          break;
        default:
          break;
      }
      if (Object.keys(fadata).length > 0) {
        await prisma.betaInvite.update({ where: { id: falconRow.id }, data: fadata });
      }
      return Response.json({ ok: true });
    }

    // Seventh send: the public-beta Falcon CLAIM campaign.
    //
    // The FIRST send whose columns are not on `BetaInvite`. It goes to the
    // whole waitlist, and 3,740 of those addresses have no invite row to hang
    // a column on, so it stamps `WaitlistSubscriber` instead. The lookup has
    // to follow it there.
    //
    // This branch is what makes that send's reputation gate real. Without it
    // an id matches nothing, the handler still returns ok:true, and
    // `falconClaimBouncedAt` is never written -- so the sender reads zero
    // bounces however badly the run is going, and the mid-flight abort that
    // is supposed to stop a bad list can never fire. Silent, and worst
    // exactly when it matters most.
    // MATCHED BY TAG FIRST, message id only as a fallback, and the order
    // matters. Resend can deliver and fire `email.delivered` BEFORE the
    // sender's stamping statement commits `falconClaimResendMsgId`, so an
    // id-only lookup loses that race: the first live batch recorded 96
    // deliveries and 1 bounce, and every one of them found no row and was
    // dropped. That is not a cosmetic loss -- the sender's mid-flight abort
    // reads `falconClaimBouncedAt`, so a lost bounce is an abort that cannot
    // fire, which is the whole safety mechanism gone precisely when a bad
    // list needs it. The `subscriberId` tag travels inside the event itself,
    // so it cannot lose a race with our own write.
    const claimSubId = extractTagValue(evt.data?.tags, "subscriberId");
    const claimRow = await prisma.waitlistSubscriber.findFirst({
      where: claimSubId
        ? { id: claimSubId }
        : { falconClaimResendMsgId: resendMsgId },
      select: {
        id: true,
        falconClaimResendMsgId: true,
        falconClaimDeliveredAt: true,
        falconClaimBouncedAt: true,
        falconClaimComplainedAt: true,
        falconClaimSuppressedAt: true,
      },
    });
    if (claimRow) {
      const cdata: Record<string, Date | string> = {};
      // Backfill the id when the tag got us here first, so later events for
      // this message match either way and the row records what was sent.
      if (!claimRow.falconClaimResendMsgId && resendMsgId) {
        cdata.falconClaimResendMsgId = resendMsgId;
      }
      switch (evt.type) {
        case "email.delivered":
          if (!claimRow.falconClaimDeliveredAt) cdata.falconClaimDeliveredAt = occurredAt;
          break;
        case "email.bounced":
        case "email.failed":
          if (!claimRow.falconClaimBouncedAt) cdata.falconClaimBouncedAt = occurredAt;
          break;
        case "email.complained":
          if (!claimRow.falconClaimComplainedAt) cdata.falconClaimComplainedAt = occurredAt;
          break;
        // Resend refused the send outright because the address is already on
        // its suppression list. The message never left, so it costs no
        // reputation, but the person is unreachable and must stop counting as
        // pending or every later run retries them forever.
        case "email.suppressed":
          if (!claimRow.falconClaimSuppressedAt) cdata.falconClaimSuppressedAt = occurredAt;
          break;
        default:
          break;
      }
      if (Object.keys(cdata).length > 0) {
        await prisma.waitlistSubscriber.update({
          where: { id: claimRow.id },
          data: cdata,
        });
      }
      return Response.json({ ok: true });
    }
  }

  const invite = isBeta
    ? await prisma.betaInvite.findFirst({ where, select })
    : await prisma.surveyInvite.findFirst({ where, select });
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
    case "email.suppressed":
      // Resend refused to send because the address is on its suppression
      // list. The message never left, so it costs no reputation, but the
      // person is unreachable and must stop showing up as pending.
      if (isBeta) data.suppressedAt = occurredAt;
      break;
    default:
      // sent / delivery_delayed are covered by sentAt or carry no signal
      // the funnel needs.
      break;
  }

  if (Object.keys(data).length > 0) {
    if (isBeta) {
      await prisma.betaInvite.update({ where: { id: invite.id }, data });
    } else {
      await prisma.surveyInvite.update({ where: { id: invite.id }, data });
    }
  }

  return Response.json({ ok: true });
}
