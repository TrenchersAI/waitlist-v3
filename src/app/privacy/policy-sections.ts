import { createOutline } from "@/src/components/legal/legal-outline";

export const POLICY_UPDATED = {
  iso: "2026-09-16",
  label: "September 16, 2026",
} as const;

/** Every numbered heading of the Privacy Policy, in document order. */
export const PRIVACY_OUTLINE = createOutline([
  ["1", "The short version"],
  ["2", "Information we collect"],
  ["2.1", "Information you give us"],
  ["2.2", "Information we collect automatically"],
  ["2.3", "Information we receive from other sources"],
  ["2.4", "What we do not collect"],
  ["2.5", "De-identified and aggregated information"],
  ["3", "How we use your information"],
  ["4", "Blockchain data is public and permanent"],
  ["5", "Session recording and product analytics"],
  ["6", "AI features"],
  ["7", "How we share your information"],
  ["7.1", "Service providers (processors)"],
  ["7.2", "Other users and the public"],
  ["7.3", "Legal, safety and enforcement"],
  ["7.4", "Corporate transactions"],
  ["7.5", "Professional advisors and affiliates"],
  ["7.6", "With your consent or at your direction"],
  ["8", "Public surfaces"],
  ["9", "Third-party services and links"],
  ["10", "Cookies, local storage and tracking"],
  ["10.1", "What we use"],
  ["10.2", "What third parties use"],
  ["10.3", "Your choices"],
  ["11", "Your privacy rights"],
  ["11.1", "European Economic Area, United Kingdom and Switzerland"],
  ["11.2", "California"],
  ["11.3", "Other US states"],
  ["11.4", "India"],
  ["11.5", "France"],
  ["12", "Deleting your account"],
  ["13", "Data retention"],
  ["14", "Security"],
  ["15", "International transfers and where data lives"],
  ["16", "Other things you should know"],
  ["16.1", "Children"],
  ["16.2", "Mobile app specifics"],
  ["16.3", "Automated decision-making"],
  ["16.4", "Changes to this Policy"],
  ["16.5", "Language"],
  ["16.6", "Contact us"],
]);

export const POLICY_SECTIONS = PRIVACY_OUTLINE.sections;
