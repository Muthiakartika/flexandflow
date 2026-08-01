/**
 * The redesign's shared class strings, used by every page.
 *
 * The brand pins the palette, the two faces and the photography; what the
 * redesign owns is structure. These constants are that structure written once —
 * a 1240px measure, one clamped band step, a 10px corner, and a single button
 * pair — so pages cannot drift apart as they are edited. See `DESIGN.md`.
 */

/** Ring drawn on keyboard focus. Every interactive element takes it. */
export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** On an olive ground the olive ring is invisible, so it flips to white. */
export const FOCUS_ON_OLIVE =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const WRAP = "page-wrap";
export const BAND = "page-band";
export const BAND_LINE = "page-band-line";

/** Page title on an inner page. One step under the home page's 56px. */
export const H1 =
  "text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.04] font-bold text-balance";

/** Section heading. Amatic is condensed, so 44px here reads at about the
 *  weight of Stretchr's 61px Poppins without shouting. */
export const H2 =
  "text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)] leading-[1.06] font-bold";

/** Sub-heading inside an article or card. */
export const H3 = "font-display text-[26px] leading-[1.1] font-bold";

/** White surface on the cream ground. The redesign's only container. */
export const CARD = "rounded-[10px] border border-secondary/10 bg-white";

export const BTN_SOLID =
  "inline-flex items-center justify-center gap-2 rounded-[10px] " +
  "bg-primary-strong px-6 py-3 font-body text-[15px] leading-none text-white " +
  `transition-colors duration-300 hover:bg-secondary ${FOCUS}`;

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-[10px] " +
  "border border-secondary/20 px-6 py-3 font-body text-[15px] leading-none " +
  `transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`;

/** Quiet text link with a hairline underline. */
export const LINK =
  "font-body text-[14px] underline decoration-secondary/25 underline-offset-[5px] " +
  `transition-colors duration-300 hover:text-primary hover:decoration-primary ${FOCUS}`;

/** Form field. Replaces the theme's `outline-none`-with-no-replacement inputs. */
export const FIELD =
  "w-full rounded-[10px] border border-secondary/20 bg-white px-4 py-3 " +
  "font-body text-[15px] text-body-text placeholder:text-body-text/45 " +
  "transition-colors duration-300 focus:border-primary " +
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary";
