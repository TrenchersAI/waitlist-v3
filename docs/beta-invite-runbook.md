# Beta access invite runbook

Campaign: `beta-access-v1`. Audience: waitlist v3 verified subscribers.
Destination: `beta.trenchers.ai`.

## What the pre-send audit found

Run `pnpm exec tsx scripts/list-hygiene-audit.ts` to reproduce any of this.

| Finding | Detail |
| --- | --- |
| List size | 12,029 rows, 10,474 verified, 10,457 mailable after exclusions |
| Gmail concentration | 82% of the whole list; 91% of waves 1-4 |
| **Webhook never fired** | 0 `EmailEvent` rows across 10,474 survey sends. Bounce and complaint history for that campaign does not exist. |
| **Referral farming** | One account referred 681 people; 2,730 verified users came from accounts with 50+ referrals, and only 12.5% of them ever engaged (vs 31% organic) |
| **Farm domains** | 1,145 addresses on six no-name domains, e.g. `wshu.net` with 806 signups that are ~100% referred |
| Proven-real subset | 2,425 people opened the tokenized survey link; 1,365 completed it |

The binding deliverability limits are **Resend's**, not Google's:
bounce < 4% and complaint < 0.08%, above which their AUP says an account
"may be shutdown without warning". Google's ceiling is 0.30%, so Resend is
almost 4x stricter and is what the abort gates key on.

## Waves

Grading lives in `src/lib/beta-invite.ts`; the query is in
`src/lib/beta-audience.ts`. Engagement outranks provenance, and suppression
(unverified, unsubscribed, bounced, complained, role, disposable, malformed)
is absolute.

| Wave | Count | Who |
| --- | --- | --- |
| `wave-1-completed` | 1,363 | Completed the survey |
| `wave-2-engaged` | 1,055 | Opened the survey, did not finish |
| `wave-3-organic` | 4,051 | Signed up directly, verified, never engaged |
| `wave-4-referred` | 1,582 | Referred by an ordinary referrer, never engaged |
| `wave-5-farm` | 2,406 | Referral-farm cohort, highest complaint risk |
| `excluded` | 1,572 | Never mailed |

Waves are the **send order**, not a filter. Sending best-first means a
reputation problem surfaces while the audience is still small and the
remaining waves can be stopped.

## Sequence

Everything is dry-run by default. Nothing sends without an explicit flag.

```bash
# 0. one-time: create the BetaInvite table.
#    Purely additive (one new table plus indexes), no existing table is
#    touched. Verify first with:
#      pnpm exec prisma migrate diff --from-config-datasource \
#        --to-schema prisma/schema.prisma --script
pnpm exec prisma db push

# 1. inspect the audience
pnpm exec tsx scripts/segment-audience.ts

# 2. create invite rows (idempotent; never re-grades an already-sent row)
pnpm exec tsx scripts/prepare-beta-invites.ts
pnpm exec tsx scripts/prepare-beta-invites.ts --write

# 3. grant access BEFORE mailing that wave
ST_API_BASE_URL=https://api.trenchers.ai OPS_SERVICE_TOKEN=... \
  pnpm exec tsx scripts/grant-beta-access.ts --wave wave-1-completed
ST_API_BASE_URL=... OPS_SERVICE_TOKEN=... \
  pnpm exec tsx scripts/grant-beta-access.ts --wave wave-1-completed --grant

# 4. send that wave
pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed
pnpm exec tsx scripts/send-beta-invites.ts --wave wave-1-completed --send

# repeat 3+4 per wave, pausing between to let webhooks settle
```

`send-beta-invites.ts` refuses to run if anyone in the wave has no
`accessGrantedAt`. The terminal is default-deny, so mailing "your access is
open" to someone who is not on `login_whitelist` lands them on a "your spot
is reserved" screen. Grant first, always.

## Prerequisites that are not done yet

1. **Resend webhook.** Configure it in the Resend dashboard pointing at
   `/api/webhooks/resend`, and set `RESEND_WEBHOOK_SECRET`. Until this
   exists, `bouncedAt` and `complainedAt` stay null, every rate reads 0.00%,
   and the abort gates are decorative. This is the single most important
   prerequisite, and it is exactly what hid the survey campaign's real numbers.
2. **DMARC `rua`.** Currently `dmarc_rua@onsecureserver.net`, a registrar
   default nobody reads. Point it somewhere we control. Keep `p=none` and
   `adkim=r`/`aspf=r`, because both alignment legs already pass and tightening
   `aspf` to strict would *break* SPF alignment, since the Return-Path is
   `send.trenchers.ai`.
3. **Google Postmaster Tools.** Verify the domain before sending; data is
   not backfilled. Note it is a post-mortem tool (24-48h lag), not a live
   signal.
4. **List verification.** ~$16-20 at Bouncer/ZeroBounce for the full list.
   Given there is no measured bounce history, this is the cheapest available
   substitute and it protects against Resend's 4% ceiling on the first big
   wave.

## Canonical host: always use www.trenchers.ai

`trenchers.ai` issues a **308 redirect to `www.trenchers.ai`**. Browsers
follow it, so survey links worked fine. Machine-to-machine POSTs generally
do not, which silently broke two things:

* **The Resend webhook.** Pointed at the apex it received a 308 and never
  reached the handler, so zero events were ever recorded. The endpoint must
  be `https://www.trenchers.ai/api/webhooks/resend`.
* **RFC 8058 one-click unsubscribe.** Gmail and Yahoo POST to the
  List-Unsubscribe URL. Against the apex that POST hits a redirect, so the
  opt-out can fail silently, and a user whose unsubscribe does nothing
  reaches for the spam button instead. That feeds complaint rate, which is
  the tightest constraint we have.

`NEXT_PUBLIC_SITE_URL` must therefore be `https://www.trenchers.ai`
everywhere, locally and in Vercel. Worth noting the survey campaign
recorded only 9 unsubscribes across 10,474 emails (0.086%), which is low
for a list of that age and consistent with some opt-outs having failed.

## Identity gotchas that shape the copy

The backend resolves a Privy login to an email only for `email` and
`google_oauth` linked accounts (`crates/st-signing/src/privy.rs`). Someone
invited at `alice@icloud.com` who signs in with **Apple or X** resolves to
no email and is **denied despite being whitelisted**. Matching is also
exact after lower-casing, with no plus-address or Gmail dot normalization.

That is why the email says, in both the HTML and text parts, to sign in
with the exact address it was sent to. It is a functional instruction, not
personalization.

## Why the email looks so plain

`src/email-templates/beta-invite/index.html`. No images, no `<style>`
block, no tables, no button, two links, ~1.8 KB. It mirrors the survey
invite that landed in Primary for the 10,474-send campaign.

Worth knowing, from the research: the Primary-vs-Promotions literature is
much weaker than its confidence suggests. The only large public dataset
(Return Path, 6B messages) found Promotions mail had *better* inbox
placement than uncategorized/Primary mail (84.5% vs 55.5%) and a read-rate
gap of only 2.8 points. The two levers Google has actually documented are
(a) a separate From address per content category and (b) not mixing
promotional and transactional content in one message. Per-recipient
engagement history dominates everything else, which is why waves 1-2, who
already engaged with this domain, are the safest possible opening.

Spam-folder placement, bounce rate, and complaint rate are the real risks.
Tab placement is a rounding error by comparison.
