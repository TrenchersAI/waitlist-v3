/** Card shell fill + edge treatment (matches BotUnitCard article). */
export const BOT_UNIT_CARD_SURFACE_CLASSES =
  "bg-[#0A0A0A] shadow-[0px_1px_0px_0px_#FFFFFF1A_inset,0px_0px_0px_1px_#FFFFFF05_inset]";

/**
 * Opt-in size query host — only on cards with explicit block size (Fleet `h-full`,
 * carousel `h-[168px]`). `container-type: size` on auto-height grid rows (e.g.
 * archived agents) prevents contents from sizing the row.
 */
export const BOT_UNIT_CARD_SIZE_QUERY_HOST_CLASSES =
  "@container-[size] min-h-0";

/**
 * Fixed height for carousel empty-state slides — shimmer ↔ revealed card (no CLS).
 * Tuned to intrinsic compact {@link BotUnitCard} (facts beside sparkline) +
 * footer at 320px. Stacked mobile hero does not apply at this height.
 */
export const BOT_UNIT_CARD_CAROUSEL_HEIGHT_CLASS = "h-[168px]";

/**
 * Floor for the mobile Fleet strip. Matches the compact card (header +
 * side-by-side facts/sparkline + Add balance). Taller leftover height
 * switches on the stacked hero via a block-size container query (see below).
 */
export const BOT_UNIT_CARD_MIN_HEIGHT_CLASS = "min-h-[168px]";

/**
 * Fleet card layout, shared by the live grid and its loading skeleton so the
 * two cannot drift (they did: the skeleton reflowed on load).
 *
 * Below md this is a horizontal snap strip. From md up it is an INTRINSIC
 * grid: `auto-fill` adds COLUMNS as the viewport grows instead of widening
 * cards. The old `md:2 / lg:3 / xl:4` ladder had no rung above 1280px, so
 * every width from there up held 4 columns and stretched each card to ~600px
 * against content laid out for ~272px — the card's own container queries key
 * on height, so nothing reflowed to fill it. `minmax(17rem,1fr)` reproduces
 * 2 / 3 / 4 columns at md / lg / xl and keeps going past xl on its own.
 */
export const BOT_UNIT_CARD_GRID_CLASS =
  "flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory " +
  "hide-scrollbar max-md:h-full md:grid md:gap-4 md:overflow-visible md:snap-none " +
  "md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]";

/**
 * Mobile hero: stack facts above a growing sparkline only when the card block
 * size exceeds 220px. Uses `[@container_(height>=220px)]` on the card's size
 * container — not inline width (wide 168px-tall carousel/Fleet shells stay
 * compact). Used by the card and the matching shimmer.
 */
export const BOT_UNIT_CARD_FACTS_ROW_CLASS =
  "mt-4 flex items-center justify-between gap-4 pt-1 " +
  "max-md:[@container_(height>=220px)]:min-h-0 " +
  "max-md:[@container_(height>=220px)]:flex-1 " +
  "max-md:[@container_(height>=220px)]:flex-col " +
  "max-md:[@container_(height>=220px)]:items-start";

export const BOT_UNIT_CARD_FACTS_COPY_CLASS =
  "min-w-0 flex-1 text-left " +
  "max-md:[@container_(height>=220px)]:flex-none " +
  "max-md:[@container_(height>=220px)]:shrink-0";

export const BOT_UNIT_CARD_CHART_SLOT_CLASS =
  "h-7 w-[82px] shrink-0 " +
  "max-md:[@container_(height>=220px)]:h-auto " +
  "max-md:[@container_(height>=220px)]:min-h-0 " +
  "max-md:[@container_(height>=220px)]:w-full " +
  "max-md:[@container_(height>=220px)]:flex-1";

/** @deprecated Use {@link BOT_UNIT_CARD_CAROUSEL_HEIGHT_CLASS}. */
export const BOT_UNIT_CARD_CAROUSEL_MIN_HEIGHT_CLASS =
  BOT_UNIT_CARD_CAROUSEL_HEIGHT_CLASS;

/** Bottom strip (gradient + layered shadows). */
export const BOT_UNIT_CARD_FOOTER_CLASSES =
  "flex items-center justify-between gap-3 border-t border-white/8 px-4 py-2.5 " +
  "bg-[linear-gradient(0deg,#222120,#222120),radial-gradient(100%_100%_at_0%_50%,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%)] " +
  "shadow-[0px_2px_4px_0px_#00000026,0px_7px_7px_0px_#00000021,0px_16px_9px_0px_#00000014,0px_28px_11px_0px_#00000005,0px_44px_12px_0px_#00000000,0px_1px_0px_0px_#FFFFFF0D_inset,0px_-2px_0px_0px_#0000002E_inset]";
