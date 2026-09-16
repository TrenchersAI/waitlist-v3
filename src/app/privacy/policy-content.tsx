import Link from "next/link";
import {
  Ban,
  Blocks,
  Check,
  Database,
  EyeOff,
  Gauge,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  ScanEye,
  Server,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import { createLegalSections } from "@/src/components/legal/legal-doc";
import {
  Callout,
  Card,
  CardGrid,
  Code,
  EmailLink,
  GroupHeading,
  IconList,
  LINK_CLASS,
  List,
  Panel,
  PROSE_CLASS,
  RecordTable,
} from "@/src/components/legal/legal-ui";

import { PRIVACY_OUTLINE } from "./policy-sections";

const {
  Section: PolicySection,
  Subsection: PolicySubsection,
  Ref,
} = createLegalSections(PRIVACY_OUTLINE);

/*
 * The policy text. Section order and numbering follow the policy's markdown
 * source; keep them aligned so "§" references and deep links stay correct.
 * Company facts the draft left as placeholders are filled from what this site
 * already publishes (Trenchers AI, support@trenchers.ai). Retention is
 * stated as criteria, not durations, until real periods are enforced.
 */

/** A muted qualifier inside a table term: "Pyth, DexScreener and similar". */
function Muted({ children }: { children: string }) {
  return <span className="font-normal text-white/55">{children}</span>;
}

export function PolicyIntro() {
  return (
    <div className={cn(PROSE_CLASS, "mt-10 space-y-5 md:mt-12")}>
      <p>
        This Privacy Policy (the “<strong>Policy</strong>”) explains how{" "}
        <strong>Trenchers AI</strong> (“<strong>we</strong>”, “
        <strong>us</strong>”, “<strong>our</strong>”) collects, uses, shares and
        protects information about you when you use:
      </p>
      <List>
        <li>
          our websites at <Code>trenchers.ai</Code>,{" "}
          <Code>www.trenchers.ai</Code>, <Code>beta.trenchers.ai</Code> and{" "}
          <Code>docs.trenchers.ai</Code> (the “<strong>Site</strong>”);
        </li>
        <li>
          the Trenchers AI web application, including the terminal,
          Pulse/Trenches feeds, AI Agents, Rewards, the Arena and the wallet
          surfaces;
        </li>
        <li>
          the <strong>Trenchers AI mobile app</strong> for iOS and Android;
        </li>
        <li>our APIs and real-time data services; and</li>
        <li>
          any related tooling, notifications, support channels and on-chain
          programs we operate
        </li>
      </List>
      <p>
        (together, the “<strong>Services</strong>”). “<strong>You</strong>”
        and “<strong>your</strong>” mean you as a user of the Services.
      </p>
      <p>
        <strong>Please read this Policy carefully.</strong> By accessing the
        Site or using the Services you agree to the collection, use and
        disclosure of your information as described here. If you do not agree,
        please do not use the Services.
      </p>
      <Callout
        tone="accent"
        icon={ShieldCheck}
        title="Trenchers AI is a non-custodial trading interface, not a bank, broker or exchange."
      >
        <p>
          We do not hold your funds in the way a custodian does, and — except
          where <Ref to="2.1" /> says otherwise — we do not hold your private
          keys. Trading digital assets is risky and you may lose everything you
          put in. Nothing here is financial advice.
        </p>
      </Callout>
    </div>
  );
}

export function PolicyBody() {
  return (
    <div
      id="policy-body"
      className={cn(PROSE_CLASS, "mt-14 space-y-16 md:mt-16 md:space-y-20")}
    >
      <ShortVersion />
      <InformationWeCollect />
      <HowWeUseInformation />
      <BlockchainData />
      <SessionRecording />
      <AiFeatures />
      <Sharing />
      <PublicSurfaces />
      <ThirdPartyServices />
      <CookiesAndStorage />
      <PrivacyRights />
      <DeletingYourAccount />
      <DataRetention />
      <Security />
      <InternationalTransfers />
      <OtherThings />
    </div>
  );
}

function ShortVersion() {
  return (
    <PolicySection number="1">
      <p>This summary is for orientation only; the sections below govern.</p>
      <CardGrid>
        <Card
          icon={KeyRound}
          tone="protect"
          title="We never ask for your seed phrase or private key"
        >
          Sign-in runs through our authentication provider, Privy. If you
          import an external wallet, the key is encrypted{" "}
          <strong>in your browser</strong> and sharded inside Privy’s secure
          enclave — it never reaches our servers. We will never ask you for it,
          and neither will our support team.
        </Card>
        <Card
          icon={Wallet}
          title="We do collect your wallet addresses and trading activity"
        >
          Addresses, trades, positions, bot configuration and portfolio history
          are core to the product, and much of it is already public on Solana.
        </Card>
        <Card icon={ScanEye} tone="caution" title="We record product sessions">
          Session replay is <strong>on and unmasked</strong> on the web app.
          Screens showing balances, wallet addresses and PnL are captured. See{" "}
          <Ref to="5" />.
        </Card>
        <Card icon={Sparkles} tone="caution" title="AI chat leaves our systems">
          Messages you send to the AI agent or AI support are sent to
          third-party model providers. On mobile this requires your explicit
          consent first. See <Ref to="6" />.
        </Card>
        <Card
          icon={Ban}
          tone="protect"
          title="We do not sell your personal information"
        >
          We run no advertising networks and share no personal information for
          cross-context behavioural advertising.
        </Card>
        <Card
          icon={Blocks}
          tone="caution"
          title="On-chain data cannot be deleted"
        >
          Deleting your account deletes our records. It cannot delete the
          Solana blockchain. See <Ref to="4" />.
        </Card>
        <Card
          icon={Trash2}
          tone="protect"
          title="You can delete your account in-app"
        >
          Settings → Delete account, on web and mobile, with a data export
          first. See <Ref to="12" />.
        </Card>
        <Card icon={Mail} tone="accent" title="Questions">
          <EmailLink /> (see <Ref to="16.6" />).
        </Card>
      </CardGrid>
    </PolicySection>
  );
}

function InformationWeCollect() {
  return (
    <PolicySection number="2">
      <p>
        We collect information from three directions: what you give us, what
        we observe as you use the Services, and what we receive from third
        parties and from public blockchains.
      </p>

      <PolicySubsection number="2.1">
        <GroupHeading>Account and identity</GroupHeading>
        <RecordTable
          columns={["What", "Notes"]}
          rows={[
            [
              "Email address",
              "Collected through our authentication provider when you sign in with email. Used for your account, one-time sign-in codes, account-deletion confirmation codes and service notices.",
            ],
            [
              "Third-party sign-in identifiers",
              "If you sign in with a social or platform account (for example Google, Apple or X), we receive the identifier and basic profile fields that provider releases to us.",
            ],
            [
              "Username and display name",
              <>
                Chosen during onboarding. Your username is{" "}
                <strong>public</strong> on leaderboards and other shared
                surfaces.
              </>,
            ],
            [
              "Avatar / profile image",
              "Where you set one. Avatars may be generated or resolved through third-party avatar services.",
            ],
            [
              "Language, currency and display preferences",
              "Stored so the app looks the same on your next visit.",
            ],
            [
              "X (Twitter) account link",
              "If you verify an X account, we store the X user id, handle and verification timestamp, which unlocks X-linked rewards and features.",
            ],
            [
              "Referral code",
              "If you arrive through a referral link, we store the code so the referrer can be credited.",
            ],
          ]}
        />

        <GroupHeading>Wallets and keys</GroupHeading>
        <RecordTable
          columns={["What", "Notes"]}
          rows={[
            [
              "Wallet addresses",
              "Your embedded trading wallet address, your funding/deposit wallet, any external wallet you connect, any wallet you import, and the addresses of wallets created for your AI agents and bots. All are public Solana addresses.",
            ],
            [
              "External wallet connections",
              "If you connect a browser or hardware wallet (for example Phantom, Backpack, Ledger, Trust, Coin98) we see its public address and the signatures you approve.",
            ],
            [
              "Imported private keys",
              <>
                <strong>We never receive these.</strong> Import happens
                entirely in your browser: the key is encrypted client-side and
                sharded inside the authentication provider’s secure enclave.
                Our backend only ever receives the resulting wallet id and
                public address, and verifies with the provider that the wallet
                is yours.
              </>,
            ],
            [
              "Trading-session delegation",
              "If you enable one-tap trading, you grant a session signer so trades can execute without a pop-up each time. We record that the grant exists, when it was made, and its scope.",
            ],
            [
              "Bot and agent wallet keys",
              <>
                Agent and bot wallets are different: these keys{" "}
                <strong>are</strong> held by us, encrypted with envelope
                encryption (a per-bot key encrypted under a wrapped
                data-encryption key) and decrypted only in memory while a bot
                is running. See <Ref to="14" />.
              </>,
            ],
            [
              "Session wallet material stored on your device",
              "A browser-local session wallet may be stored in your browser’s IndexedDB. It lives on your device, not on our servers.",
            ],
          ]}
        />

        <GroupHeading>Trading, agents and configuration</GroupHeading>
        <List>
          <li>
            Orders, swaps, fills, cancellations, slippage and priority-fee
            settings, and the wallet each instruction came from.
          </li>
          <li>
            Positions, balances, realised and unrealised PnL, deposits,
            withdrawals and internal transfers.
          </li>
          <li>
            Paper-trading activity, which is simulated but recorded the same
            way.
          </li>
          <li>
            AI agent and bot configuration: strategy parameters, filters,
            gates, budgets, paper/live mode, schedules and lifecycle events
            (created, started, paused, resumed, archived).
          </li>
          <li>
            Watchlists, saved filters and presets, tracked wallets and
            copy-trade targets (including the third-party wallet addresses you
            choose to follow), tracked X handles, and alert and notification
            preferences.
          </li>
        </List>

        <GroupHeading>Content and communications</GroupHeading>
        <List>
          <li>
            <strong>AI chat</strong>: the messages you write to the in-app AI
            agent and to AI-assisted support, and the agent’s replies. See{" "}
            <Ref to="6" />.
          </li>
          <li>
            <strong>Support conversations</strong>: messages, attachments and
            metadata you send through in-app support, email or our community
            channels, including as a signed-out guest.
          </li>
          <li>
            <strong>Shared content</strong>: profit-share cards and any other
            content you publish or share. A share card is stored at a public
            URL and bound to your account — see <Ref to="8" />.
          </li>
          <li>
            Anything else you choose to send us: bug reports, feedback, survey
            answers, and correspondence with our team.
          </li>
        </List>

        <GroupHeading>Waitlist and surveys on the Site</GroupHeading>
        <List>
          <li>
            <strong>Waitlist</strong>: if you join the waitlist or verify your
            email address on the Site, we store that email address, a one-time
            verification code (cleared once you verify), your waitlist referral
            code and, if you arrived through someone’s referral link, who
            referred you.
          </li>
          <li>
            <strong>Surveys</strong>: if you answer a research survey we send
            you, we store your answers and any X (Twitter) or Telegram handle
            and country you choose to give us. With each response we also
            record the country derived from your IP address and your browser’s
            user-agent string.
          </li>
        </List>
      </PolicySubsection>

      <PolicySubsection number="2.2">
        <p>When you use the Services we and our providers collect:</p>
        <RecordTable
          columns={["Category", "Examples"]}
          rows={[
            [
              "Device and connection data",
              "IP address, browser type and version, operating system, device model, screen and viewport size, language, time zone, and (in the mobile app) the app version and build.",
            ],
            [
              "Approximate location",
              <>
                Derived from your IP address, at roughly city or country level.{" "}
                <strong>We do not collect precise GPS location</strong>; the web
                app explicitly disables the browser geolocation permission, and
                the mobile app requests no location permission.
              </>,
            ],
            [
              "Usage and product analytics",
              "Pages and routes viewed, features opened, clicks, and a defined catalogue of product events — for example sign-up, onboarding steps, trade submitted, order created or cancelled, bot created or started, deposit address copied, withdrawal submitted, tracker added, AI message sent, wallet import outcome. Events carry properties such as token mint, side, amount, slippage, order type and whether the action was paper or live.",
            ],
            [
              "Session replay",
              <>
                Video-like reconstructions of your session on the web app. See{" "}
                <Ref to="5" />.
              </>,
            ],
            [
              "Performance and reliability data",
              "Page-load and route-transition timings, web vitals, chart first-paint timings, WebSocket connection health, and real-user-monitoring telemetry.",
            ],
            [
              "Error and crash reports",
              "Stack traces, the URL or route where the error happened, browser and OS, a build identifier, and failed API calls you experienced.",
            ],
            [
              "Security and abuse signals",
              "Authentication attempts and failures, rate-limit events, and an append-only audit log of administrative and internal access to user data (who accessed what, when, from which IP, under which role).",
            ],
            [
              "Email engagement",
              "For emails sent from the Site — such as waitlist verification codes and survey and beta-access invitations — whether each message was delivered, bounced, failed or was marked as spam, and, for campaigns where we measure it, whether it was opened or a link in it was clicked.",
            ],
          ]}
        />
        <p>
          We take deliberate steps to keep sensitive values out of these
          streams: query strings are stripped from analytics URLs, DOM element
          attributes are masked in click capture, private-key input fields are
          excluded from session recording, and vendor error text is replaced by
          fixed categories rather than forwarded. These are engineering
          controls, not guarantees — see <Ref to="14" />.
        </p>
      </PolicySubsection>

      <PolicySubsection number="2.3">
        <RecordTable
          columns={["Source", "What we receive"]}
          rows={[
            [
              "Our authentication provider",
              "Your account identifier, verified email, linked accounts and the list of wallets on your account. We treat only the identifier from your browser as trusted; every other attribute is re-read from the provider’s server-side API.",
            ],
            [
              "Public Solana data",
              "Transactions, signatures, slots, timestamps, token transfers, balances, holder distributions, liquidity and pool state for the wallets and tokens you interact with or track. We receive this through blockchain data providers and streaming services.",
            ],
            [
              "Market and token data providers",
              "Prices, oracle feeds, routing quotes, pair and liquidity metadata, token metadata and images, holder and security analyses (including rug and honeypot checks), and trader rankings.",
            ],
            [
              "X (Twitter)",
              "For handles you subscribe to: public profile identity and follower statistics. For profit-share rewards: we search public X posts for the share link generated by your session, so a public post can be credited to you.",
            ],
            [
              "Fiat on-ramp partner",
              <>
                If you buy crypto with fiat through our on-ramp partner, that
                purchase happens on <strong>their</strong> platform under{" "}
                <strong>their</strong> terms and privacy policy, and they
                perform any identity verification. We receive confirmation and
                transaction metadata, not your identity documents or card
                details.
              </>,
            ],
            [
              "Public sources and community channels",
              "Anything you post publicly on our Discord, X or other community surfaces.",
            ],
          ]}
        />
      </PolicySubsection>

      <PolicySubsection number="2.4">
        <Panel>
          <IconList
            icon={Ban}
            iconClassName="text-emerald-300"
            items={[
              <>
                <strong>
                  We do not collect seed phrases, recovery phrases or private
                  keys for your personal wallets.
                </strong>{" "}
                No Trenchers AI employee, agent or support channel will ever ask
                for them. Any message that does is fraudulent — report it to{" "}
                <EmailLink />.
              </>,
              <>
                <strong>
                  We do not collect payment card or bank account details.
                </strong>{" "}
                Fiat purchases go through our on-ramp partner.
              </>,
              <>
                <strong>
                  We do not run our own KYC or identity verification
                </strong>
                , and we do not collect government identity documents.
              </>,
              <>
                <strong>We do not collect biometric data.</strong> Where you
                use Face ID, Touch ID or a passkey, the biometric stays on your
                device and we receive only the result.
              </>,
              <strong key="device-data">
                We do not collect precise location, contacts, photos,
                microphone or camera data.
              </strong>,
              <>
                <strong>
                  We do not knowingly collect information from anyone under 18.
                </strong>{" "}
                See <Ref to="16.1" />.
              </>,
            ]}
          />
        </Panel>
      </PolicySubsection>

      <PolicySubsection number="2.5">
        <p>
          We may de-identify or aggregate information so it can no longer
          reasonably be linked to you, and use it for any purpose — including
          volume statistics, market research, benchmarking and product
          analysis. Where we hold such information we maintain it in
          de-identified form and do not attempt to re-identify it, except to
          test that our de-identification works.
        </p>
      </PolicySubsection>
    </PolicySection>
  );
}

function HowWeUseInformation() {
  return (
    <PolicySection number="3">
      <p>
        We use information to run and improve the Services. Where the GDPR or a
        similar law applies, the legal basis is shown alongside each purpose.
      </p>
      <RecordTable
        columns={["Purpose", "Examples", "Legal basis"]}
        grid="md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,11rem)]"
        rows={[
          [
            "Provide the Services",
            "Create and maintain your account; authenticate you; show your portfolio and positions; route, quote and execute trades; run agents and bots; stream real-time market and wallet data; deliver alerts and notifications.",
            "Performance of a contract",
          ],
          [
            "Payments, fees and rewards",
            "Calculate and collect platform fees; compute points, ranks, streaks, rakeback and referral earnings; process claims.",
            "Performance of a contract",
          ],
          [
            "Support",
            "Answer your tickets, reproduce the problem you reported, and keep a history so you don’t have to repeat yourself.",
            "Performance of a contract; legitimate interests",
          ],
          [
            "Security, fraud and abuse prevention",
            "Rate limiting; detecting bots, farming and multi-account abuse; screening for illicit on-chain activity; investigating incidents; keeping an audit trail of internal access.",
            "Legitimate interests; legal obligation",
          ],
          [
            "Product analytics and improvement",
            "Understand which features are used and where users get stuck; measure funnels; fix bugs; test performance changes.",
            "Legitimate interests (or consent where required)",
          ],
          [
            "Session replay",
            "Watch real sessions to understand a confusing flow or reproduce a defect.",
            <>
              Legitimate interests (or consent where required) — see{" "}
              <Ref to="5" />
            </>,
          ],
          [
            "AI features",
            "Answer your questions, explain and apply agent configuration, and draft support replies.",
            "Performance of a contract; consent where we ask for it",
          ],
          [
            "Communications",
            "Sign-in codes, deletion confirmation codes, security and service notices, and — where you have opted in or where permitted — product news.",
            "Performance of a contract; consent; legitimate interests",
          ],
          [
            "Legal and compliance",
            "Respond to lawful requests; comply with tax, financial and sanctions obligations; produce tax reports you request; enforce our Terms; establish or defend legal claims.",
            "Legal obligation; legitimate interests",
          ],
          [
            "Corporate transactions",
            "Diligence for a merger, acquisition, financing or reorganisation.",
            "Legitimate interests",
          ],
        ]}
      />
      <p>
        Where we rely on <strong>legitimate interests</strong>, we have weighed
        those interests against your rights and consider the processing
        proportionate. You can object — see <Ref to="11" />.
      </p>
    </PolicySection>
  );
}

function BlockchainData() {
  return (
    <PolicySection number="4">
      <p className="text-[18px] leading-[1.6] text-white/85 md:text-[19px]">
        This is the most important thing to understand about privacy in a
        Solana trading app.
      </p>
      <Panel className="border-[#8B93FF]/20 bg-[#8B93FF]/4">
        <List>
          <li>
            <strong>Solana is a public blockchain.</strong> Every transaction
            we submit on your behalf, and every transaction you sign yourself,
            is broadcast publicly, is permanently recorded, and is visible to
            anyone in the world, forever. That includes the wallet address, the
            token, the amount, the counterparty program and the time.
          </li>
          <li>
            <strong>We cannot delete, alter or hide on-chain data.</strong> No
            one can — not us, not you, not any regulator. If you exercise a
            deletion or erasure right, we delete what is in <em>our</em>{" "}
            systems; the chain is untouched.
          </li>
          <li>
            <strong>Addresses are pseudonymous, not anonymous.</strong> Anyone
            who links your address to your identity — through an exchange
            deposit, a public post, a share card, a leaderboard entry, or chain
            analysis — can then see your entire trading history on that
            address.
          </li>
          <li>
            <strong>
              Our own records of on-chain activity are retained indefinitely
            </strong>
            , because they duplicate information that is already permanently
            public and are needed to keep the product working, to report
            accurately, and to prevent fraud.
          </li>
        </List>
      </Panel>
      <p>
        If on-chain visibility is a concern for you, treat your address as
        public information and consider using separate wallets for separate
        purposes.
      </p>
    </PolicySection>
  );
}

function SessionRecording() {
  return (
    <PolicySection number="5">
      <Callout
        tone="caution"
        icon={ScanEye}
        title="We record sessions on the web app, and the recordings are not masked."
      />
      <p>
        We want to be plain about this because it goes further than many
        products:
      </p>
      <List>
        <li>
          Session replay is <strong>enabled</strong> in the Trenchers AI web app.
          It reconstructs what happened on screen — page content, navigation,
          clicks, scrolling and typed input — so we can see exactly how a flow
          behaved.
        </li>
        <li>
          Recording is <strong>deliberately unmasked</strong>: screens showing{" "}
          <strong>
            wallet addresses, balances, positions, PnL and AI-agent
            conversations are captured as rendered
          </strong>
          .
        </li>
        <li>
          Two protections are built in, and they are the boundaries of what we
          capture:
          <Panel className="mt-4 p-4 sm:p-5">
            <IconList
              icon={EyeOff}
              iconClassName="text-emerald-300"
              items={[
                <>
                  Fields that can hold <strong>private-key material</strong>{" "}
                  (the wallet-import inputs) are explicitly excluded from
                  recording, so a pasted key is not captured. Password fields
                  are masked by default, and the private-key{" "}
                  <strong>export</strong> flow runs inside a cross-origin frame
                  the recorder cannot see, so exported keys never enter a
                  recording.
                </>,
                <strong key="network">
                  Network request and response bodies and headers are not
                  recorded.
                </strong>,
              ]}
            />
          </Panel>
        </li>
        <li>
          Recordings are stored by our analytics provider (see{" "}
          <Ref to="7.1" />) and are used for product and support purposes only.
        </li>
        <li>
          Session replay runs on the <strong>web app only</strong>. The mobile
          app does not record sessions.
        </li>
      </List>
      <p>
        Alongside replay we collect the analytics events described in{" "}
        <Ref to="2.2" />. Analytics identify you by your Trenchers AI user id once
        you are signed in; before sign-in, anonymous traffic is not built into a
        person profile. Full URLs are stripped of query strings before they
        reach analytics, so referral codes, addresses and one-time tokens in a
        link are not forwarded.
      </p>
      <p>
        If you would rather not be recorded or measured, see <Ref to="11" />{" "}
        and <Ref to="10.3" />.
      </p>
    </PolicySection>
  );
}

function AiFeatures() {
  return (
    <PolicySection number="6">
      <p>
        The Services include AI features: an in-app AI agent that advises on
        and configures trading agents, AI-assisted insights, and AI-assisted
        customer support.
      </p>
      <p>
        <strong>What leaves our systems.</strong> When you use an AI feature,
        the content of your request is sent to a third-party AI model provider
        over their API. Depending on the feature this can include:
      </p>
      <List>
        <li>the free-form text you type;</li>
        <li>the conversation history for that thread;</li>
        <li>
          context about the thing you are asking about — for example an agent’s
          configuration, its recent trades, positions and account state; and
        </li>
        <li>
          for AI-assisted support, a read-only context pack about your account
          (profile, wallets, deposits, positions, bots and points) so the
          answer is grounded in your actual situation rather than guesswork.
        </li>
      </List>
      <p>
        <strong>Who processes it.</strong> Our primary AI provider is{" "}
        <strong>Anthropic</strong>. Our infrastructure supports additional
        providers (for example OpenAI, Google and DeepSeek), and we may route
        requests to them. These providers process the data as our service
        providers under their API terms, and we do not authorise them to use
        your content to train their models.
      </p>
      <p>
        <strong>Consent on mobile.</strong> In the mobile app you must give{" "}
        <strong>explicit consent before the first AI request is sent</strong>,
        and no AI feature will transmit anything until you do. You can{" "}
        <strong>withdraw that consent at any time</strong> in app settings. The
        app remains usable without AI. If what we share with AI providers
        materially changes, we will ask again rather than rely on your earlier
        consent.
      </p>
      <Callout
        tone="caution"
        icon={TriangleAlert}
        title="Please don’t paste secrets into AI chat."
      >
        <p>
          Never type a seed phrase, private key or password into any chat — AI
          or human. AI output can be wrong: it is information, not financial
          advice, and you are responsible for the trades and configurations you
          approve.
        </p>
      </Callout>
    </PolicySection>
  );
}

function Sharing() {
  return (
    <PolicySection number="7">
      <p>
        We do not sell your personal information, and we do not share it for
        cross-context behavioural advertising. We share it in the following
        circumstances.
      </p>

      <PolicySubsection number="7.1">
        <p>
          These vendors process information on our behalf, under contract, for
          the purposes we specify. The table reflects our stack at the date of
          this Policy.
        </p>
        <RecordTable
          columns={["Provider", "Purpose", "What they receive"]}
          rows={[
            [
              "Privy",
              "Authentication and embedded/imported wallet infrastructure",
              "Email or social identifier, account identifier, wallet addresses, encrypted key shares, signing requests",
            ],
            [
              "PostHog",
              "Product analytics and session replay",
              "User id, device and connection data, analytics events, session recordings",
            ],
            [
              "Microsoft Azure",
              "Cloud hosting, databases, object storage, and Application Insights real-user monitoring",
              "All hosted data; RUM page views, timings, exceptions",
            ],
            [
              "Cloudflare",
              "DNS, CDN, edge caching and abuse protection",
              "IP address, request metadata",
            ],
            [
              "Vercel",
              "Web app hosting and edge functions",
              "IP address, request metadata",
            ],
            [
              "Resend",
              "Email delivery: sign-in and deletion codes, notices, and the Site’s waitlist verification codes and survey and beta-access invitations",
              "Email address, message content",
            ],
            [
              <>
                Anthropic <Muted>(and other model providers we use)</Muted>
              </>,
              "AI agent, AI insights, AI-assisted support",
              <>
                AI prompts and context as described in <Ref to="6" />
              </>,
            ],
            [
              <>
                Helius <Muted>(including LaserStream)</Muted>
              </>,
              "Solana RPC and streaming chain data",
              "Wallet addresses, token mints, transaction queries",
            ],
            [
              "Jupiter",
              "Swap routing and quotes",
              "Wallet address, token pair, amount, slippage",
            ],
            [
              "Jito",
              "Transaction bundling and priority execution",
              "Transaction contents, tip account",
            ],
            [
              <>
                Pyth, DexScreener, Birdeye <Muted>and similar</Muted>
              </>,
              "Prices, pairs, liquidity, token and trader metadata",
              "Token mints, and wallet addresses where you look one up",
            ],
            [
              <>
                GoPlus, RugCheck <Muted>and similar</Muted>
              </>,
              "Token security and rug analysis",
              "Token mints",
            ],
            [
              "X (Twitter) API",
              "Handle resolution, social feed, share-reward verification",
              "Handles you subscribe to; public post search for your share link",
            ],
            [
              "Onramper",
              "Fiat on-ramp",
              "Handled on their platform under their policy; they perform any identity checks",
            ],
            [
              <>
                WalletConnect <Muted>and wallet adapters</Muted>
              </>,
              "External wallet connection",
              "Public address, connection and signing requests",
            ],
          ]}
        />
        <Callout tone="protect" icon={Server}>
          <p>
            We also self-host <strong>GlitchTip</strong> (error tracking) and{" "}
            <strong>Chatwoot</strong> (support ticketing) on our own
            infrastructure, so that error reports and support conversations stay
            within our environment rather than going to a third-party SaaS.
          </p>
        </Callout>
      </PolicySubsection>

      <PolicySubsection number="7.2">
        <p>
          Some information is public by design. See <Ref to="8" />.
        </p>
      </PolicySubsection>

      <PolicySubsection number="7.3">
        <p>
          We may disclose information where we believe in good faith that it is
          necessary to comply with applicable law, regulation, sanctions
          obligations, legal process or a lawful government request; to enforce
          our{" "}
          <Link href="/terms" className={LINK_CLASS}>
            Terms
          </Link>{" "}
          and other agreements; to detect, prevent or address fraud, security
          or technical issues; or to protect the rights, property or safety of
          Trenchers AI, our users or the public.
        </p>
      </PolicySubsection>

      <PolicySubsection number="7.4">
        <p>
          If we are involved in a merger, acquisition, financing,
          reorganisation, bankruptcy or sale of assets, information may be
          transferred as part of that transaction or its diligence. We will seek
          to ensure the recipient honours this Policy, and we will notify you
          where the law requires it.
        </p>
      </PolicySubsection>

      <PolicySubsection number="7.5">
        <p>
          We may share information with our auditors, lawyers, accountants and
          insurers, and with our affiliates and group companies, for the
          purposes described in this Policy.
        </p>
      </PolicySubsection>

      <PolicySubsection number="7.6">
        <p>
          We share information where you ask us to — for example when you
          connect an external service, publish a share card, or use the Services
          to transact on a public blockchain.
        </p>
      </PolicySubsection>
    </PolicySection>
  );
}

function PublicSurfaces() {
  return (
    <PolicySection number="8">
      <p>The following are visible to other users, or to anyone on the internet:</p>
      <RecordTable
        columns={["Surface", "What is public"]}
        rows={[
          [
            "Leaderboards and Rewards",
            "Your username, rank, points, and trading-versus-referral breakdown.",
          ],
          [
            "The Arena",
            "Entrant standings, configurations, trades and equity curves for house-run bots, and — where you clone an entrant — the fact of the clone’s provenance. The Arena is readable without signing in.",
          ],
          [
            "Profit-share cards",
            <>
              A share card you generate is stored at a public URL (
              <Code>{"/s/{id}"}</Code>) that anyone with the link can open. It
              shows the trading result you chose to share. Sharing is your
              choice; the link is public once created.
            </>,
          ],
          [
            "Share-reward verification",
            "If you post a share link publicly on X, we search public X posts for that link in order to credit the reward to the account that generated it.",
          ],
          [
            "Deletion status page",
            <>
              The <Code>{"/deletion-status/{receipt}"}</Code> page is public to
              anyone holding the receipt id, so you can check a deletion after
              you have signed out. It shows deletion status only.
            </>,
          ],
          [
            "Community channels",
            "Anything you post in our Discord, X or other public channels.",
          ],
          [
            "On-chain activity",
            <>
              Everything in <Ref to="4" />.
            </>,
          ],
        ]}
      />
      <Callout icon={Info}>
        <p>
          Choose a username you are comfortable being seen with, and remember
          that a username plus a public wallet address ties your trading history
          to your identity.
        </p>
      </Callout>
    </PolicySection>
  );
}

function ThirdPartyServices() {
  return (
    <PolicySection number="9">
      <p>
        The Services link to, embed and interoperate with third-party sites and
        services — block explorers, token analytics panels, wallet providers,
        the fiat on-ramp, social platforms and others. When you follow a link or
        use an embedded panel, that third party receives your request (including
        your IP address) and handles your information under{" "}
        <strong>its</strong> privacy policy, not ours. We do not control those
        services, are not responsible for their practices, and including a link
        is not an endorsement.
      </p>
      <p>
        Integrations you initiate yourself — connecting a wallet, linking a
        social account, using the on-ramp — will share information with that
        provider by design. Review their terms before connecting.
      </p>
    </PolicySection>
  );
}

function CookiesAndStorage() {
  return (
    <PolicySection number="10">
      <PolicySubsection number="10.1">
        <p>
          <strong>
            The Trenchers AI web app does not set its own tracking cookies.
          </strong>{" "}
          Instead, it stores data in your browser’s{" "}
          <strong>localStorage</strong>, <strong>sessionStorage</strong> and{" "}
          <strong>IndexedDB</strong>, including:
        </p>
        <List>
          <li>your session token and authentication state;</li>
          <li>your language, currency, display and notification preferences;</li>
          <li>saved filters, presets, watchlist and terminal state;</li>
          <li>onboarding and product-tour progress;</li>
          <li>
            support session identifiers (guest sessions are kept per-tab so a
            shared browser doesn’t leak one person’s tickets to the next);
          </li>
          <li>a referral code, if you arrived through a referral link;</li>
          <li>AI consent state (mobile);</li>
          <li>browser-local session wallet material, where you use one.</li>
        </List>
        <p>
          The <strong>mobile app</strong> uses the equivalent device storage
          (AsyncStorage) plus the platform secure store for sensitive values.
        </p>
        <p>
          The <strong>Site</strong> keeps the email address you verified for
          the waitlist in localStorage and sets one first-party cookie,{" "}
          <Code>trencher_verified</Code>, which expires after 30 days, so a
          returning visit shows your waitlist status straight away. Neither is
          used for tracking or advertising.
        </p>
      </PolicySubsection>

      <PolicySubsection number="10.2">
        <p>
          Third parties embedded in the Services — our authentication provider,
          analytics provider, support widget, embedded analytics panels and
          CDN — may set their own cookies or local storage on your device,
          subject to their own policies.
        </p>
      </PolicySubsection>

      <PolicySubsection number="10.3">
        <List>
          <li>
            <strong>Browser controls.</strong> Most browsers let you block or
            delete cookies and site data. Blocking or clearing storage for the
            Services will sign you out and reset your preferences, and{" "}
            <strong>
              if you use a browser-local session wallet, clearing site data can
              destroy the only key to any funds it holds
            </strong>{" "}
            — move those funds first.
          </li>
          <li>
            <strong>Opt out of analytics and recording.</strong> See{" "}
            <Ref to="11" />, or contact us at <EmailLink />.
          </li>
          <li>
            <strong>Do Not Track.</strong> There is no finalised standard for
            how sites should respond to browser “Do Not Track” signals, and like
            most sites we do not currently respond to them. Where required by
            law, we do honour opt-out preference signals such as{" "}
            <strong>Global Privacy Control (GPC)</strong>.
          </li>
          <li>
            <strong>Mobile.</strong> You can reset your advertising identifier
            or limit ad tracking in your device settings. We do not use
            advertising identifiers for advertising.
          </li>
        </List>
      </PolicySubsection>
    </PolicySection>
  );
}

function PrivacyRights() {
  return (
    <PolicySection number="11">
      <p>
        Depending on where you live, you may have some or all of the following
        rights. Some apply only in certain circumstances, and all can be limited
        by law.
      </p>
      <CardGrid className="xl:grid-cols-3">
        <Card title="Access / know">
          What personal information we hold, how we use it, and who we share it
          with.
        </Card>
        <Card title="Correct">Inaccurate or outdated personal information.</Card>
        <Card title="Delete">
          Personal information we hold about you (see <Ref to="12" /> and the
          on-chain limits in <Ref to="4" />).
        </Card>
        <Card title="Portability">
          A copy of information you provided, in a portable format. The in-app{" "}
          <strong>Download my data</strong> export does exactly this.
        </Card>
        <Card title="Restrict or object">
          To processing based on our legitimate interests, including profiling
          and analytics.
        </Card>
        <Card title="Withdraw consent">
          Where we rely on consent, at any time and without affecting prior
          processing. Mobile AI consent is withdrawable in app settings.
        </Card>
        <Card title="Opt out of marketing">
          Via the unsubscribe link in any marketing email. We will still send
          transactional and security messages.
        </Card>
        <Card title="Non-discrimination">
          We will not deny you service, charge you a different price or give you
          a lower quality of service for exercising these rights.
        </Card>
        <Card title="Complain" className="sm:col-span-2 xl:col-span-1">
          To your supervisory authority or regulator. We would rather you came
          to us first at <EmailLink />.
        </Card>
      </CardGrid>
      <p>
        <strong>How to exercise them.</strong> Email <EmailLink />, or use the
        in-app account-deletion and data-export flows. We may need to verify
        your identity before acting — typically by confirming control of the
        email address or wallet on the account. An authorised agent may act for
        you with written proof of authorisation, and we may still verify with
        you directly. We respond within the period the applicable law requires.
      </p>

      <PolicySubsection number="11.1">
        <p>
          Our legal bases are set out in <Ref to="3" />. You have the rights
          above under the GDPR and UK GDPR, including the right to lodge a
          complaint with your local data protection authority.
        </p>
        <p>
          The controller of your personal data is{" "}
          <strong>Trenchers AI</strong>, which you can contact at{" "}
          <EmailLink />.
        </p>
      </PolicySubsection>

      <PolicySubsection number="11.2">
        <p>
          For purposes of the CCPA/CPRA, “personal information” includes
          “sensitive personal information”.
        </p>
        <p>
          In the preceding 12 months we have collected, and disclosed for a
          business purpose, the following categories:
        </p>
        <List>
          <li>
            <strong>Identifiers</strong> (email, user id, wallet address, IP
            address, device identifiers);
          </li>
          <li>
            <strong>California Customer Records information</strong> (name or
            username, email);
          </li>
          <li>
            <strong>Commercial information</strong> (trading and transaction
            activity, fees, rewards);
          </li>
          <li>
            <strong>Internet or other electronic network activity</strong>{" "}
            (usage, analytics, session recordings, support and AI
            conversations);
          </li>
          <li>
            <strong>Approximate geolocation</strong> (from IP);
          </li>
          <li>
            <strong>Inferences</strong> (product segments and engagement); and
          </li>
          <li>
            <strong>Account access credentials*</strong> (authentication tokens
            and, for bot wallets, encrypted key material).
          </li>
        </List>
        <p className="text-[15px] text-white/55">
          * Denotes sensitive personal information, which we use only for the
          purposes permitted by the CCPA and not to infer characteristics about
          you.
        </p>
        <p>
          Sources, purposes and disclosure recipients are described in{" "}
          <Ref to="2" />, <Ref to="3" /> and <Ref to="7" />; retention criteria
          are in <Ref to="13" />.
        </p>
        <p>
          <strong>We do not “sell” or “share” personal information</strong> as
          those terms are defined by the CCPA, and we have not done so in the
          preceding 12 months. We do not have actual knowledge that we sell or
          share the personal information of consumers under 16 years of age.
        </p>
        <p>
          California’s “Shine the Light” law lets California residents request
          details of personal information disclosed to third parties for those
          parties’ direct marketing purposes. We do not disclose personal
          information for that purpose.
        </p>
        <p>
          California residents under 18 with a registered account may request
          removal of content they posted publicly on the Services. Removal
          cannot be complete or comprehensive — others may have republished it,
          and archives we do not control may retain copies. In any event, the
          Services are not available to anyone under 18 (<Ref to="16.1" />).
        </p>
      </PolicySubsection>

      <PolicySubsection number="11.3">
        <p>
          Residents of Virginia, Colorado, Connecticut, Utah, Texas and other
          states with comprehensive privacy laws have rights of access,
          correction, deletion, portability, and opt-out of targeted
          advertising, sale and certain profiling. We do not conduct targeted
          advertising, sell personal data, or engage in profiling that produces
          legal or similarly significant effects.
        </p>
        <p>
          If we decline your request you may <strong>appeal</strong> by replying
          to our decision or emailing <EmailLink /> with “Appeal” in the subject
          line. We will respond in writing within the statutory period, and if we
          deny the appeal we will tell you how to complain to your state Attorney
          General.
        </p>
      </PolicySubsection>

      <PolicySubsection number="11.4">
        <p>
          Where the Digital Personal Data Protection Act, 2023 applies, you have
          rights of access, correction, completion, updating, erasure and
          grievance redressal, and the right to nominate another person to
          exercise your rights in the event of death or incapacity. To exercise
          them or raise a grievance, contact <EmailLink />.
        </p>
        <p>
          Our tax reporting features — including the Indian financial-year
          summary and Schedule VDA export — are computed from your own trade
          history at your request. They are a convenience, not tax advice, and
          we do not file anything on your behalf.
        </p>
      </PolicySubsection>

      <PolicySubsection number="11.5">
        <p>
          If you live in France, you may give general or specific instructions
          about the retention, deletion and communication of your personal data
          after your death, appoint someone to carry them out, and modify or
          withdraw them at any time.
        </p>
      </PolicySubsection>
    </PolicySection>
  );
}

function DeletingYourAccount() {
  return (
    <PolicySection number="12">
      <p>
        You can delete your Trenchers AI account from within the app:{" "}
        <strong>Settings → Delete account</strong> (
        <Code>/settings/delete-account</Code> on web, and the equivalent screen
        in the mobile app).
      </p>
      <Callout
        tone="caution"
        icon={Wallet}
        title="Before you delete, move your money."
      >
        <p>
          The flow shows a live checklist of what stands between you and
          deletion — open positions, running bots, funded bot wallets, unclaimed
          rewards, and any balance we cannot read. Some items block deletion
          until you resolve them; others you must acknowledge as lost.{" "}
          <strong>You are responsible for withdrawing your funds first.</strong>{" "}
          We cannot recover funds from a wallet after the account that surfaced
          it is gone.
        </p>
      </Callout>
      <p>
        <strong>Take your data with you.</strong> “Download my data” produces a
        JSON file with your profile and your trade history before you proceed.
      </p>
      <Panel title="What deletion does">
        <IconList
          icon={Check}
          iconClassName="text-emerald-300"
          items={[
            "We verify it is really you: a code emailed to your address, or a fresh re-authentication if you have no email on file.",
            "You confirm by typing a confirmation word and acknowledging what will be lost.",
            <>
              We give you a <strong>receipt id</strong> and a public status page
              so you can check progress after signing out.
            </>,
            "Optionally, we clear Trenchers AI data from the device you are on. The browser-local session wallet is only cleared when the checklist confirms it holds nothing — because that key is the only way to move what it holds.",
            <>
              Your account is closed. Every authenticated request afterwards is
              refused, your live sessions are disconnected, and signing in again
              with the same identity does <strong>not</strong> restore the
              account — it creates a new one. Your username is retired and not
              reissued to you.
            </>,
          ]}
        />
      </Panel>
      <Panel title="What deletion cannot do">
        <IconList
          icon={X}
          iconClassName="text-amber-300"
          items={[
            <>
              It cannot delete anything from the Solana blockchain (
              <Ref to="4" />
              ).
            </>,
            "It cannot remove content already republished or archived by others.",
            <>
              It does not delete records we must keep by law, for tax,
              accounting, sanctions, fraud-prevention, security or dispute
              purposes; nor records held under a legal hold. We retain those for
              the periods in <Ref to="13" /> and then delete or de-identify
              them.
            </>,
            "Backups roll off on their own schedule; deleted data can persist in backups until they are overwritten.",
          ]}
        />
      </Panel>
      <p>
        Can’t get into the app?{" "}
        <Link href="/delete-account" className={LINK_CLASS}>
          Request deletion by email
        </Link>
        .
      </p>
    </PolicySection>
  );
}

function DataRetention() {
  return (
    <PolicySection number="13">
      <p>
        We keep personal information only as long as we need it for the
        purposes in this Policy, and we weigh whether we still need it to
        provide the Services, maintain security and integrity, prevent fraud,
        comply with legal obligations, resolve disputes and enforce our
        agreements.
      </p>
      <RecordTable
        columns={["Category", "Retention"]}
        rows={[
          [
            "Account and profile data",
            "For the life of your account, then deleted or de-identified after closure, subject to the exceptions below.",
          ],
          [
            <>
              Public blockchain data{" "}
              <Muted>(addresses, signatures, on-chain transactions)</Muted>
            </>,
            <>
              <strong>Indefinitely</strong> — it is permanently public and is
              needed to operate and report accurately.
            </>,
          ],
          [
            "Trade, order, fee, reward and balance records",
            "For as long as financial, tax and regulatory reporting obligations require, and as long as needed to investigate fraud.",
          ],
          [
            "IP addresses, session and security logs",
            "For as long as needed for security, abuse prevention, integrity and compliance.",
          ],
          [
            "Analytics and usage data",
            "For the retention period configured with our analytics provider.",
          ],
          [
            "Session recordings",
            "For the recording retention period configured with our analytics provider.",
          ],
          [
            "AI conversations",
            "For as long as needed so a conversation continues across sessions and so we can investigate incorrect answers.",
          ],
          [
            "Support conversations",
            "For as long as needed after the ticket is resolved, so you don’t have to repeat yourself if the problem returns.",
          ],
          [
            "Error and crash reports",
            "For as long as needed to diagnose and fix the underlying problem.",
          ],
          [
            "Internal access audit log",
            "Append-only, and retained for as long as security and compliance require, because its value is that it cannot be edited.",
          ],
          ["Backups", "Until they are overwritten by our backup rotation."],
        ]}
      />
      <p>Aggregated and de-identified information may be retained indefinitely.</p>
    </PolicySection>
  );
}

function Security() {
  return (
    <PolicySection number="14">
      <p>
        We implement commercially reasonable technical and organisational
        measures to protect information, including:
      </p>
      <CardGrid>
        <Card icon={LockKeyhole} title="Encryption in transit">
          TLS everywhere, HSTS with preload, and a Content Security Policy
          restricting where the app may connect.
        </Card>
        <Card icon={Database} title="Encryption at rest">
          For databases and object storage.
        </Card>
        <Card
          icon={KeyRound}
          tone="accent"
          title="Key custody"
          className="sm:col-span-2"
        >
          Your personal wallet keys are held by our authentication provider’s
          secure enclave infrastructure, not by us. Agent and bot wallet keys
          that we do hold are protected with envelope encryption: a per-bot key
          encrypted under a data-encryption key that is itself wrapped by a
          secrets manager, decrypted only in memory while a bot is running and
          zeroised when it stops. A database compromise alone does not expose
          spendable keys.
        </Card>
        <Card icon={Timer} title="Short-lived sessions">
          Our application session token is short-lived and re-issued, and
          sessions are revoked server-side on deletion or compromise.
        </Card>
        <Card icon={ShieldCheck} title="Least privilege">
          Role-based access control on internal endpoints, a read-only database
          role for AI-assisted support, and an{" "}
          <strong>append-only audit log</strong> of internal and administrative
          access to user data.
        </Card>
        <Card icon={Gauge} title="Rate limiting and abuse controls">
          Across authentication, trading and read-heavy endpoints.
        </Card>
        <Card icon={EyeOff} title="Isolation of sensitive input">
          Private-key entry fields are excluded from session recording, and key
          export runs in an isolated frame.
        </Card>
      </CardGrid>
      <p>
        <strong>No system is perfectly secure.</strong> We cannot guarantee the
        security of information transmitted to or from the Services, and you
        transmit it at your own risk. Protect your own side too: use a strong,
        unique password on your email account, enable two-factor
        authentication, keep your devices patched, and do not share your account
        access.
      </p>
      <Callout tone="caution" icon={TriangleAlert} title="Beware of phishing.">
        <p>
          We will never ask for your seed phrase, private key, password or
          one-time code. If you receive such a request, do not respond — report
          it to <EmailLink />.
        </p>
      </Callout>
      <p>
        If we become aware of a breach affecting your personal information, we
        will notify you and the relevant authorities where the law requires it.
      </p>
    </PolicySection>
  );
}

function InternationalTransfers() {
  return (
    <PolicySection number="15">
      <p>
        Our core infrastructure runs in{" "}
        <strong>Microsoft Azure in the European Union (Germany)</strong>. Some
        providers we rely on — including our analytics provider and AI model
        providers — process data in the <strong>United States</strong>, and CDN
        and edge services may process request metadata in the region closest to
        you.
      </p>
      <p>
        Wherever you are, your information may be transferred to, stored in and
        processed in countries whose data protection laws differ from your own.
        Where we transfer personal data out of the EEA, the UK or Switzerland to
        a country without an adequacy decision, we rely on appropriate
        safeguards — typically the European Commission’s{" "}
        <strong>Standard Contractual Clauses</strong> (with the UK Addendum
        where applicable) — together with supplementary measures where needed.
        You may request a copy of the relevant safeguards at <EmailLink />.
      </p>
    </PolicySection>
  );
}

function OtherThings() {
  return (
    <PolicySection number="16">
      <PolicySubsection number="16.1">
        <p>
          The Services are <strong>not intended for anyone under 18</strong>,
          and we do not knowingly collect personal information from children. By
          using the Services you represent that you are at least 18. If we learn
          that we have collected information from a child, we will take
          commercially reasonable steps to delete it. Parents and guardians can
          contact us at <EmailLink />.
        </p>
      </PolicySubsection>

      <PolicySubsection number="16.2">
        <p>The iOS and Android apps follow this Policy, with these differences:</p>
        <List>
          <li>
            <strong>No session replay.</strong> The mobile app does not record
            sessions.
          </li>
          <li>
            <strong>Explicit AI consent.</strong> Nothing is sent to an AI
            provider until you agree, and you can withdraw consent in settings (
            <Ref to="6" />
            ).
          </li>
          <li>
            <strong>In-app account deletion</strong> is available in settings (
            <Ref to="12" />
            ).
          </li>
          <li>
            <strong>Platform permissions.</strong> The app requests no location,
            camera, microphone, contacts or photo-library access. Device
            biometrics and passkeys are handled by the operating system; we
            receive only the authentication result.
          </li>
          <li>
            <strong>Feature availability differs by platform</strong> for
            regulatory and app-store reasons; some trading and rewards features
            are available only on the web.
          </li>
          <li>
            Our App Store privacy details and Google Play data safety
            disclosures are derived from this Policy.
          </li>
        </List>
      </PolicySubsection>

      <PolicySubsection number="16.3">
        <p>
          We do not make decisions producing legal or similarly significant
          effects about you based solely on automated processing. AI agents
          execute trades{" "}
          <strong>according to the configuration you set and approve</strong>;
          that is automation you control, not a decision we make about you.
        </p>
      </PolicySubsection>

      <PolicySubsection number="16.4">
        <p>
          We may update this Policy. When we do, we will change the “Last
          updated” date at the top. If we make material changes to how we
          collect, use or share personal information, we will make reasonable
          efforts to notify you in advance — by in-app notice, email, or another
          method the law requires. Your continued use of the Services after an
          update takes effect means you accept the revised Policy. Material
          changes to what is shared with AI providers will re-prompt for consent
          where we rely on consent.
        </p>
      </PolicySubsection>

      <PolicySubsection number="16.5">
        <p>
          Except where the law says otherwise, if there is any discrepancy
          between the English version of this Policy and a translation,{" "}
          <strong>the English version prevails</strong>.
        </p>
      </PolicySubsection>

      <PolicySubsection number="16.6">
        <p>
          Questions, requests or complaints about this Policy or our privacy
          practices:
        </p>
        <RecordTable
          columns={["Channel", "Details"]}
          showHeader={false}
          grid="md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]"
          rows={[
            ["Email", <EmailLink key="email" />],
            [
              "Support",
              <>
                In-app support, or <EmailLink />
              </>,
            ],
            ["Company", "Trenchers AI"],
          ]}
        />
      </PolicySubsection>
    </PolicySection>
  );
}
