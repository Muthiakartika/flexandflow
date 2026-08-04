@AGENTS.md

# Project state — handoff

Next.js 16 + Tailwind v4 rebuild of **flexandflow.fit** (a WordPress site the owner
controls), a small wellness & recovery studio in Uluwatu, Bali. Product truth lives in
`PRODUCT.md` at the repo root.

Work has run in two phases. Phase 1 (pixel-cloning the WordPress site) is **done**.
Phase 2 (a full UI redesign) is **in progress and unresolved** — read that section before
changing anything.

---

## Phase 2 — the redesign (active work)

### The brief, in the owner's words

- Rework the **UI/layout** to be more modern, casual and simple. A total departure from
  the original WordPress design, not a light touch.
- **Do not change** brand colours (olive `#7f8c3a`, cream `#f0efeb`, black), fonts
  (Amatic SC display, Andika body), the logo, the photography, or the **homepage text
  content** — headings and body copy stay verbatim.
- No oversized top/bottom margins. Check responsiveness.
- Reference sites the owner supplied: **stretchr.com/landing-page** and
  **powerandrevive.studio**.

### Reference calibration (important)

`stretchr.com` is the real peer — an assisted-stretching studio. Its largest type is
**~61px**, ground stays light, 10px radius, Inter/Poppins. `powerandrevive.studio` is a
**gym**: Anton at 118px, black-dominant. Following the gym's scale produced a page the
owner rejected as "terlalu besar … kurang bagus untuk website assisted stretching".
**Calibrate to Stretchr, not Power + Revive.**

### Where it stands

**The redesign is live on every page**, home page first and then the rest, all
awaiting the owner's review. The system — measure, scale, surfaces, motion, the
derived-price rule, the copy rule — is documented in **`DESIGN.md`**; read that before
changing any of it. Shared class strings live in `components/ui/tokens.ts`.

The only pages left on WordPress are the **price list** and the **appointment/booking**
flow, which were never in scope. Link to them through `wordpressUrls`, never
`next/link`.

Verified at 390 / 768 / 1280px across every route: no horizontal overflow, nothing
shipping at `opacity: 0`, header/body/footer gutters aligned, build generating all 32
pages.

Removed with the pages that used them, and recoverable from git history: `Reveal.tsx`
(the fade-up that shipped content invisible), `SectionHeading.tsx`, `Container.tsx`,
`ArchivePostCard.tsx`, `TreatmentCard.tsx`, `lib/masonry.ts`, `sections/home/Session.tsx`
and `Tiers.tsx` (both carried headings written for them rather than the studio's own
copy), and the theme's layout CSS — the 1810px container, the 74px photo title band,
`--band-gap`, `.service-copy`, `.hero-panel`, and the decorative PNG masks.

The four preview routes stay as history, none of them live, still on the old classes:

| Route | Direction | Verdict |
|---|---|---|
| `/preview/a` | Quiet — minimal, no cards, big air | rejected, "too simple" |
| `/preview/b` | Warm — rounded, casual, friendly triage | rejected, "too simple" |
| `/preview/c` | Clear — structural, prices in the open | rejected, "too simple" |
| `/preview/d` | Studio — the basis for the live page | superseded by `/` |

**Header and footer** apply to every page: 76px sticky header
(`components/layout/Header.tsx`, uppercase tracked nav) and a deliberately small
**white** footer (`components/layout/Footer.tsx`). A black footer was tried and
rejected. Both now sit on `.page-wrap`, so they share the page body's 1240px measure.

---

## Gotchas that cost real time — read before touching UI

1. **Screenshots do not work in this environment.** The browser pane never composites
   frames, so `computer{action:"screenshot"}` always times out. All verification must be
   numeric (`getBoundingClientRect`, `getComputedStyle`) — or ask the owner for a
   screenshot, which they can and do provide. Do not iterate on visual design blind for
   several rounds; it does not converge.

2. **Tailwind arbitrary breakpoint variants are unreliable here.** `max-[1280px]:hidden`,
   `min-[1281px]:order-none` etc. have silently failed even when `matchMedia` reports the
   query matches, and competing `max-[...]` rules lose to each other by emit order. Put
   anything responsive that matters into `app/globals.css` as explicit `@media` blocks —
   that is why `.hero-gap-top`, `.service-container`, `.service-copy`,
   `.site-header-inner`, `.header-wide-only` exist. Put show/hide classes on bare wrapper
   elements so no Tailwind `display` utility competes (utilities outrank components).

