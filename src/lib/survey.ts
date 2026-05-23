// Survey schema — single source of truth shared by the API, the survey
// page, and the analytics dashboard. If you change a `key` here, the
// dashboard's per-question rollups will silently start reading nothing —
// add a new key and migrate, don't rename in place.

export const SURVEY_CAMPAIGN = "trader-research-v1";

export type ToolOption =
  | "axiom"
  | "photon"
  | "gmgn"
  | "bullx"
  | "trojan"
  | "bonkbot"
  | "maestro"
  | "dexscreener"
  | "birdeye"
  | "pumpfun"
  | "tradingview"
  | "tg-alpha"
  | "custom-bots";

export const TOOL_OPTIONS: { key: ToolOption; label: string }[] = [
  { key: "axiom", label: "Axiom" },
  { key: "photon", label: "Photon" },
  { key: "gmgn", label: "GMGN" },
  { key: "bullx", label: "BullX" },
  { key: "trojan", label: "Trojan" },
  { key: "bonkbot", label: "BonkBot" },
  { key: "maestro", label: "Maestro" },
  { key: "dexscreener", label: "Dexscreener" },
  { key: "birdeye", label: "Birdeye" },
  { key: "pumpfun", label: "Pump.fun" },
  { key: "tradingview", label: "TradingView" },
  { key: "tg-alpha", label: "Telegram alpha groups" },
  { key: "custom-bots", label: "Custom/private bots" },
];

export type VolumeBucket =
  | "under-1k"
  | "1k-10k"
  | "10k-50k"
  | "50k-250k"
  | "250k-plus";

export const VOLUME_OPTIONS: { key: VolumeBucket; label: string }[] = [
  { key: "under-1k", label: "Under $1,000" },
  { key: "1k-10k", label: "$1,000–$10,000" },
  { key: "10k-50k", label: "$10,000–$50,000" },
  { key: "50k-250k", label: "$50,000–$250,000" },
  { key: "250k-plus", label: "$250,000+" },
];

export type WantOption =
  | "snipe-launches"
  | "copy-trade"
  | "smart-money"
  | "bots-faster"
  | "manage-risk"
  | "find-early";

export const WANT_OPTIONS: { key: WantOption; label: string }[] = [
  { key: "snipe-launches", label: "Snipe new launches" },
  { key: "copy-trade", label: "Copy trade wallets" },
  { key: "smart-money", label: "Track smart money" },
  { key: "bots-faster", label: "Set up trading bots faster" },
  { key: "manage-risk", label: "Manage risk per strategy" },
  { key: "find-early", label: "Find early tokens" },
];

// Keys persisted to SurveyAnswer.questionKey. The "engagement" columns on
// the dashboard count distinct values of this enum.
export const QUESTION_KEYS = [
  "tools",
  "toolsOther",
  "volume",
  "wants",
  "freeform",
  "twitter",
  "telegram",
  "country",
] as const;

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export const FREEFORM_MAX_CHARS = 4000;
export const HANDLE_MAX_CHARS = 80;
export const COUNTRY_MAX_CHARS = 80;
export const TOOLS_OTHER_MAX_CHARS = 200;

export function isToolOption(v: unknown): v is ToolOption {
  return (
    typeof v === "string" && TOOL_OPTIONS.some((o) => o.key === v)
  );
}

export function isVolumeBucket(v: unknown): v is VolumeBucket {
  return (
    typeof v === "string" && VOLUME_OPTIONS.some((o) => o.key === v)
  );
}

export function isWantOption(v: unknown): v is WantOption {
  return (
    typeof v === "string" && WANT_OPTIONS.some((o) => o.key === v)
  );
}

/// Server-side validator for autosave POSTs. Returns the sanitized value
/// (so e.g. an oversized freeform string gets truncated) or null when the
/// payload is invalid for the given question key.
export function sanitizeAnswer(
  key: QuestionKey,
  raw: unknown,
): { value: unknown } | null {
  switch (key) {
    case "tools": {
      if (!Array.isArray(raw)) return null;
      const cleaned = Array.from(
        new Set(raw.filter((v) => isToolOption(v))),
      );
      return { value: cleaned };
    }
    case "toolsOther": {
      if (typeof raw !== "string") return null;
      return { value: raw.trim().slice(0, TOOLS_OTHER_MAX_CHARS) };
    }
    case "volume": {
      if (!isVolumeBucket(raw)) return null;
      return { value: raw };
    }
    case "wants": {
      if (!Array.isArray(raw)) return null;
      const cleaned = Array.from(
        new Set(raw.filter((v) => isWantOption(v))),
      );
      return { value: cleaned };
    }
    case "freeform": {
      if (typeof raw !== "string") return null;
      return { value: raw.trim().slice(0, FREEFORM_MAX_CHARS) };
    }
    case "twitter":
    case "telegram": {
      if (typeof raw !== "string") return null;
      // Strip a leading @ — it gets re-added at display time. Keep the
      // rest of the handle as-is so we don't accidentally mangle URLs
      // someone pastes.
      return {
        value: raw.trim().replace(/^@+/, "").slice(0, HANDLE_MAX_CHARS),
      };
    }
    case "country": {
      if (typeof raw !== "string") return null;
      return { value: raw.trim().slice(0, COUNTRY_MAX_CHARS) };
    }
  }
}
