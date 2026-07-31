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

Four preview routes exist, none yet promoted to the live homepage:

| Route | Direction | Verdict |
|---|---|---|
| `/preview/a` | Quiet — minimal, no cards, big air | rejected, "too simple" |
| `/preview/b` | Warm — rounded, casual, friendly triage | rejected, "too simple" |
| `/preview/c` | Clear — structural, prices in the open | rejected, "too simple" |
| `/preview/d` | **Studio — current candidate** | latest iteration, unreviewed |

`/preview/d` now carries the whole homepage with original copy: hero (compact split,
rate tiles), chip bar, treatments (3-col cards w/ real price + duration), One on One
Private Therapy (+ benefit icons), Complete Wellness (+ clover list), therapists,
gallery, FAQs beside a Visit card. h1 56px desktop / 34px mobile, page ~4,820px.

**The live homepage (`app/page.tsx`) still renders an earlier, rejected design** —
`Hero / Practitioners / Tiers / Treatments / Session / Gallery / Faqs / BookClose` in
`sections/home/`. Promote a preview or rebuild before shipping.

**Header and footer were already rebuilt globally** and apply to every page: 77px sticky
header (`components/layout/Header.tsx`, uppercase tracked nav), and a deliberately small
**white** footer (`components/layout/Footer.tsx`). A black footer was tried and rejected.

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

---

## Outstanding

- **Button contrast:** the shared button is white-on-olive / olive-on-white at 15px =
  **3.67:1**, under 4.5:1. `#6d7932` (already used for a hover in `ScrollToTop.tsx`) gives
  **4.76:1** and would fix it without touching `--color-primary`. Owner decision pending;
  `/preview/c` and `/preview/d` already use it for buttons.
- **No social proof.** Both reference sites lead on star ratings and named reviews; this
  site has none. Owner needs to supply a real Google rating and quotes. Do not invent them.
- **Motion:** one identical 900ms fade-up is applied to ~23 elements across every section,
  and content ships `opacity-0` in the server HTML. Needs one authored moment instead.
- **Focus states** are missing on interactive elements added during the redesign;
  `NewsletterForm.tsx` sets `outline-none` with no replacement.
- `DESIGN.md` has not been written. Every page except the homepage still has the old body
  design under the new header/footer.

---

## Phase 1 — completed clone fidelity work

All verified against the live site by DOM measurement. Key custom classes in
`app/globals.css`:

- `--band-gap` — the theme's shared stepped scale (50/60/70/80/100/130px), consumed by
  `.hero-gap-top` (space under the page hero) and `.footer-gap-top`.
- `.service-container` / `.service-copy` — service page shell: container steps
  1810 → 1300 → 760px; copy column is 70% with a stepped right gutter.
- `.icon-list` — star bullets: 14px olive stars, **column-wise** fill via CSS multi-column
  (the original is two side-by-side `<ul>`s).
- `.site-header-inner` / `.site-header-logo` — header 110/140/184px, logo 70/100/170px.
- `.hero-panel` — home hero heights 960/1025/902px.
- `.team-mask` + `public/shapes/team-mask.svg` — the About-us portrait blob, traced from
  the original PNG at 64 radial samples (75.7% coverage vs the original's 75.9%).
- `.heading-hidden` — service banner titles are `visibility:hidden` on the original.

Also fixed: services-listing cards stretch to a common 412px; the footer is white with an
Elementor-style cream shape-divider wave; the home hero panel rides `container-boxed` so
its wave mask never leaves uncovered strips at wide viewports.
