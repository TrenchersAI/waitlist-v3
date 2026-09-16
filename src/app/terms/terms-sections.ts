import { createOutline } from "@/src/components/legal/legal-outline";

export const TERMS_UPDATED = {
  iso: "2026-09-16",
  label: "September 16, 2026",
} as const;

/** Every numbered heading of the Terms of Service, in document order. */
export const TERMS_OUTLINE = createOutline([
  ["1", "Introduction; Preamble"],
  ["2", "Changes to these Terms"],
  ["3", "Changes to the Services"],
  ["4", "Beta and pre-release features"],
  ["5", "Eligibility, jurisdiction and availability"],
  ["6", "Identity verification, sanctions screening and AML"],
  ["7", "Accounts and account security"],
  ["8", "Usernames, profiles and Account Content"],
  ["9", "Wallets, keys and custody"],
  ["10", "The Services are a conduit; trading"],
  ["11", "Delegated signing and one-tap trading"],
  ["12", "AI agents, bots and automated trading"],
  ["13", "Paper trading and simulated results"],
  ["14", "Copy trading, tracked wallets and cloned strategies"],
  ["15", "AI features"],
  ["16", "Fees"],
  ["17", "Deposits, withdrawals and fiat on-ramps"],
  ["18", "Rewards, points, tiers and the Referral Program"],
  ["19", "Leaderboards, rankings, competitions and performance metrics"],
  ["20", "User content, sharing and community conduct"],
  ["21", "No professional advice; no fiduciary duty"],
  ["22", "Taxes"],
  ["23", "Prohibited uses"],
  ["24", "Intellectual property; trademarks; feedback"],
  ["25", "Third-party services, materials and links"],
  ["26", "Assumption of risk"],
  ["27", "Disclaimer of warranties"],
  ["28", "Limitation of liability"],
  ["29", "Indemnity"],
  ["30", "Governing law"],
  ["31", "Dispute resolution; mandatory arbitration"],
  ["32", "Class action waiver and waiver of jury trial"],
  ["33", "Limitation on time to file claims"],
  ["34", "Termination and account deletion"],
  ["35", "Mobile applications and app store terms"],
  ["36", "General"],
  ["37", "Contact"],
]);

export const TERMS_SECTIONS = TERMS_OUTLINE.sections;
