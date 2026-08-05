# Design system — Flex & Flow (2026 redesign)

The brand is pinned and is not up for redesign: olive `#7f8c3a`, cream `#f0efeb`,
black, Amatic SC over Andika, the existing logo and photography, and the studio's own
copy word for word. What follows is everything the redesign *does* own — measure,
scale, surface, motion — so the next change to the site can be made without
re-deriving it.

It applies to **every page**. The only pages still on WordPress are the price list and
the appointment/booking flow, which were never cloned; link to them through
`wordpressUrls`, never through `next/link`.

## Calibration

Scale is set against **stretchr.com**, an assisted-stretching studio, because that is
the actual peer. Its largest type is ~61px and its ground stays light.
**powerandrevive.studio** is a gym: Anton at 118px, black-dominant. Following the gym
produced a page the owner rejected as *"terlalu besar … kurang bagus untuk website
assisted stretching."* Calibrate to Stretchr.

| | Value | Where |
|---|---|---|
| Measure | 1240px, 24px gutter (20px ≤640px) | `.page-wrap` |
| Band step | `clamp(2.75rem, 4.4vw, 4.25rem)` | `.page-band` |
| Band divider | 1px hairline at 10% black | `.page-band-line` |
| Corner | 10px everywhere; full round only on pills | `--radius-1x` |
| Home h1 | 34px → 56px | `Hero` |
| Inner-page h1 | 32px → 48px | `H1` |
| h2 | 28px → 44px | `H2` |
| Body | 15–17px, 1.7 leading | |
| Article body | 15px, 1.75 leading, 68ch measure | `.prose-flex` |
| Label | 11px, 0.18em tracking, uppercase, 58% black | `.page-label` |

Header, every page body and the footer all use `.page-wrap`, so nothing sits off the
page's line. The theme's 1810px Elementor container is gone.

## Surfaces

Cream is the ground. **White cards are the only container** — 10px corners, a 10%
black hairline border, no shadow. Depth comes from overlap (the hero's practitioner
strip, the private-therapy inset photo, the olive offset behind the wellness photo),
never from drop shadows.

One saturated region per page, at the end: `sections/common/BookClose`. Olive as an
accent everywhere else — clover bullets, the location dot, hover states, the focus
ring.

Inner pages open with `PageHero`: breadcrumb, title, optional eyebrow, lead and
actions, on the cream ground. The theme's 74px title over a washed stock yoga photo —
the same photo on every page — is gone.

## The olive that carries white text

`--color-primary` stays `#7f8c3a`. White text on it is **3.67:1** and fails AA, so
filled surfaces use `--color-primary-strong: #6d7932` — the same olive one step down,
**4.76:1**. It is used for solid buttons, the header CTA, the closing band and the
article callout. Reverting is a one-line change in `app/globals.css`; the brand colour
itself was never touched.

The focus ring is 2px olive at 2px offset (`FOCUS` in `components/ui/tokens.ts`),
3.20:1 against cream — above the 3:1 UI-component floor. On the olive band it flips to
white (`FOCUS_ON_OLIVE`). Every interactive element on the site carries one, including
the form fields, which previously set `outline-none` with no replacement.

## Motion

**One authored moment: the treatment ticker** on the home page (`.marquee-track`, 42s,
disabled under `prefers-reduced-motion`). Everything else is a 300ms colour or
transform response to hover.

Nothing ships at `opacity: 0`. The previous build applied one identical 900ms fade-up
to ~23 elements per page through an IntersectionObserver, which meant the server HTML
rendered invisible and the page stayed blank whenever the observer did not fire.
`Reveal.tsx` has been deleted.

## Prices are derived, never written

Every figure on the site goes through `lib/pricing.ts`. The source rows are not
uniform and have produced false public prices three separate times:

- some `price` strings carry an `Rp` prefix, some do not — `priceAmount()` strips to digits;
- sessions are not all 60 minutes — cupping is 30, trauma healing 90, pregnancy 90;
- not every service has both tiers — cupping and trauma healing are Master-only;
- pregnancy massage's cheaper tier has **no** `duration` at all — `tierMinutes()` falls back to the service-level label.

`lowestHourlyRate()`, which sets the home hero's "From" tile, is restricted to
60-minute sessions at services offering **both** tiers. A global minimum pulls in the
30-minute cupping session and advertises an hour at a price nobody can book, and can
invert the tier hierarchy so Master reads cheaper than Therapist.

Rates now appear wherever a treatment does: the home grid, the `/services` cards, and
a sticky aside on each service page — that page previously named no price at all.

## Copy rule

Headings and body copy are the studio's own, verbatim. The redesign moves structure,
not words. Where a new band needed a heading it borrowed one the studio already uses
elsewhere — "Our Team / Meet My Team" comes from the About page. The gallery has an
`sr-only` heading rather than an invented one. The closing band uses the site's own
description. The two category archives dropped WordPress's "Category:" prefix from the
visible `h1` into an eyebrow; their `<title>` tags are unchanged.

**No testimonials, ratings or star counts exist yet; do not invent any.**

## Page structure

| Page | Shape |
|---|---|
| `/` | Hero · ticker · treatments · private therapy · complete wellness · team · gallery · FAQs + visit card · closing band |
| `/services` | Hero with WhatsApp action · 3-col priced cards, both tiers on every card |
| `/about-us` | Hero · specialising-in split with studio facts · private therapy · team cards + scene photos · closing band |
| `/contact-us` | Hero · form card beside the studio's details card · map |
| `/uluwatu-bali/[service]` | Hero · article + sticky rates aside · other treatments |
| `/therapist/[slug]` | Hero with a WhatsApp link that names them · portraits, bio, approach + sticky specialisms/hours card |
| `/blog`, archives | Hero · uniform cards in a grid · sidebar (search, categories, book) |
| `/[category]/[post]` | Hero with date and category · article · prev/next cards · sidebar |

On phones the two sticky asides come **first** — on a service page the rates otherwise
landed below a 4,500px article, which is where nobody looks for a price.

## Responsive rules that bite

Tailwind **arbitrary** breakpoint variants (`max-[1280px]:hidden`,
`min-[1281px]:order-none`) have silently failed in this project even when
`matchMedia` reports a match, and competing `max-[...]` rules lose to each other by
emit order. Standard `sm:` / `lg:` variants are fine. Anything responsive that matters
— `.page-wrap`, `.page-band`, `.mosaic`, `.icon-list` — is written as an explicit
`@media` block in `app/globals.css`.

Verified at 390 / 768 / 1280px across every route: no horizontal overflow, no element
shipping at `opacity: 0`, header/body/footer gutters aligned, and the production build
generating all 32 pages.

## Still open

- **Social proof.** Both reference sites lead on ratings and named reviews. This site
  has none. Needs a real Google rating and quotes from the owner.
- **Forms have no backend.** The contact form and the newsletter both acknowledge
  locally and post nowhere, as the brief specified.
- `/preview/a`–`/preview/d` remain as history, on the old classes, `noindex`.
