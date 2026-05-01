/**
 * Canonical icon size scale (lucide-react compatible numeric pixel values).
 *
 * Use these constants instead of ad-hoc numbers so icon sizes stay
 * consistent across the app. Pick by role, not by guesswork:
 *
 *   ICON_XS (12) — inline marks alongside text
 *     chevrons in `<details>`, separator dots, micro-status pips
 *
 *   ICON_SM (14) — compact controls
 *     copy buttons, table-row actions, chip dismiss buttons,
 *     icons inside dense tab bars / compact toolbars
 *
 *   ICON_MD (16) — primary buttons & nav
 *     sidebar nav items, default action buttons, header buttons
 *
 *   ICON_LG (20) — page-level affordances
 *     PageHeader icons, hero CTAs, empty-state icons (paired with
 *     larger surrounding type)
 *
 * Convention for icon-only buttons: the outer hit target is roughly 2×
 * the icon size (24 / 28 / 32 / 40 px) — meets the 24 px minimum
 * accessible target while keeping a tight visual rhythm.
 *
 * Anything outside the four tiers (e.g. 11, 13, 15, 18) should round
 * to the nearest tier; if a screen genuinely needs an off-tier size,
 * leave a one-line comment explaining why.
 */
export const ICON_XS = 12;
export const ICON_SM = 14;
export const ICON_MD = 16;
export const ICON_LG = 20;

export type IconSize =
  | typeof ICON_XS
  | typeof ICON_SM
  | typeof ICON_MD
  | typeof ICON_LG;
