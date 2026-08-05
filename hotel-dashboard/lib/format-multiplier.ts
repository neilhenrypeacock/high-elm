/**
 * Breakout-multiplier DISPLAY rules. Presentation only — nothing here changes a
 * figure, a baseline, a threshold or which posts qualify as breakouts.
 *
 * Why a cap: past a certain point a multiplier is arithmetically right and
 * editorially worthless. A hotel with 100,354 followers whose typical post earns
 * 20 likes has a broken audience, not a brilliant post — and the hotel marketer
 * we sell to reads "1,227×" as proof the tool is broken. So anything at or above
 * MULTIPLIER_CAP renders as "50×+", and capped posts are barred from any
 * headline / hero slot (they still appear in the ranked feed — see belowCap).
 *
 * This file must never import from lib/data.ts, and lib/data.ts must never
 * import from it. The maths lives there; the manners live here.
 *
 * lib/data.ts used to PRE-FORMAT two multiplier strings that could not pass
 * through this helper — whatsWorkingData[scope].stats "Best multiple on record"
 * and observations[] "The biggest breakout" — either of which would have carried
 * a raw 1226.9× straight past the cap if ever put back on screen. Both were
 * deleted along with the rest of the data the 2026-07-23 lever rebuild orphaned,
 * so the hazard is gone rather than merely dormant. Keep it that way: format
 * multipliers at the render site, through formatMultiplier.
 */

/** At or above this, a multiplier stops being credible and shows as "50×+". */
export const MULTIPLIER_CAP = 50;

/** How a capped multiplier reads. One place, so the copy stays consistent. */
export const CAPPED_MULTIPLIER_LABEL = `${MULTIPLIER_CAP}×+`;

/**
 * True when a multiplier is too large to be shown as a precise figure.
 *
 * Tested against the ROUNDED display value, not the raw one: 49.96 is under the
 * cap but toFixed(1) prints it as "50.0×", which reads as an uncapped figure
 * sitting exactly on the threshold. Round first, then compare.
 */
export function isCappedMultiplier(multiplier: number): boolean {
  if (!Number.isFinite(multiplier)) return true;
  return Number(multiplier.toFixed(1)) >= MULTIPLIER_CAP;
}

/** "31.1×" below the cap, "50×+" at or above it. The only way to render one. */
export function formatMultiplier(multiplier: number): string {
  return isCappedMultiplier(multiplier)
    ? CAPPED_MULTIPLIER_LABEL
    : `${multiplier.toFixed(1)}×`;
}

/**
 * The subset a headline / "biggest breakout" / hero slot may draw from: capped
 * posts are filtered out so the number we show off is always one a hotelier
 * would believe.
 *
 * Falls back to the original list when EVERY candidate is capped — an empty hero
 * is worse than a capped one, and the fallback is safe because the figure still
 * renders through formatMultiplier as "50×+", never as a raw absurdity.
 */
export function belowCap<T extends { multiplier: number }>(posts: T[]): T[] {
  const credible = posts.filter(p => !isCappedMultiplier(p.multiplier));
  return credible.length > 0 ? credible : posts;
}
