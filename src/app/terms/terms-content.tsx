import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  Gavel,
  KeyRound,
  Landmark,
  Mail,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import { createLegalSections } from "@/src/components/legal/legal-doc";
import {
  Callout,
  Card,
  CardGrid,
  EmailLink,
  LINK_CLASS,
  List,
  Panel,
  PROSE_CLASS,
  RecordTable,
  ToBeConfirmed,
} from "@/src/components/legal/legal-ui";

import { TERMS_OUTLINE } from "./terms-sections";

/*
 * The Terms of Service. Section order and numbering follow the terms' markdown
 * source; keep them aligned so "§" references and deep links stay correct.
 * Company facts the draft left as placeholders are filled from what this site
 * already publishes (Trenchers AI, support@trenchers.ai). The choices only
 * counsel can make — governing law, arbitration forum and seat, liability cap —
 * are marked with <ToBeConfirmed> and must be settled before this page ships.
 */

const { Section, Ref } = createLegalSections(TERMS_OUTLINE);

/** Capitalised legal text, set a little smaller so a whole block stays readable. */
function Caps({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[14px] leading-[1.75] tracking-[0.015em] text-white/70 md:text-[15px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

function PrivacyLink({ children }: { children?: ReactNode }) {
  return (
    <Link href="/privacy" className={LINK_CLASS}>
      {children ?? "Privacy Policy"}
    </Link>
  );
}

export function TermsIntro() {
  return (
    <div className={cn(PROSE_CLASS, "mt-10 space-y-5 md:mt-12")}>
      <p>
        These Terms of Service govern your access to and use of Trenchers AI.
        They cover your account and wallets, the automated trading features you
        can switch on, the fees you may pay, the risks you accept, and how
        disputes between us are resolved.
      </p>
      <Callout
        tone="caution"
        icon={ShieldAlert}
        title="Three things to read before you agree."
      >
        <List className="[&_strong]:font-semibold [&_strong]:text-white">
          <li>
            The Services are <strong>not available</strong> to people in
            sanctioned or restricted jurisdictions, and using a VPN to get
            around that is a material breach (<Ref to="1" />).
          </li>
          <li>
            Automated and AI-driven features can{" "}
            <strong>trade your funds without confirming each transaction</strong>
            . You own every trade they make (<Ref to="11" />, <Ref to="12" />).
          </li>
          <li>
            These Terms include an <strong>arbitration agreement</strong>, a
            class action waiver and a jury trial waiver (<Ref to="31" />,{" "}
            <Ref to="32" />).
          </li>
        </List>
      </Callout>
    </div>
  );
}

export function TermsBody() {
  return (
    <div
      id="terms-body"
      className={cn(PROSE_CLASS, "mt-14 space-y-16 md:mt-16 md:space-y-20")}
    >
      <Introduction />
      <ChangesToTerms />
      <ChangesToServices />
      <BetaFeatures />
      <Eligibility />
      <Compliance />
      <Accounts />
      <Usernames />
      <Wallets />
      <Conduit />
      <DelegatedSigning />
      <Agents />
      <PaperTrading />
      <CopyTrading />
      <AiFeatures />
      <Fees />
      <Transfers />
      <Rewards />
      <Leaderboards />
      <UserContent />
      <NoAdvice />
      <Taxes />
      <ProhibitedUses />
      <IntellectualProperty />
      <ThirdParties />
      <AssumptionOfRisk />
      <Warranties />
      <Liability />
      <Indemnity />
      <GoverningLaw />
      <DisputeResolution />
      <ClassActionWaiver />
      <TimeToFileClaims />
      <Termination />
      <MobileApps />
      <General />
      <Contact />
    </div>
  );
}

function Introduction() {
  return (
    <Section number="1">
      <Panel className="border-amber-300/15 bg-amber-300/[0.03]">
        <div className="space-y-4">
          <Caps>
            THE SERVICES (AS DEFINED BELOW) WERE NOT DEVELOPED FOR, AND ARE NOT
            OFFERED TO, INDIVIDUALS OR ENTITIES WHO RESIDE IN, ARE CITIZENS OF,
            ARE LOCATED IN, ARE INCORPORATED IN, OR HAVE A REGISTERED OFFICE OR
            PRINCIPAL PLACE OF BUSINESS IN ANY JURISDICTION SUBJECT TO
            COMPREHENSIVE SANCTIONS OR RELATED RESTRICTIONS UNDER APPLICABLE
            LAW, INCLUDING BUT NOT LIMITED TO THE CRIMEA REGION, CUBA, DONETSK,
            THE DEMOCRATIC REPUBLIC OF CONGO, IRAN, LIBYA, LUHANSK, MYANMAR
            (BURMA), NORTH KOREA, SUDAN, SYRIA, VENEZUELA OR YEMEN, OR ANY OTHER
            COUNTRY OR REGION TO WHICH THE UNITED STATES, THE UNITED KINGDOM,
            THE EUROPEAN UNION OR THE UNITED NATIONS EMBARGOES GOODS OR IMPOSES
            SIMILAR SANCTIONS, OR ANY JURISDICTION IN WHICH TRANSACTING IN
            CRYPTOCURRENCIES OR DIGITAL ASSETS IS PROHIBITED OR RESTRICTED IN
            ANY FORM (COLLECTIVELY, THE “RESTRICTED JURISDICTIONS” AND
            INDIVIDUALLY A “RESTRICTED JURISDICTION”), OR ANY PERSON OWNED,
            CONTROLLED, LOCATED IN, OR ORGANIZED UNDER THE LAWS OF ANY
            RESTRICTED JURISDICTION OR AFFILIATED WITH SUCH A PERSON, OR ANY
            INDIVIDUAL OR ENTITY LISTED ON SANCTIONS LISTS MAINTAINED BY THE
            UNITED STATES, THE UNITED KINGDOM, THE EUROPEAN UNION OR THE UNITED
            NATIONS (COLLECTIVELY, “RESTRICTED PERSONS”). IF YOU ARE A
            RESTRICTED PERSON, YOU MUST NOT USE OR ATTEMPT TO USE THE SERVICES.
            THE USE OF ANY TECHNOLOGY OR MECHANISM, SUCH AS A VIRTUAL PRIVATE
            NETWORK (“VPN”), PROXY OR SIMILAR TOOL, TO CIRCUMVENT OR ATTEMPT TO
            CIRCUMVENT THESE RESTRICTIONS IS STRICTLY PROHIBITED AND IS A
            MATERIAL BREACH OF THESE TERMS.
          </Caps>
          <Caps>
            BY USING THE SERVICES, YOU REPRESENT AND WARRANT THAT (1) YOU ARE
            NOT A RESTRICTED PERSON; AND (2) YOU (INCLUDING, IF APPLICABLE, YOUR
            OWNERS, REPRESENTATIVES, EMPLOYEES OR ANY OTHER PERSON WITH ACCESS
            TO YOUR ACCOUNT) WILL NOT COORDINATE, CONDUCT OR CONTROL YOUR USE OF
            THE SERVICES FROM WITHIN ANY RESTRICTED JURISDICTION.
          </Caps>
          <Caps>
            YOU AGREE THAT YOU ARE NOT PERMITTED TO MODIFY, DISASSEMBLE,
            DECOMPILE, ADAPT, ALTER, TRANSLATE, REVERSE ENGINEER OR CREATE
            DERIVATIVE WORKS OF THE SERVICES TO MAKE THEM AVAILABLE TO ANY
            RESTRICTED PERSON.
          </Caps>
        </div>
      </Panel>

      <p>
        These Terms of Service, together with our <PrivacyLink />, which is
        incorporated herein by this reference, and any documents and additional
        terms they expressly incorporate by reference, including any other
        terms, conditions or agreements that <strong>Trenchers AI</strong> (the
        “<strong>Company</strong>”, “<strong>we</strong>”, “<strong>us</strong>”
        or “<strong>our</strong>”) posts publicly or makes available
        (collectively, these “<strong>Terms</strong>”), constitute the agreement
        between the Company and you concerning your access to and use of our
        website at trenchers.ai, our web and mobile applications, our
        application programming interfaces, and the Solana blockchain
        infrastructure and smart contracts we operate (collectively, the “
        <strong>Services</strong>”), excluding any third-party materials,
        technology, protocols, smart contracts or applications.
      </p>
      <p>
        If you are engaging with the Services on behalf of another person or
        entity, “<strong>you</strong>” (and its variants) refers to that person
        or entity as well as to you individually, and you represent and warrant
        that you are authorized to bind them to these Terms. If others use the
        Services on your behalf, you accept responsibility for their acts and
        omissions as if they were your own.
      </p>
      <p>
        The Services facilitate access to and interaction with third-party
        materials, including decentralized exchanges (“<strong>DEXs</strong>”),
        automated market makers, routing and execution services, data providers,
        wallet infrastructure providers and other technologies, including
        third-party smart contracts. We do not control these third-party
        services and expressly disclaim any liability or responsibility arising
        from your use of them. We provide no guarantees regarding third-party
        services or their quality, accuracy, uptime, availability, pricing or
        the results of using them, even when accessed through the Services. By
        using third-party technologies or materials you agree to be bound by
        their terms and conditions, which you are solely responsible for finding
        and reviewing.
      </p>
      <p>
        <strong>Please read these Terms carefully.</strong> They govern your use
        of the Services and cover your rights and obligations, as well as our
        disclaimers and limitations of liability. By accessing or using the
        Services you acknowledge and agree to be bound by these Terms. If you do
        not agree, you must not access or use the Services.
      </p>

      <Callout tone="caution" icon={Gavel}>
        <Caps className="text-white/75">
          PLEASE BE AWARE THAT THESE TERMS INCLUDE AN ARBITRATION AGREEMENT,
          WHICH PROVIDES THAT EITHER PARTY MAY ELECT, WITH LIMITED EXCEPTIONS,
          TO REFER ANY DISPUTE BETWEEN YOU AND US TO INDIVIDUAL ARBITRATION.
          THESE TERMS ALSO CONTAIN A CLASS ACTION WAIVER AND A JURY TRIAL
          WAIVER.
        </Caps>
      </Callout>

      <Callout tone="caution" icon={Bot}>
        <Caps className="text-white/75">
          THE SERVICES INCLUDE AUTOMATED AND AI-DRIVEN TRADING FEATURES THAT CAN
          EXECUTE TRANSACTIONS WITH YOUR FUNDS WITHOUT A SEPARATE CONFIRMATION
          FOR EACH TRANSACTION. SECTIONS 10, 11 AND 12 DESCRIBE WHAT YOU ARE
          AUTHORIZING AND THE RISKS YOU ARE ACCEPTING. READ THEM BEFORE ENABLING
          ANY SUCH FEATURE.
        </Caps>
      </Callout>

      <p>
        Throughout your use of the Services you represent and warrant that: (i)
        you are at least eighteen (18) years of age, or otherwise of legal age
        to form a binding contract in your jurisdiction, and have the legal and
        mental capacity to enter into these Terms; (ii) your funds are not
        derived from and are not in any way connected to illegal, unauthorized
        or restricted sources; (iii) you have the right to engage in all
        transactions and activities you participate in on or through the
        Services; (iv) you are not a Restricted Person, are not connected to
        one, and are not located in a Restricted Jurisdiction; and (v) your use
        of the Services complies with all laws and regulations applicable to
        you.
      </p>
    </Section>
  );
}

function ChangesToTerms() {
  return (
    <Section number="2">
      <p>
        We may revise and update these Terms at our sole discretion. All changes
        are effective immediately when posted and apply to all access to and use
        of the Services thereafter. However, changes to the dispute resolution
        provisions in <Ref to="30" />–<Ref to="32" /> will not apply to any
        dispute for which the parties have actual notice on or before the date
        the change is posted.
      </p>
      <p>
        If we make changes that are material, we will use reasonable efforts to
        notify you, such as by email or a prominent in-app notice. It remains
        your responsibility to review these Terms periodically. Your continued
        use of the Services after revised Terms are posted means you accept and
        agree to the changes.
      </p>
    </Section>
  );
}

function ChangesToServices() {
  return (
    <Section number="3">
      <p>
        We may update, improve, modify, suspend or discontinue the Services, or
        any feature of them, at any time and without notice, including changes
        to the underlying software, infrastructure, security measures, supported
        networks, supported assets, technical configuration or feature set (“
        <strong>Updates</strong>”). Your continued access to and use of the
        Services is subject to such Updates, and you agree to accept patches,
        upgrades, bug fixes and other maintenance work arising from them.
      </p>
      <p>
        Any material on the Services may be out of date at any given time, and
        we are under no obligation to update it.
      </p>
      <Caps>
        WE WILL NOT BE LIABLE FOR ANY LOSSES RESULTING FROM CHANGES TO THE
        SERVICES, THE DISCONTINUATION OF ANY FEATURE, OR THE UNAVAILABILITY OF
        THE SERVICES, AND YOU HEREBY HOLD HARMLESS THE COMPANY PARTIES (AS
        DEFINED IN <Ref to="27" />) FROM ANY LOSSES AND DAMAGES ARISING IN
        CONNECTION WITH SUCH CHANGES.
      </Caps>
    </Section>
  );
}

function BetaFeatures() {
  return (
    <Section number="4">
      <p>
        Parts of the Services are in active development, and we may make beta,
        early-access or experimental features available for evaluation. Beta
        features are provided “as-is” and “as-available”, may contain defects,
        may change or be withdrawn at any time without notice, and may produce
        failures, disruptions, downtime, data corruption or loss. Data created
        while using a beta feature may not be preserved or recoverable if the
        feature is changed or withdrawn.
      </p>
      <p>
        Using a beta feature binds you to these Terms as if the feature were a
        finished product. You acknowledge that your use of beta features is at
        your own risk.
      </p>
    </Section>
  );
}

function Eligibility() {
  return (
    <Section number="5">
      <p>
        You must be at least eighteen (18) years old and must not be a
        Restricted Person to use the Services. You are solely responsible for
        complying with all laws of the jurisdiction in which you are located or
        from which you access the Services.
      </p>
      <p>
        We reserve the right, at any time and at our sole discretion, to impose
        limitations or restrictions on access to the Services for any individual
        or entity, or within any geographic area or legal jurisdiction, and to
        make particular features available only in certain jurisdictions, on
        certain platforms, or to certain accounts.{" "}
        <strong>
          Feature availability differs between our web and mobile applications
          and between jurisdictions
        </strong>
        , and features available to one user may not be available to you. We
        shall not be liable for any losses or damages arising from or related to
        the unavailability of the Services or any feature at any time or for any
        reason.
      </p>
      <p>
        Nothing in the Services constitutes an offer or solicitation in any
        jurisdiction where such an offer or solicitation is unauthorized or
        unlawful. We make no representation that the Services are appropriate or
        available for use in any particular location.
      </p>
    </Section>
  );
}

function Compliance() {
  return (
    <Section number="6">
      <p>
        At our sole discretion, or where required by applicable law, we may
        perform “Know Your Customer” (“<strong>KYC</strong>”), sanctions and
        anti-money-laundering checks on users, wallet addresses and
        transactions. You agree to promptly provide any information or
        documentation we reasonably consider necessary for these checks.
      </p>
      <p>
        We may, at our sole discretion and without liability to you, restrict,
        suspend or terminate access to the Services, or decline to process any
        instruction, where requested information is not provided, where an
        address or account appears on a sanctions list, or where we have reason
        to believe the Services are being used in connection with money
        laundering, terrorist financing, fraud, market abuse or other illegal
        activity. We may share information with regulatory or law enforcement
        authorities as we deem appropriate or as required by law.
      </p>
    </Section>
  );
}

function Accounts() {
  return (
    <Section number="7">
      <p>
        To use most of the Services you must create an account (“
        <strong>Account</strong>”). Authentication is provided through a
        third-party authentication and wallet infrastructure provider. You agree
        to keep your Account credentials — and the email address, social
        account, passkey or device credential used to secure or recover them —
        confidential, and not to allow anyone else to use your Account.
      </p>
      <p>
        You are responsible for all activity that occurs under your Account,
        whether or not you are aware of it, and for making all arrangements
        necessary to access the Services, including ensuring that everyone who
        accesses the Services through your connection is aware of and complies
        with these Terms. Notify us immediately if you become aware of any
        unauthorized use of your Account.
      </p>
      <p>
        We may suspend or terminate your Account if you provide false,
        inaccurate or incomplete information, if you fail to comply with these
        Terms, or if we determine at our sole discretion that you no longer meet
        the eligibility criteria in these Terms. Access to the Services may also
        be suspended or terminated at any time, for any reason, at our sole
        discretion, without liability to you.
      </p>
      <Callout tone="caution" icon={TriangleAlert}>
        <p>
          <strong>
            We will never ask you for your seed phrase, private key, password or
            one-time code.
          </strong>{" "}
          Any communication that does is fraudulent. Report it to <EmailLink />.
        </p>
      </Callout>
    </Section>
  );
}

function Usernames() {
  return (
    <Section number="8">
      <p>
        Your username, display name, handle, profile picture and any other
        account-identifying content (collectively, “
        <strong>Account Content</strong>”) are licensed to you by the Company on
        a revocable, non-exclusive, non-transferable basis. You do not own your
        username or any other Account Content, and no property right, goodwill
        or other interest accrues to you by reason of your selection or use of
        it.
      </p>
      <p>
        We reserve the right, in our sole discretion and without prior notice or
        liability, to:
      </p>
      <List>
        <li>
          reclaim, reassign, rename or otherwise modify any username, handle,
          profile picture or other Account Content for any reason, including
          prolonged inactivity, impersonation, infringement of third-party
          rights, profanity or offensive material, or to resolve disputes;
        </li>
        <li>
          remove, edit or require modification of any Account Content we
          determine to be objectionable, misleading, infringing or otherwise in
          violation of these Terms; and
        </li>
        <li>suspend or terminate any Account that violates this section.</li>
      </List>
      <p>
        You may not sell, offer for sale, auction, trade, transfer, license or
        otherwise commercialize or assign any username, handle or Account
        Content to any third party, for any consideration. Any attempted
        transfer in violation of this section is void and is grounds for
        immediate suspension or termination without notice.
      </p>
      <p>
        If your Account is deleted, your username is retired and is not reserved
        for you.
      </p>
    </Section>
  );
}

function Wallets() {
  return (
    <Section number="9">
      <p>
        The Services let you create and use one or more Solana wallets.{" "}
        <strong>
          Not all wallets work the same way, and the difference matters.
        </strong>
      </p>
      <CardGrid>
        <Card
          icon={KeyRound}
          tone="protect"
          title="Your trading wallet and any wallet you import"
        >
          These are generated and secured by a third-party wallet infrastructure
          provider (currently Privy, or another provider we may designate). The
          private key is created and held within that provider’s secure
          infrastructure. <strong>We do not receive, hold or store</strong> the
          private key for these wallets. If you import an existing wallet, the
          key is encrypted on your device before it leaves it; it does not pass
          through our servers. Depending on the feature, you may be able to view
          or export these keys, and you accept the risks of viewing, exporting,
          storing, copying or transmitting them.
        </Card>
        <Card
          icon={Wallet}
          tone="protect"
          title="External wallets you connect"
        >
          If you connect a browser or hardware wallet, that wallet and its keys
          remain entirely under your control and the control of its provider.
        </Card>
        <Card
          icon={Bot}
          tone="caution"
          title="Wallets created for automated agents and bots"
        >
          So that an agent can sign transactions on its own, encrypted key
          material for agent and bot wallets is held on our infrastructure and
          is used solely to execute the instructions you configure. This is a
          material difference from the wallets above:{" "}
          <strong>
            you are relying on us and on our security measures for these
            wallets.
          </strong>{" "}
          Do not fund an agent or bot wallet with more than you are prepared to
          lose, and withdraw funds you are not actively deploying.
        </Card>
        <Card
          icon={TriangleAlert}
          tone="caution"
          title="Wallet material stored in your browser"
        >
          Certain features may store wallet material locally in your browser.
          Clearing your browser’s site data, using private browsing, or losing
          access to the device can permanently destroy that material and any
          funds it controls. Move funds out before clearing site data.
        </Card>
      </CardGrid>
      <Caps>
        WE MAKE NO REPRESENTATIONS REGARDING THE SECURITY OR SAFETY OF YOUR
        DIGITAL ASSETS. YOU ARE SOLELY RESPONSIBLE FOR SAFEGUARDING ACCESS TO
        YOUR ACCOUNT AND WALLETS, INCLUDING THE EMAIL ACCOUNT, SOCIAL ACCOUNT,
        PASSKEY OR DEVICE CREDENTIAL USED TO SECURE OR RECOVER THEM, AND ANY
        PRIVATE KEYS YOU VIEW OR EXPORT. IF YOU LOSE ACCESS TO YOUR KEYS OR
        CREDENTIALS, WE MAY BE UNABLE TO RESTORE ACCESS TO YOUR DIGITAL ASSETS,
        AND WE ARE NOT LIABLE FOR ANY RESULTING LOSS. ANYONE WITH ACCESS TO YOUR
        KEYS CAN ACCESS, TRANSFER OR SPEND YOUR DIGITAL ASSETS. YOU HEREBY
        RELEASE AND HOLD HARMLESS THE COMPANY PARTIES FROM ANY DAMAGES OR LOSSES
        YOU MAY SUFFER IN CONNECTION WITH THE SECURITY OF YOUR ACCOUNT, WALLETS,
        KEYS OR CREDENTIALS.
      </Caps>
    </Section>
  );
}

function Conduit() {
  return (
    <Section number="10">
      <p>
        The Services provide an interface for constructing, routing and
        submitting transactions to public blockchains and to third-party
        protocols. You acknowledge that:
      </p>
      <ol className="list-decimal space-y-3 pl-5 marker:text-white/30">
        <li>
          when you initiate, instruct or engage in a transaction through the
          Services, that transaction is executed and settled on third-party
          infrastructure using third-party technologies;
        </li>
        <li>the Services are a conduit to that infrastructure; and</li>
        <li>
          <strong>
            the Services are not a DEX, an exchange, a broker, a dealer, a
            custodian or a money transmitter, and we are not your counterparty.
          </strong>{" "}
          We do not match, clear or settle your trades.
        </li>
      </ol>
      <p>
        You determine, at your own discretion, the parameters applied to your
        transactions, including amounts, slippage tolerance, priority-fee and
        MEV settings, and any conditions attached to standing orders. We do not
        advise on the merits of any transaction or on its tax or legal
        consequences, and we are not responsible for indicating, alerting or
        warning against any such matter.
      </p>
      <p>
        Standing and conditional orders — including limit, stop-loss,
        take-profit and trailing orders — are triggered from price data that may
        be delayed, incomplete or incorrect, and depend on network and protocol
        conditions outside our control.{" "}
        <strong>
          We do not guarantee that any order will trigger, execute, execute at
          any particular price, or execute at all
        </strong>
        , and we are not liable for any order that fails to trigger, triggers
        late, or executes at a price different from the one displayed.
      </p>
    </Section>
  );
}

function DelegatedSigning() {
  return (
    <Section number="11">
      <p>
        Certain features allow you to authorize our systems, or a session
        signer, to sign and submit transactions from your wallet{" "}
        <strong>
          without prompting you to approve each individual transaction
        </strong>
        .
      </p>
      <p>
        By enabling any such feature, you expressly authorize and instruct us
        and our service providers to construct, sign and submit transactions
        from the authorized wallet, within the scope you configure, until you
        revoke that authorization. You acknowledge that:
      </p>
      <List>
        <li>
          transactions executed under that authorization are <strong>your</strong>{" "}
          transactions and are binding on you;
        </li>
        <li>
          you will not receive a separate confirmation prompt for each
          transaction;
        </li>
        <li>
          you are responsible for reviewing and maintaining the scope and limits
          you configure; and
        </li>
        <li>
          you may revoke the authorization at any time through the Services, and
          doing so applies prospectively only — it does not reverse transactions
          already submitted.
        </li>
      </List>
      <p>
        Blockchain transactions cannot be reversed. We are not able to recall,
        cancel or unwind a transaction once it has been submitted.
      </p>
    </Section>
  );
}

function Agents() {
  return (
    <Section number="12">
      <p>
        The Services include configurable automated trading features, which may
        include AI agents, strategy bots, automated detection and entry into
        newly launched tokens, and other autonomous or semi-autonomous
        execution. Collectively, “<strong>Agents</strong>”.
      </p>
      <p>
        <strong>You configure them; you own the outcome.</strong> An Agent acts
        on parameters you select, approve or accept. An Agent is a tool that
        executes your instructions — it is not a managed account, an advisory
        service, a fund, or a promise of any result. We are not acting as your
        investment manager, adviser, or fiduciary, and no Agent’s activity
        constitutes advice or a recommendation.{" "}
        <strong>
          You are solely responsible for every transaction an Agent executes
        </strong>
        , including transactions executed while you are asleep, offline or
        unaware.
      </p>
      <p>
        By creating, funding, starting or maintaining an Agent, you acknowledge
        and accept that:
      </p>
      <Panel>
        <List>
          <li>
            an Agent may trade continuously and may execute a large number of
            transactions in a short period, each of which may incur fees and
            costs;
          </li>
          <li>
            an Agent may buy assets that lose all of their value, including
            assets that turn out to be fraudulent, unsellable, or designed to
            trap buyers;
          </li>
          <li>
            an Agent may fail to sell, may sell at a loss, or may be unable to
            exit a position at all because of liquidity, network conditions,
            protocol failure, or a token’s own transfer restrictions;
          </li>
          <li>
            an Agent may act on market, price or security data that is delayed,
            incomplete or wrong, and any risk, safety, rug or “security check”
            signal shown in the Services is informational only, is sourced from
            third parties, and is{" "}
            <strong>not a guarantee that an asset is safe</strong>;
          </li>
          <li>
            an Agent may stop, pause, fail, lag, restart, or behave unexpectedly
            as a result of software defects, deployments, infrastructure faults
            or third-party outages, and it may do so without notifying you;
          </li>
          <li>
            configuration changes, including changes made through an AI
            conversation, take effect as configured and may materially change an
            Agent’s behaviour; and
          </li>
          <li>
            automated features may be restricted, gated, disabled or removed for
            your Account, your jurisdiction or your platform at any time.
          </li>
        </List>
      </Panel>
      <p>
        Where a feature is offered by us with AI assistance, the AI may draft,
        suggest or apply configuration.{" "}
        <strong>You remain responsible for reviewing what it applies.</strong>{" "}
        AI output can be incorrect, incomplete or unsuitable.
      </p>
      <Caps>
        YOU HEREBY RELEASE AND HOLD HARMLESS THE COMPANY PARTIES FROM ANY AND
        ALL LOSSES, DAMAGES OR CLAIMS ARISING FROM OR IN CONNECTION WITH YOUR
        USE OF AGENTS OR ANY AUTOMATED TRADING FEATURE, INCLUDING LOSSES FROM
        TRADES AN AGENT EXECUTED, FAILED TO EXECUTE, OR EXECUTED AT AN
        UNFAVOURABLE PRICE.
      </Caps>
    </Section>
  );
}

function PaperTrading() {
  return (
    <Section number="13">
      <p>
        The Services may offer a paper or simulated trading mode. Paper activity
        does not involve real funds and does not execute on any blockchain.
        Simulated balances, positions, profits and losses are{" "}
        <strong>
          not real, are not redeemable, are not owed to you, and confer no
          entitlement of any kind.
        </strong>{" "}
        Simulated credits may be adjusted, reset, expired or removed at any
        time.
      </p>
      <p>
        Simulated results do not reflect the costs, slippage, latency, liquidity
        constraints or failure modes of live trading, and are not indicative of
        results you would have achieved or will achieve with real funds. Any
        equity curve, backtest, historical result or performance figure shown
        anywhere in the Services, including for house-run or third-party
        strategies, is historical or simulated and{" "}
        <strong>
          is not a prediction, projection or guarantee of future performance
        </strong>
        .
      </p>
    </Section>
  );
}

function CopyTrading() {
  return (
    <Section number="14">
      <p>
        The Services may let you track third-party wallets and traders, mirror
        their activity, or clone a strategy configuration published within the
        Services.
      </p>
      <p>
        Third-party wallets and traders are not our agents, partners or
        representatives, and their inclusion, ranking, labelling or availability
        is not an endorsement or a recommendation. We do not verify their
        identity, their competence, their intentions, or the accuracy of any
        statistic shown about them. A tracked trader may lose money, may act
        against your interests, may be aware that they are being copied, and may
        deliberately exploit copiers.
      </p>
      <p>
        Mirrored transactions are subject to delay, may execute at materially
        different prices from the transaction they mirror, may execute
        partially, or may fail entirely. Cloning a strategy copies a
        configuration, not a result.{" "}
        <strong>
          You accept sole responsibility for every transaction executed under a
          copy-trading or cloned configuration
        </strong>
        , and you release the Company Parties from any losses arising from it.
      </p>
    </Section>
  );
}

function AiFeatures() {
  return (
    <Section number="15">
      <p>
        The Services include AI-assisted features, including conversational
        assistance, configuration help, insights and support. When you use them,
        the content of your request — including the text you write and relevant
        context about your account or an Agent — is sent to third-party AI model
        providers for processing, as described in our <PrivacyLink />. On our
        mobile applications we ask for your explicit consent before the first
        such transmission, and you may withdraw that consent at any time.
      </p>
      <p>
        AI output is generated automatically, may be inaccurate, incomplete, out
        of date or wrong, and is provided for informational purposes only.{" "}
        <strong>
          It is not financial, investment, legal, tax or professional advice
        </strong>{" "}
        (see <Ref to="21" />). Do not enter seed phrases, private keys,
        passwords or other secrets into any chat.
      </p>
      <p>
        We do not warrant that AI features will be available, accurate or
        uninterrupted, and we are not liable for any decision you make or action
        you take in reliance on AI output.
      </p>
    </Section>
  );
}

function Fees() {
  return (
    <Section number="16">
      <p>
        Your use of the Services may involve two distinct categories of cost:
        (i) fees charged by us, and (ii) fees and costs charged or imposed by
        third parties. These are separate, and we address each below.
      </p>
      <p>
        <strong>Our fees.</strong> We charge a fee on transactions conducted
        through the Services. The applicable fee depends on factors including
        the type and size of the transaction, the feature used, how the
        transaction is routed, and any fee tier or rebate applicable to your
        Account.{" "}
        <strong>
          The fee applicable to your transaction is shown before you confirm it
        </strong>
        , and the fee shown at that time is the fee that applies. We may modify
        our fees at any time in our sole discretion.
      </p>
      <p>
        <strong>Third-party fees and other costs.</strong> Because transactions
        are executed and settled on-chain through third-party protocols, you may
        incur costs that we neither charge, receive nor control, including
        network and priority fees, validator or bundler tips, liquidity-pool and
        protocol fees, and the difference between the expected and actual
        execution price (“slippage”). These amounts are determined by the
        applicable networks, protocols and market conditions at settlement and
        may not be known when an estimate is shown. Where practicable we display
        estimates, but <strong>estimates are not guaranteed</strong>, we do not
        display every cost, and we are under no obligation to do so. You are
        solely responsible for reviewing the costs applicable to your
        transactions.
      </p>
      <p>
        <strong>Failed and delayed transactions.</strong> A transaction may
        fail, revert or be delayed, including due to network congestion,
        protocol error or insufficient fees. Costs incurred on a failed or
        delayed transaction are generally not recoverable, and we are not
        responsible for them.
      </p>
      <p>
        Under no circumstances shall the Company Parties incur any liability
        related to fees or costs charged or imposed by third parties. To the
        fullest extent permitted by law, you release and hold harmless the
        Company Parties from any and all liability associated with fees relating
        to the Services or to your use of third-party technologies accessed
        through them.
      </p>
    </Section>
  );
}

function Transfers() {
  return (
    <Section number="17">
      <p>
        You are responsible for the accuracy of every deposit and withdrawal
        instruction, including the destination address, the network and the
        asset. <strong>Blockchain transfers are irreversible.</strong> Assets
        sent to an incorrect address, on an unsupported network, or of an
        unsupported type may be permanently lost, and we cannot recover them.
      </p>
      <p>
        We may impose minimums, maximums, limits, holds or delays on transfers,
        and may decline to process an instruction where required by law or where
        we suspect fraud, error or prohibited activity.
      </p>
      <p>
        If you purchase digital assets with fiat currency, that purchase is
        provided by an independent third-party on-ramp provider on{" "}
        <strong>their</strong> platform, under <strong>their</strong> terms and
        privacy policy. That provider — not us — performs any identity
        verification, handles your payment details, and is responsible for the
        purchase. We are not a party to it, receive no payment card or bank
        details, and are not liable for it.
      </p>
    </Section>
  );
}

function Rewards() {
  return (
    <Section number="18">
      <p>
        We may operate engagement and reward programs, which may include points,
        ranks or tiers, streaks, quests, fee rebates or rakeback, and a referral
        program (collectively, the “<strong>Reward Programs</strong>”).
      </p>
      <p>
        Points, ranks, tiers and similar in-product balances are{" "}
        <strong>promotional and have no monetary value</strong>. They are not
        currency, not securities, not a claim on the Company, not redeemable for
        cash except where we expressly say otherwise, and not transferable. We
        may change the rules, rates, calculation methodology, eligibility,
        expiry and availability of any Reward Program at any time, with or
        without notice, and may modify, suspend or cancel any Reward Program
        entirely. Rank and tier benefits may be based on rolling activity
        windows and may decay or be lost through inactivity.
      </p>
      <p>
        <strong>Referrals.</strong> You may not refer yourself, refer accounts
        you own or control, or otherwise engage in self-referral. Self-referral
        includes creating multiple accounts to obtain referral benefits,
        referring an account over which you exercise direct or indirect control,
        and coordinating with others to generate referral rewards artificially.
        Before referring anyone you must obtain any necessary permissions and
        make clear that (a) we are not the sender of your message, (b) you are
        not acting as our agent, and (c) you may receive a benefit if they sign
        up. Spam and unsolicited promotion are prohibited.
      </p>
      <p>
        <strong>Anti-abuse.</strong> We reserve the right, in our sole
        discretion, to void, reverse, claw back or withhold any reward, credit,
        rebate or benefit obtained through self-referral, wash trading,
        multi-accounting, manipulation, fraud, or any conduct we determine to be
        inconsistent with the intended purpose of a Reward Program, and to
        suspend or terminate the Accounts involved. Whether conduct constitutes
        abuse is determined by us in our sole discretion.
      </p>
      <p>
        In case of any dispute about rewards or payouts, we will review and
        render a decision at our sole discretion, and you agree to be bound by
        it. Participation in a Reward Program creates no partnership, employment
        or agency relationship. We do not guarantee any earnings. You are solely
        responsible for any taxes arising from rewards you receive.
      </p>
    </Section>
  );
}

function Leaderboards() {
  return (
    <Section number="19">
      <p>
        The Services may display leaderboards, rankings, profit-and-loss
        figures, competition standings and other performance indicators
        (collectively, “<strong>Metrics</strong>”), including public surfaces
        readable by people who are not signed in.
      </p>
      <p>
        You agree not to manipulate, game or artificially inflate any Metric by
        any means, including selective transfers between wallets, wash trading,
        self-trading, coordinated activity with other accounts, or exploiting
        any technical feature of the Services to misrepresent your actual
        performance.
      </p>
      <p>
        We reserve the right, in our sole discretion and without prior notice,
        to: (i) disqualify, adjust, reverse or void any Metric, ranking or
        standing we determine was obtained through manipulation; (ii)
        recalculate or reset Metrics at any time; (iii) change the methodology
        by which Metrics are calculated; and (iv) suspend or terminate Accounts
        engaged in manipulation. Any reward, prize or recognition associated
        with a manipulated Metric may be voided or clawed back.
      </p>
      <p>
        Metrics are derived from data that may be incomplete, delayed or
        incorrect, are provided for informational purposes only, and{" "}
        <strong>
          are not a representation that any figure is accurate or that any past
          result will be repeated.
        </strong>
      </p>
    </Section>
  );
}

function UserContent() {
  return (
    <Section number="20">
      <p>
        “<strong>User Content</strong>” means anything you upload, submit, post,
        share or make available through the Services, including messages,
        profile content and shared performance cards.
      </p>
      <p>
        <strong>Your grant to us.</strong> You grant the Company a worldwide,
        non-exclusive, royalty-free, fully paid, sublicensable and transferable
        license to use, host, store, reproduce, modify, create derivative works
        from, publish, publicly display, publicly perform and distribute your
        User Content in connection with operating, providing and promoting the
        Services, consistent with our <PrivacyLink />. You represent and warrant
        that you have the right to grant this license and that your User Content
        does not infringe or violate any third party’s rights.
      </p>
      <p>
        <strong>Content you share is public.</strong> If you generate a
        shareable link or card, or post to a public surface of the Services,
        that content is accessible to anyone who has the link or visits the
        surface. Deleting content may not remove copies that others have
        republished, cached or archived, and we bear no responsibility for the
        removal or persistence of such copies.
      </p>
      <p>
        <strong>Conduct.</strong> You agree not to post, upload, transmit or
        otherwise make available any content that: is obscene, pornographic,
        sexually explicit or depicts a minor; is harassing, threatening,
        intimidating, bullying or abusive; promotes hatred, discrimination or
        violence based on a protected characteristic; impersonates any person or
        entity or misrepresents your affiliation; contains another person’s
        personal or confidential information without their consent; is
        fraudulent, deceptive or misleading; infringes any intellectual property
        right; or is otherwise objectionable as determined by us in our sole
        discretion.
      </p>
      <p>
        We may, but are not obliged to, monitor, review and moderate content. We
        may, in our sole discretion and without prior notice, issue warnings,
        remove or refuse to display content, suspend Accounts, or terminate
        access. We are not liable for any action taken or not taken with respect
        to User Content or user conduct.
      </p>
    </Section>
  );
}

function NoAdvice() {
  return (
    <Section number="21">
      <p>
        We are not registered with or licensed by any financial regulatory
        authority as a broker, dealer, exchange, investment adviser, fund
        manager or commodity trading adviser, and we do not act as your
        financial adviser, investment manager, or fiduciary.
      </p>
      <p>
        Nothing on or through the Services — including market data, token
        metadata, security and risk indicators, trending and discovery feeds,
        Metrics, AI output, Agent behaviour, or any figure, chart or label — is
        legal, financial, tax, accounting, investment or securities advice, an
        offer or solicitation to buy or sell any asset, or a recommendation of
        any asset, strategy, trader or protocol.
      </p>
      <p>
        All decisions to acquire or dispose of digital assets are solely yours.
        You represent that you have sufficient knowledge and experience to
        evaluate the merits and risks of your transactions, and you should
        consult independent, qualified professionals before acting. By accessing
        the Services you agree that you are not entering into an advisory
        relationship with us.
      </p>
      <Caps>
        YOU ACKNOWLEDGE THAT WE ACCEPT NO RESPONSIBILITY FOR YOUR TRADING
        DECISIONS OR FOR YOUR USE OF THE SERVICES, AND YOU RELEASE AND HOLD
        HARMLESS THE COMPANY PARTIES FROM ANY LOSSES OR DAMAGES ARISING FROM
        THEM.
      </Caps>
    </Section>
  );
}

function Taxes() {
  return (
    <Section number="22">
      <p>
        You are solely responsible for determining what, if any, taxes apply to
        your digital asset transactions, rewards and other activity, and for
        reporting and remitting them. We do not collect, withhold, report or
        remit taxes on your behalf.
      </p>
      <p>
        Any tax summary, calculation, statement or export offered through the
        Services is a{" "}
        <strong>convenience based on data available to us</strong>, is not tax
        advice, may be incomplete or incorrect, does not account for activity
        outside the Services, and must be reviewed by you and, where
        appropriate, a qualified tax professional before it is relied upon or
        filed. We do not file anything on your behalf.
      </p>
    </Section>
  );
}

function ProhibitedUses() {
  return (
    <Section number="23">
      <p>
        You agree to use the Services only for lawful purposes and in accordance
        with these Terms. You agree not to, and not to permit others to:
      </p>
      <Panel>
        <List>
          <li>
            use the Services in or from any Restricted Jurisdiction, on behalf
            of a Restricted Person, or in violation of any applicable law or
            regulation, including sanctions, export control and
            anti-money-laundering laws;
          </li>
          <li>
            conceal your location or identity by IP proxying, VPN or any other
            method in order to circumvent geographic, jurisdictional or
            eligibility restrictions;
          </li>
          <li>
            use the Services for money laundering, terrorist financing,
            sanctions evasion, fraud or any other illicit financial activity;
          </li>
          <li>
            engage in market manipulation, including pump-and-dump schemes, wash
            trading, self-trading, spoofing, layering, quote stuffing or
            front-running;
          </li>
          <li>
            manipulate or attempt to manipulate any leaderboard, ranking,
            Metric, reward or referral system, including through selective
            transfers, wash trading, multi-accounting or coordinated activity;
          </li>
          <li>
            fabricate any transaction or engage in deceptive practices relating
            to transactions;
          </li>
          <li>
            access, tamper with or use non-public areas of the Services or our
            systems, or probe, scan or test the vulnerability of any of our
            systems or networks, or breach or circumvent any security or
            authentication measure;
          </li>
          <li>
            access or search the Services, or extract data from them, using any
            unauthorized or automated means — including bots, scrapers,
            crawlers, spiders or data-mining tools — or use manual processes to
            monitor or copy the Services without our express written permission;
          </li>
          <li>
            use automated means to create Accounts, send messages, post content
            or otherwise interact with the Services, except through interfaces
            we expressly provide for that purpose;
          </li>
          <li>
            decipher, decompile, disassemble or reverse-engineer any part of the
            Services or the software underlying them, except where such
            restriction is prohibited by applicable law;
          </li>
          <li>
            introduce or transmit any virus, worm, logic bomb or other malicious
            code, or interfere with the proper working of the Services,
            including by means of a denial-of-service attack;
          </li>
          <li>
            impose an unreasonable or disproportionately large load on the
            Services or our infrastructure;
          </li>
          <li>
            collect or store personal information about other users without
            their express permission, or reverse look-up, track or seek to track
            any other user;
          </li>
          <li>
            impersonate the Company, our personnel, another user or any other
            person or entity, or use our trademarks, logos, URLs or product
            names in meta tags, hidden text or metadata without our written
            consent;
          </li>
          <li>
            sell, transfer, license or otherwise commercialize any username,
            handle or Account Content;
          </li>
          <li>
            use the Services for any unauthorized commercial purpose or for the
            benefit of a third party, including building a competing or
            derivative commercial product from data obtained through the
            Services;
          </li>
          <li>
            send unsolicited advertising, promotional material, spam or other
            solicitation through the Services;
          </li>
          <li>exploit, harm or attempt to exploit or harm minors in any way; or</li>
          <li>
            encourage or enable any other person to do any of the foregoing.
          </li>
        </List>
      </Panel>
      <p>
        We are not obliged to monitor access to or use of the Services, but we
        reserve the right to do so, to investigate suspected violations, to
        remove or disable access to content or Accounts, and to cooperate with
        law enforcement.
      </p>
    </Section>
  );
}

function IntellectualProperty() {
  return (
    <Section number="24">
      <p>
        <strong>Ownership.</strong> The Services and their entire contents,
        features and functionality — including all software, text, displays,
        images, audio, video, data compilations, and the design, selection and
        arrangement thereof — are owned by the Company, its licensors or other
        providers, and are protected by copyright, trademark, patent, trade
        secret and other intellectual property laws. We do not claim ownership
        of your User Content, and these Terms do not restrict your rights in it,
        subject to the license in <Ref to="20" />. Except for the limited rights
        expressly granted here, no right, title or interest in the Services is
        transferred to you, and all rights not expressly granted are reserved.
      </p>
      <p>
        <strong>Your license.</strong> We grant you a limited, personal,
        revocable, non-exclusive, non-transferable, non-sublicensable right to
        access and use the Services for your own personal, non-commercial use,
        in accordance with these Terms. You may temporarily cache material
        incidental to viewing it, and may download a single copy of any
        application we provide for your own use. You must not otherwise
        reproduce, distribute, modify, create derivative works from, publicly
        display, publish, license, sell or exploit any part of the Services, or
        remove or alter any proprietary notice. Building a commercial
        application on top of the Services requires our express prior written
        consent.
      </p>
      <p>
        <strong>Trademarks.</strong> “Trenchers AI”, our logos, and all related
        names, logos, product and service names, designs and slogans are
        trademarks of the Company or its affiliates or licensors. You must not
        use them without our prior written permission. All other marks appearing
        on the Services belong to their respective owners, who may or may not be
        affiliated with us.
      </p>
      <p>
        <strong>Feedback.</strong> If you send us feedback, comments, ideas or
        suggestions (“<strong>Feedback</strong>”) you grant us and our service
        providers a perpetual, irrevocable, worldwide, non-exclusive, fully
        paid, royalty-free, sublicensable and transferable license to use,
        reproduce, modify, create derivative works from, distribute and
        otherwise exploit that Feedback for any purpose, without restriction or
        compensation to you. Feedback is non-confidential and non-proprietary.
        You represent that you have the right to grant this license.
      </p>
    </Section>
  );
}

function ThirdParties() {
  return (
    <Section number="25">
      <p>
        The Services display, include, link to or make available services,
        content, data, protocols, applications and materials from third parties,
        including DEXs and other decentralized applications, wallet
        infrastructure providers, routing and execution services, market and
        security data providers, on-ramp providers and social platforms (“
        <strong>Third-Party Services and Materials</strong>”).
      </p>
      <p>
        We do not endorse any Third-Party Services and Materials, and their
        inclusion is provided for your convenience only. Your access to and use
        of them is governed solely by their own terms, which you are responsible
        for finding and reviewing. We are not responsible or liable for, and
        make no representation as to, any aspect of them — including their
        content, accuracy, completeness, availability, timeliness, legality,
        quality, security, pricing, solvency, or the manner in which they handle
        data — or for any interaction between you and their providers. You
        irrevocably waive any claim against the Company Parties in respect of
        them.
      </p>
      <p>
        By accessing Third-Party Services and Materials through the Services you
        accept the risks of doing so, including risks of illiquidity,
        devaluation, lockup, exploit and total loss. You are solely responsible
        for any fees or costs they charge.
      </p>
      <p>
        <strong>
          Information provided on or through the Services is for general
          information purposes only.
        </strong>{" "}
        We do not guarantee its accuracy, completeness or usefulness, even where
        we created it. You rely on it strictly at your own risk.
      </p>
    </Section>
  );
}

function AssumptionOfRisk() {
  return (
    <Section number="26">
      <p>By using the Services you acknowledge and accept that:</p>
      <Panel className="border-amber-300/15 bg-amber-300/[0.03]">
        <List>
          <li>
            <strong>Digital assets are volatile and risky.</strong> The value of
            any digital asset can fall rapidly, including to zero. You may lose
            some or all of what you put in. Digital assets are neither deposits
            of nor guaranteed by a bank, and are not insured by any deposit
            insurance or investor compensation scheme.
          </li>
          <li>
            <strong>Many tokens are fraudulent or worthless.</strong> Newly
            launched tokens in particular may be created to defraud buyers, may
            be unsellable, may have hidden transfer restrictions or mint
            authorities, and may be abandoned immediately. Risk and security
            indicators shown in the Services are sourced from third parties, are
            informational only, and are not a guarantee of safety.
          </li>
          <li>
            <strong>Transactions are irreversible.</strong> We cannot reverse,
            recall or unwind a transaction submitted to a blockchain. You are
            responsible for the accuracy of every instruction.
          </li>
          <li>
            <strong>Execution is not guaranteed.</strong> Transactions may fail,
            revert, be delayed, be reordered, or execute at a price materially
            different from the one displayed, including as a result of slippage,
            congestion, MEV, protocol behaviour, oracle failure or provider
            outage. Displayed prices, rates, quotes and liquidity figures are
            estimates and are not guaranteed.
          </li>
          <li>
            <strong>Smart contracts carry risk.</strong> Smart contracts execute
            automatically, may contain vulnerabilities or design flaws, and may
            be exploited. We do not audit third-party contracts.
          </li>
          <li>
            <strong>Blockchains change.</strong> Underlying protocols may fork,
            halt, change their operating rules, or suffer attacks, and it is
            your responsibility to keep yourself informed.
          </li>
          <li>
            <strong>Security risk is real.</strong> We make no guarantee as to
            the security of any environment in which keys are stored, and we are
            not liable for hacks, exploits, phishing or social-engineering
            attempts targeting you, your credentials, your devices or
            third-party providers.
          </li>
          <li>
            <strong>The regulatory position is uncertain.</strong> Laws and
            regulations governing digital assets are evolving and may change
            adversely, including with respect to taxation, and may affect the
            availability, value or legality of the Services or of particular
            assets.
          </li>
          <li>
            <strong>The Services may be unavailable.</strong> Outages,
            maintenance, deployments, third-party failures and force majeure
            events may interrupt access, including at moments when you most want
            to trade.
          </li>
        </List>
      </Panel>
      <p>
        You waive any claim against the Company Parties arising from any of the
        foregoing.
      </p>
    </Section>
  );
}

function Warranties() {
  return (
    <Section number="27">
      <Caps>
        YOUR USE OF THE SERVICES IS AT YOUR OWN RISK. THE SERVICES, INCLUDING
        ALL CONTENT, ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT
        ANY REPRESENTATION OR WARRANTY, WHETHER EXPRESS, IMPLIED OR STATUTORY.
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY, ITS
        AFFILIATES, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AGENTS,
        REPRESENTATIVES, LICENSORS AND SERVICE PROVIDERS (COLLECTIVELY, THE
        “COMPANY PARTIES”) DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
        INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, ACCURACY AND NON-INFRINGEMENT.
      </Caps>
      <Caps>
        WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY,
        SECURE, ACCURATE OR ERROR-FREE, THAT DEFECTS WILL BE CORRECTED, THAT THE
        SERVICES WILL BE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS, OR THAT
        ANY TRANSACTION, ORDER, AGENT, RESULT OR DATA WILL BE COMPLETE, ACCURATE
        OR ACHIEVE ANY OUTCOME. YOU ASSUME FULL RESPONSIBILITY FOR ANY DAMAGE TO
        YOUR SYSTEMS OR LOSS OF DATA RESULTING FROM YOUR USE OF THE SERVICES.
      </Caps>
      <Caps>
        SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES, SO
        SOME OF THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU.
      </Caps>
    </Section>
  );
}

function Liability() {
  return (
    <Section number="28">
      <Caps>
        TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE COMPANY
        PARTIES BE LIABLE FOR ANY LOST PROFITS, LOST REVENUE, LOST TRADING
        OPPORTUNITY, LOSS OF DIGITAL ASSETS, LOSS OF BUSINESS OR ANTICIPATED
        SAVINGS, LOSS OF USE, LOSS OF GOODWILL, LOSS OF DATA, OR ANY SPECIAL,
        INCIDENTAL, INDIRECT, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES,
        UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS
        OR YOUR USE OF, OR INABILITY TO USE, THE SERVICES, EVEN IF FORESEEABLE
        AND EVEN IF A COMPANY PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
        DAMAGES.
      </Caps>
      <Caps>
        TO THE FULLEST EXTENT PERMITTED BY LAW, THE COMPANY PARTIES’ TOTAL
        AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO
        THESE TERMS OR THE SERVICES SHALL NOT EXCEED{" "}
        <ToBeConfirmed>liability cap — to be set by counsel</ToBeConfirmed>.
      </Caps>
      <Caps>
        SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OF LIABILITY FOR PERSONAL
        INJURY OR FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO SOME OF THE ABOVE
        LIMITATIONS MAY NOT APPLY TO YOU. NOTHING IN THESE TERMS EXCLUDES OR
        LIMITS LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED OR LIMITED.
      </Caps>
    </Section>
  );
}

function Indemnity() {
  return (
    <Section number="29">
      <p>
        You agree to indemnify, defend and hold harmless the Company Parties
        from and against any and all claims, disputes, demands, liabilities,
        damages, losses, costs and expenses, including reasonable legal and
        accounting fees, arising out of or related to: (i) your access to or use
        of the Services; (ii) your User Content; (iii) your use of Third-Party
        Services and Materials; (iv) any transaction you or an Agent you
        configured executed; (v) your violation of these Terms or of any
        applicable law; or (vi) your violation of any third party’s rights.
      </p>
      <p>
        If you are obliged to indemnify a Company Party, that party has the
        right, in its sole discretion, to control any action or proceeding and
        to determine whether to settle it and on what terms, and you agree to
        cooperate fully in the defense or settlement.
      </p>
    </Section>
  );
}

function GoverningLaw() {
  return (
    <Section number="30">
      <p>
        These Terms, and any dispute arising out of or relating to them or the
        Services, shall be governed by and construed in accordance with the laws
        of{" "}
        <ToBeConfirmed>governing law — to be set by counsel</ToBeConfirmed>,
        without regard to its conflict of law principles; provided that all
        provisions relating to arbitration shall be governed by{" "}
        <ToBeConfirmed>
          arbitration law — to be set by counsel
        </ToBeConfirmed>
        .
      </p>
    </Section>
  );
}

function DisputeResolution() {
  return (
    <Section number="31">
      <p>
        <strong>Informal resolution first.</strong> In the event of any dispute,
        claim or controversy arising out of or relating to these Terms or the
        Services, both parties agree to first attempt to resolve it amicably
        through good-faith negotiation. You may notify us of a dispute by
        emailing <EmailLink />. We will respond using the contact details you
        have provided.
      </p>
      <p>
        <strong>Arbitration.</strong> If the dispute is not resolved within
        sixty (60) days after notice, either party may elect to submit it to{" "}
        <strong>binding individual arbitration</strong> administered by{" "}
        <ToBeConfirmed>
          arbitration forum — to be set by counsel
        </ToBeConfirmed>{" "}
        in accordance with its then-current rules, rather than in court. The
        seat of arbitration shall be{" "}
        <ToBeConfirmed>seat — to be set by counsel</ToBeConfirmed>, before a
        single arbitrator, conducted in English, and may be held remotely by
        video conference.
      </p>
      <p>
        <strong>Authority of the arbitrator.</strong> The arbitrator shall have
        exclusive authority to resolve any dispute relating to the
        interpretation, applicability, enforceability or formation of this
        arbitration agreement, including any claim that all or part of it is
        void or voidable. The arbitrator’s decision shall be final and binding,
        and judgment on the award may be entered in any court of competent
        jurisdiction. All proceedings, including negotiations, submissions and
        awards, shall be kept strictly confidential except as required by law.
      </p>
      <p>
        <strong>Exceptions.</strong> This arbitration agreement does not prevent
        either party from seeking injunctive or other equitable relief in a
        court of competent jurisdiction, including in respect of the alleged
        unlawful use of intellectual property, nor from bringing an individual
        claim in a small-claims court where it qualifies.
      </p>
      <p>
        <strong>Opt-out.</strong> You may opt out of this arbitration agreement
        by sending written notice to <EmailLink /> within thirty (30) days of
        first agreeing to these Terms. If you opt out of the arbitration
        provisions only, the class action waiver in <Ref to="32" /> still
        applies. You may not opt out of the class action waiver alone. If you
        opt out, we will not be bound by the arbitration provisions either.
      </p>
    </Section>
  );
}

function ClassActionWaiver() {
  return (
    <Section number="32">
      <Caps>
        YOU AND THE COMPANY AGREE THAT ANY CLAIM OR DISPUTE SHALL BE LITIGATED
        OR ARBITRATED ON AN INDIVIDUAL BASIS ONLY, AND NOT ON A CLASS,
        COLLECTIVE, CONSOLIDATED, MULTIPLE-PLAINTIFF OR REPRESENTATIVE BASIS
        (“CLASS ACTION”). YOU AND THE COMPANY WAIVE THE RIGHT TO PARTICIPATE AS
        A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION, AND WAIVE THE RIGHT TO
        A JURY TRIAL IN ANY LEGAL PROCEEDING ARISING OUT OF OR RELATING TO THESE
        TERMS OR THE SERVICES.
      </Caps>
      <p>
        The arbitrator may not consolidate the claims of more than one person,
        may not preside over any form of Class Action, and may not award relief
        to anyone who is not a party to the arbitration. If this class action
        waiver is limited, voided or found unenforceable in any proceeding,
        then, unless the parties agree otherwise, the agreement to arbitrate
        shall be null and void with respect to that proceeding, and the
        proceeding must be brought in a court of competent jurisdiction rather
        than in arbitration.
      </p>
    </Section>
  );
}

function TimeToFileClaims() {
  return (
    <Section number="33">
      <p>
        <span className="tracking-[0.015em]">
          ANY CLAIM OR CAUSE OF ACTION ARISING OUT OF OR RELATING TO THESE TERMS
          OR THE SERVICES MUST BE FILED WITHIN ONE (1) YEAR AFTER SUCH CLAIM OR
          CAUSE OF ACTION AROSE; OTHERWISE IT IS PERMANENTLY BARRED.
        </span>{" "}
        Some jurisdictions do not permit shortened limitation periods, in which
        case this section does not apply to you.
      </p>
    </Section>
  );
}

function Termination() {
  return (
    <Section number="34">
      <p>
        <strong>By you.</strong> You may stop using the Services at any time,
        and you may delete your Account from within the Services.{" "}
        <strong>
          Before deleting, withdraw your funds and stop any running Agent.
        </strong>{" "}
        Deletion is not reversible: signing in again with the same identity
        creates a new account, your username is retired, and we cannot recover
        funds from a wallet after the Account that surfaced it is gone. Details
        of what is deleted and what is retained are in our <PrivacyLink />.
      </p>
      <p>
        <strong>By us.</strong> We may terminate or suspend your access to all
        or part of the Services at our sole discretion, without prior notice and
        for any reason, including a breach of these Terms, suspected fraud or
        illegal activity, or a legal or regulatory requirement.
      </p>
      <p>
        <strong>Effect.</strong> On termination your right to use the Services
        ceases immediately. Sections that by their nature should survive —
        including §§16, 20–24, 26–33 and 35–37 — survive termination. The
        Company Parties shall not be liable to you or any third party for any
        termination of your access.
      </p>
      <p>
        Can’t get into the app?{" "}
        <Link href="/delete-account" className={LINK_CLASS}>
          Request deletion by email
        </Link>
        .
      </p>
    </Section>
  );
}

function MobileApps() {
  return (
    <Section number="35">
      <p>
        If you download a Trenchers AI mobile application, the following applies
        in addition to the rest of these Terms.
      </p>
      <p>
        <strong>Apple.</strong> These Terms are between you and the Company
        only, not with Apple Inc. (“<strong>Apple</strong>”), and Apple is not
        responsible for the application or its content. Your license to use the
        application is a limited, non-transferable license to use it on
        Apple-branded products you own or control, as permitted by the App Store
        Usage Rules. Apple has no obligation to furnish any maintenance or
        support. To the maximum extent permitted by law, Apple has no warranty
        obligation whatsoever; in the event of any failure of the application to
        conform to an applicable warranty, you may notify Apple and Apple will
        refund the purchase price (if any), and Apple has no other obligation.
        Apple is not responsible for addressing any claim relating to the
        application, including product liability, regulatory non-compliance, or
        consumer protection claims, or for any third-party claim that the
        application infringes intellectual property rights. You represent that
        you are not located in a country subject to a U.S. Government embargo or
        designated as “terrorist supporting”, and that you are not on any U.S.
        Government list of prohibited or restricted parties.{" "}
        <strong>
          Apple and its subsidiaries are third-party beneficiaries of these
          Terms and may enforce them against you.
        </strong>
      </p>
      <p>
        <strong>Google.</strong> If you obtain the application through Google
        Play, these Terms are between you and the Company only, not with Google,
        and your use is additionally subject to the Google Play Terms of
        Service. Google is not responsible for the application or its content
        and has no obligation to provide support.
      </p>
      <p>
        <strong>Platform availability.</strong> Certain features may be
        unavailable, restricted or disabled on a given mobile platform for
        regulatory, app-store or technical reasons, and this may differ from
        what is available on the web.
      </p>
    </Section>
  );
}

function General() {
  return (
    <Section number="36">
      <p>
        <strong>Force majeure.</strong> Except for payment obligations, neither
        party is liable for any failure or delay in performance caused by events
        beyond its reasonable control, including natural disasters, fire,
        epidemic or pandemic, riot, war, terrorism, denial-of-service attacks,
        blockchain network failures or forks, internet or utility outages,
        third-party provider failures, labour shortages, and judicial or
        government action.
      </p>
      <p>
        <strong>Waiver and severability.</strong> No waiver of any term shall be
        deemed a further or continuing waiver of that or any other term. If any
        provision is held invalid, illegal or unenforceable, it shall be
        eliminated or limited to the minimum extent necessary, and the remaining
        provisions shall continue in full force and effect.
      </p>
      <p>
        <strong>Assignment.</strong> You may not assign or transfer these Terms
        or any rights under them without our prior written consent. We may
        assign these Terms freely, including in connection with a merger,
        acquisition, reorganisation or sale of assets.
      </p>
      <p>
        <strong>No third-party beneficiaries.</strong> Except as stated in{" "}
        <Ref to="35" /> with respect to Apple, these Terms confer no rights on
        any third party.
      </p>
      <p>
        <strong>Notices and electronic communications.</strong> You consent to
        receive communications from us electronically, including by email and
        in-app notice, and agree that such communications satisfy any legal
        requirement that they be in writing. Notices to us should be sent to{" "}
        <EmailLink />.
      </p>
      <p>
        <strong>Relationship.</strong> Nothing in these Terms creates a
        partnership, joint venture, employment or agency relationship between
        you and us.
      </p>
      <p>
        <strong>Privacy.</strong> All personal information collected through the
        Services is handled in accordance with our <PrivacyLink />.
      </p>
      <p>
        <strong>Linking.</strong> You may link to our site in a manner that is
        fair and legal and does not damage our reputation, but you must not
        suggest any association, approval or endorsement without our express
        written consent. We may withdraw linking permission at any time.
      </p>
      <p>
        <strong>Entire agreement.</strong> These Terms, together with our{" "}
        <PrivacyLink /> and any other agreements expressly incorporated by
        reference, constitute the entire agreement between you and the Company
        with respect to the Services and supersede all prior or contemporaneous
        communications and proposals, whether oral or written.
      </p>
      <p>
        <strong>Language.</strong> Except where the law provides otherwise, in
        the event of any discrepancy between the English version of these Terms
        and a translation, the English version prevails.
      </p>
    </Section>
  );
}

function Contact() {
  return (
    <Section number="37">
      <p>
        Questions, comments, requests for support and other communications
        relating to the Services should be directed to:
      </p>
      <RecordTable
        columns={["Channel", "Details"]}
        showHeader={false}
        grid="md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
        rows={[
          [
            <span key="support" className="inline-flex items-center gap-2">
              <Mail aria-hidden className="size-4 text-white/40" />
              Support
            </span>,
            <>
              <EmailLink />, or in-app support
            </>,
          ],
          [
            <span key="legal" className="inline-flex items-center gap-2">
              <Gavel aria-hidden className="size-4 text-white/40" />
              Legal and disputes
            </span>,
            <EmailLink key="legal-email" />,
          ],
          [
            <span key="company" className="inline-flex items-center gap-2">
              <Landmark aria-hidden className="size-4 text-white/40" />
              Company
            </span>,
            "Trenchers AI",
          ],
        ]}
      />
      <Callout icon={Smartphone}>
        <p>
          Our <PrivacyLink>Privacy Policy</PrivacyLink> explains what we collect
          and why, including on the mobile apps. Reading both together gives you
          the full picture.
        </p>
      </Callout>
    </Section>
  );
}