3. **`Reveal` measures 30px low.** `components/ui/Reveal.tsx` starts at
   `translate-y-[30px] opacity-0`, and Tailwind v4 uses the **`translate` property, not
   `transform`** — neutralising `transform` does nothing. Its IntersectionObserver often
   never fires in the non-compositing pane. Before measuring layout:
   `document.querySelectorAll('*').forEach(el=>{if(getComputedStyle(el).transitionProperty.includes('opacity')){el.style.translate='none';el.style.opacity='1';}})`

4. **The dev server serves stale CSS** after `globals.css` edits — rules appear to apply
   outside their media query. Always reload with a cache-busting query string.

5. **Contrast auditing:** canvas `fillStyle` cannot parse Tailwind v4's `oklab()` colours,
   and a naive "is it transparent" regex matches `rgb(0, 0, 0)`. Both produce nonsense
   ratios. For simple known pairs, compute by hand.

6. **On the original WordPress site**, Elementor gates entrance animations with
   `.elementor-invisible` (`visibility:hidden`). Strip it before measuring. A heading still
   hidden after stripping is genuinely hidden — e.g. the service banner titles.

---

## Data hazards in `lib/data/services.ts`

**Sessions are not a uniform 60 minutes and not every service has both tiers.** This has
produced false public prices three separate times.

- Cupping therapy: **30 min**, Master-only, IDR 300,000
- Trauma healing: **90 min**, IDR 1,500,000
- Most others: 60 min

Never take a global minimum per tier label — it advertises a price that cannot be booked
and can invert the tier hierarchy (Master appearing cheaper than Therapist). Filter by
duration and/or to services offering both tiers. Also **some `price` strings already
carry an `Rp` prefix and some do not** — normalise to digits before formatting.

**Re-synced against the live site on 2026-08-04.** Seven of the eight service pages
matched. Two did not: **sport massage** and **lymphatic drainage** carried long-form
bodies (deep-tissue comparison, aftercare sections, ten-item FAQs) that
flexandflow.fit no longer serves — the live pages are the older, shorter versions.
Both bodies were replaced with what the live site actually publishes, so **the removed
copy is in git history, not a bug**; do not restore it without asking the owner. The
same pass fixed three body links still pointing at the `green-hare-976010.hostingersite.com`
staging host, and reordered the home grid to the live sequence (men's detox, trauma,
stretching, sport, cupping, drainage).

**`lib/pricing.ts` now does all of this.** Use it rather than parsing tiers again:
`priceAmount` (digits only), `tierMinutes` (falls back to the service-level label —
pregnancy massage's cheaper tier has no `duration` of its own), `serviceMinutes`,
`ratesFor`, and `lowestHourlyRate` (60-minute sessions at both-tier services only).

---

## Outstanding

- **Owner review of the redesigned site** is the next step. Ask for screenshots rather
  than iterating blind (gotcha 1).
- **Button contrast — decision still open.** Filled surfaces site-wide now use
  `--color-primary-strong: #6d7932` (**4.76:1** with white at 15px) instead of
  `--color-primary` `#7f8c3a` (**3.67:1**, fails AA). The brand colour is untouched and
  still owns every accent; reverting is one line in `app/globals.css`.
- **No social proof.** Both reference sites lead on star ratings and named reviews; this
  site has none. Owner needs to supply a real Google rating and quotes. Do not invent them.
- **Forms post nowhere.** `ContactForm` and `NewsletterForm` acknowledge locally, per
  the brief. Wiring a backend is unstarted.
- Focus states and motion are done everywhere: `FOCUS` / `FOCUS_ON_OLIVE` in
  `components/ui/tokens.ts`, and one ticker as the only authored animation.

---

## Phase 1 — completed clone fidelity work (superseded)

Phase 1 reproduced the WordPress layout by DOM measurement, and Phase 2 has now
replaced it everywhere. Its layout CSS — `--band-gap` and the 50/60/70/80/100/130px
step, `.service-container` / `.service-copy`, `.site-header-inner`, `.hero-panel`,
`.hero-wave`, `.team-mask`, `.wave-edge`, `.section-mask`, `.container-boxed`,
`.page-hero-title` — was removed with the components that used it. **It is all in git
history**, along with the measurements behind it, if the WordPress site ever needs to
be compared against again.

What survives from Phase 1, because the content still needs it:

- `.icon-list` — star bullets: 14px olive stars, **column-wise** fill via CSS
  multi-column (the original is two side-by-side `<ul>`s).
- `.clover-list` — clover-glyph bullets, still used by "Complete Wellness".
- `.heading-hidden` — service banner titles are `visibility:hidden` on the original,
  so they stay in the DOM for heading order and are never painted.
- The ported copy and data in `lib/data/`, which remain verbatim.
- Every original asset under `public/`, including the masks the removed CSS used.
