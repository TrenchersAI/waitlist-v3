import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import { isPartner, searchUsers, setPartner } from "@/src/lib/partner-tier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Partner programme admin, proxied.
//
// WHY A PROXY AND NOT A DIRECT CALL FROM THE BROWSER. `OPS_SERVICE_TOKEN`
// grants every admin route on the terminal -- pausing trading, rewriting
// flags, granting permanent tiers. It must never reach a client bundle or a
// network tab, so the browser talks to this route and this route holds the
// token. Same reason `beta-grant.ts` exists rather than the sender calling the
// API from wherever it happens to run.
//
// EVERY HANDLER IS SESSION-GUARDED. Granting a partner tier is a standing 50%
// cashback commitment, which makes it the most valuable write this dashboard
// can perform. It gets the same gate as the analytics data and is refused
// outright without one.

async function requireSession() {
  const session = await getAnalyticsSessionFromCookies();
  return session ? null : Response.json({ message: "Unauthorized." }, { status: 401 });
}

/// `GET /api/analytics/partners?q=` — look someone up by email, username,
/// display name, or either wallet.
///
/// A blank query returns nothing rather than "everyone". This screen exists to
/// act on ONE person you already have in mind, and a default listing of the
/// whole user table beside a Grant button is an invitation to misclick.
export async function GET(req: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ users: [], note: "Enter at least 2 characters." });
  }
  try {
    return Response.json({ users: await searchUsers(q) });
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 502 });
  }
}

/// `POST /api/analytics/partners` — grant or revoke.
///
/// `grant` is required and must be a real boolean. A missing field is a 400,
/// never a default: defaulting either way turns a malformed request into a
/// silent tier change, and both directions are wrong to guess.
export async function POST(req: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  let body: { userId?: unknown; grant?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Invalid JSON." }, { status: 400 });
  }
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return Response.json({ message: "Missing `userId`." }, { status: 400 });
  }
  if (typeof body.grant !== "boolean") {
    return Response.json(
      { message: "Missing `grant`; send true to grant or false to revoke." },
      { status: 400 },
    );
  }

  try {
    await setPartner(userId, body.grant);
    // Read the user back rather than reporting success from the request we
    // sent. The grant is monotonic and re-resolves the rank inside its own
    // transaction, so what it SETTLED on is the only honest thing to show --
    // and a revoke deliberately does not lower anyone's rank, which would look
    // like a failed write if we echoed the request instead.
    const [after] = await searchUsers(userId, 1);
    return Response.json({
      ok: true,
      user: after ?? null,
      isPartner: after
        ? isPartner(after.rank, after.plusTier, after.plusTierKind)
        : body.grant,
    });
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 502 });
  }
}
