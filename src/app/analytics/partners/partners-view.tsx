"use client";

import { useCallback, useState } from "react";

import type { PartnerUser } from "@/src/lib/partner-tier";

/// Everything a row needs to identify a person, in the order you would read it
/// aloud. Wallets are truncated in the middle: the ends are what anyone
/// actually compares, and a full base58 key pushes the action button off a
/// narrow screen.
function shortWallet(w: string | null) {
  if (!w) return null;
  return w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

function Row({
  user,
  busy,
  onToggle,
}: {
  user: PartnerUser;
  busy: boolean;
  onToggle: (u: PartnerUser, grant: boolean) => void;
}) {
  const name = user.username ?? user.displayName ?? user.email ?? user.id;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{name}</span>
          {user.isPartner ? (
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
              Partner
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-xs text-white/45">
          {user.email ?? "no email"}
          {user.tradingWallet ? ` · ${shortWallet(user.tradingWallet)}` : ""}
          {user.rank ? ` · ${user.rank}` : ""}
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(user, !user.isPartner)}
        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
          user.isPartner
            ? "border border-white/15 text-white/70 hover:bg-white/5"
            : "bg-indigo-500 text-white hover:bg-indigo-400"
        }`}
      >
        {busy ? "Working…" : user.isPartner ? "Revoke" : "Make partner"}
      </button>
    </div>
  );
}

export function PartnersContent() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<PartnerUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PartnerUser | null>(null);

  const search = useCallback(async (term: string) => {
    setError(null);
    setNote(null);
    if (term.trim().length < 2) {
      setUsers(null);
      return;
    }
    try {
      const res = await fetch(`/api/analytics/partners?q=${encodeURIComponent(term)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
      setUsers(body.users ?? []);
    } catch (e) {
      setError((e as Error).message);
      setUsers(null);
    }
  }, []);

  const apply = useCallback(
    async (u: PartnerUser, grant: boolean) => {
      setBusyId(u.id);
      setError(null);
      setNote(null);
      try {
        const res = await fetch("/api/analytics/partners", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: u.id, grant }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
        // Replace the row from the SETTLED read the server did, not from what
        // we asked for.
        setUsers((prev) =>
          (prev ?? []).map((p) => (p.id === u.id ? (body.user ?? p) : p)),
        );
        setNote(
          grant
            ? `${u.username ?? u.email ?? u.id} is now a Partner.`
            : `Partner tier revoked. Their rank is unchanged — it simply resumes decaying.`,
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyId(null);
        setConfirming(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-6 p-1">
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-white">Partner programme</h2>
        <p className="max-w-2xl text-xs leading-relaxed text-white/45">
          Grants a permanent <strong className="text-white/70">Falcon</strong>{" "}
          floor. Their badge reads <strong className="text-white/70">Partner</strong>,
          they earn 50% cashback and 4x points, and the tier never decays and
          needs no volume. It is a floor rather than a cap, so a partner who
          trades above it keeps whatever they earn.
        </p>
      </section>

      <section className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search(q);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Email, username, or wallet address"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-500/60 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Search
          </button>
        </form>

        {error ? (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.06] p-3 text-xs text-rose-300">
            {error}
          </div>
        ) : null}
        {note ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-xs text-emerald-300">
            {note}
          </div>
        ) : null}

        {users == null ? (
          <p className="text-xs text-white/35">
            Search for someone to grant or revoke. Nothing is listed by default:
            this screen acts on one person you already have in mind, and a
            listing of every user beside a Grant button invites a misclick.
          </p>
        ) : users.length === 0 ? (
          <p className="text-xs text-white/35">
            No user matches that. They may not have signed up yet — a tier
            attaches to an account, so there is nothing to grant until they do.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Row
                key={u.id}
                user={u}
                busy={busyId === u.id}
                onToggle={(user, grant) =>
                  grant ? setConfirming(user) : void apply(user, false)
                }
              />
            ))}
          </div>
        )}
      </section>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[#0d0d0f] p-5">
            <h3 className="text-sm font-semibold text-white">
              Make this account a Partner?
            </h3>
            <p className="text-xs leading-relaxed text-white/55">
              <strong className="text-white/80">
                {confirming.username ?? confirming.email ?? confirming.id}
              </strong>{" "}
              gets a permanent Falcon floor: 50% cashback on every fee, forever,
              with no volume requirement. Confirmed here rather than on the row
              itself because it is a standing commercial commitment, not a
              display change.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-md px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void apply(confirming, true)}
                className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
              >
                Make partner
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
