/** Card shell fill + edge treatment (matches BotUnitCard article). */
export const BOT_UNIT_CARD_SURFACE_CLASSES =
  "bg-[#0f0f0f] shadow-[0px_1px_0px_0px_#FFFFFF1A_inset,0px_0px_0px_1px_#FFFFFF05_inset]";

/** Base delay (ms) before the first sparkline stroke begins drawing. */
export const BOT_UNIT_CARD_SPARKLINE_BASE_DELAY_MS = 72;

/**
 * Horizontal stagger between agent cards in {@link Morphing} (motion delay).
 * Sparklines use {@link BOT_UNIT_CARD_SPARKLINE_STAGGER_MS} so paths can be paced slower than layout.
 */
export const BOT_UNIT_CARD_ENTRANCE_STAGGER_MS = 72;

/** Extra spacing between each sparkline stroke draw (ms per card index). */
export const BOT_UNIT_CARD_SPARKLINE_STAGGER_MS = 180;

/**
 * Locks carousel empty-state shimmer ↔ revealed card to one height (no CLS on reveal).
 * Tuned to intrinsic {@link BotUnitCard} body + footer at sm+.
 */
export const BOT_UNIT_CARD_CAROUSEL_MIN_HEIGHT_CLASS = "min-h-[188px]";

/** Bottom strip (gradient + layered shadows). */
export const BOT_UNIT_CARD_FOOTER_CLASSES =
  "flex items-center justify-between gap-3 border-t border-white/8 px-4 py-2.5 " +
  "bg-[linear-gradient(0deg,#222120,#222120),radial-gradient(100%_100%_at_0%_50%,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%)] " +
  "shadow-[0px_2px_4px_0px_#00000026,0px_7px_7px_0px_#00000021,0px_16px_9px_0px_#00000014,0px_28px_11px_0px_#00000005,0px_44px_12px_0px_#00000000,0px_1px_0px_0px_#FFFFFF0D_inset,0px_-2px_0px_0px_#0000002E_inset]";
