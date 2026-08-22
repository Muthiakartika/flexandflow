@AGENTS.md

# Project state — handoff

Next.js 16 + Tailwind v4 rebuild of **flexandflow.fit** (a WordPress site the owner
controls), a small wellness & recovery studio in Uluwatu, Bali. Product truth lives in
`PRODUCT.md` at the repo root.

Work has run in three phases. Phase 1 (pixel-cloning the WordPress site) is **done**.
Phase 2 (a full UI redesign) is **in progress and unresolved** — read that section before
changing anything. Phase 3 (the booking system) is **built and unverified**: written in
full, never yet run against a database. `BOOKING-PLAN.md` is its spec.

---

## Repository layout — two sites, one app

The studio site and **Flex & Flow Academy** used to be separate Next.js projects on
separate domains. They are now one app so they can share `flexandflow.fit`, joined by
**two root layouts** rather than merged into one:

```
app/
├── (main)/       studio site at /            layout.tsx + globals.css
├── (academy)/    academy at /academy/…       layout.tsx + academy.css
│   └── academy/  its routes, e.g. courses/[slug]/[type]
└── (admin)/      booking admin at /admin/…   layout.tsx + admin.css
    └── admin/    agenda, bookings, schedule, services, settings
```

There is deliberately **no `app/layout.tsx`**. Each route group owns its own `<html>`
and `<body>`, its own header and footer, and its own stylesheet — which is the whole
point: the academy keeps its own design tokens (`--color-olive`, `--spacing-band`,
`--radius-control`) and this site keeps its own (`--color-primary`, `--color-cream`,
`--fs-h1`), and the two can never collide because they never load on the same page.
Both sets define `--color-muted` at different values, so this is load-bearing, not
tidiness. Crossing between `/` and `/academy` is a full page load — the documented
behaviour of multiple root layouts, and what keeps the two stylesheets apart.

Things that follow from this and will bite otherwise:

- **Academy code is namespaced**: `components/academy/*` and `lib/academy.ts`. Its
  design, copy and data are untouched from the standalone app; only paths moved.
- **Tailwind source detection** starts at the directory holding each CSS file, so both
  stylesheets declare what they scan with `@source`. Add a new top-level source folder
  and you must add it there, or its classes will silently not compile.
- **`favicon.ico` only works in the root `app/` segment**, which no group owns.
  Every layout declares `icons` in its metadata instead.
- **The admin group is `noindex, nofollow`** and sits behind `proxy.ts`. In Next 16 the
  `middleware.ts` convention was renamed to `proxy.ts`, exporting `proxy` — that is not
  a style choice and the old filename does nothing.
- Academy routes are typed as `PageProps<"/academy/…">`; the group name is not in the URL.
- `next.config.ts` keeps 308s from the academy's old top-level paths (`/courses/…`,
  `/schedule`, `/materials/…`, `/register/…`) to their `/academy` homes — but only while
  the academy is published; see below.

**The academy is currently unpublished.** `ACADEMY_ENABLED` in `lib/flags.ts` is `false`,
which drops it from `primaryNav`, 307s `/academy/*` to the home page, retires the legacy
aliases above, and marks the group `noindex, nofollow`. Nothing is deleted and everything
still builds; publishing it is that one value going back to `true`. `/academy` has never
been a live URL on this domain, so nothing was withdrawn from the index by doing this.

**`SITE-STRUCTURE.md` is the owner-facing map** of which header and footer belongs to
which site, written because the two-root-layout split is genuinely confusing from the
outside. Keep it current when nav or layout files move.

The two pre-merge projects are gone from disk. Their history is on GitHub — the studio
site at `Muthiakartika/flexandflow`, the academy at `Muthiakartika/flexnflow-academy`
(also pushed to `algosbiz/flex-n-flow-academy`, whose `main` was behind at the time of
the merge). Every branch was in sync with `origin` when they were deleted, so anything
predating this repo is recoverable from there rather than from local history.

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

The only page left on WordPress is the **price list**. Link to it through
`wordpressUrls`, never `next/link`. The **booking flow** was also on WordPress and is
not any more — Phase 3 built it into this app; see below.

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

**There are nine services, and two of them are not on any menu.** `full-body-massage`
was ported on 2026-08-18 — it is a live, indexable page listed in
`dt_service-sitemap.xml`, so leaving it out would have 404'd an indexed URL — and like
`facial-massage` it appears in neither the WordPress services grid nor the nav, only in
the sitemap and in search. Both are therefore absent from the `order` array in
`app/(main)/services/page.tsx` and from `primaryNav`, on purpose. Neither has published
rates, so both carry `tiers: []` and render the aside with no price rows. The body copy
of the full-body page was taken from the live HTML verbatim, stray comma and "Let us to
transform" included; do not tidy it.

**`lib/pricing.ts` now does all of this.** Use it rather than parsing tiers again:
`priceAmount` (digits only), `tierMinutes` (falls back to the service-level label —
pregnancy massage's cheaper tier has no `duration` of its own), `serviceMinutes`,
`ratesFor`, and `lowestHourlyRate` (60-minute sessions at both-tier services only).

---

## Outstanding

- **Owner review of the redesigned site** is the next step. Ask for screenshots rather
  than iterating blind (gotcha 1).
- **Meta re-synced against the live site on 2026-08-18.** All 27 indexable URLs now match
  flexandflow.fit character for character on title, description and robots — including the
  archives' and profiles' `noindex, follow` with no description at all, and the
  `max-image-preview:large, max-snippet:-1, max-video-preview:-1` that Yoast puts on every
  indexable page (dropping those would visibly shrink the search result). `trailingSlash:
  true` was turned on the same day so the served URLs match the indexed ones.
  `SITE-STRUCTURE.md` records the rules; re-verify with the `curl` one-liner there rather
  than by eye.
- **Button contrast — decision still open.** Filled surfaces site-wide now use
  `--color-primary-strong: #6d7932` (**4.76:1** with white at 15px) instead of
  `--color-primary` `#7f8c3a` (**3.67:1**, fails AA). The brand colour is untouched and
  still owns every accent; reverting is one line in `app/globals.css`.
- **No social proof.** Both reference sites lead on star ratings and named reviews; this
  site has none. Owner needs to supply a real Google rating and quotes. Do not invent them.
- **`ContactForm` and `NewsletterForm` still post nowhere** — they acknowledge locally,
  per the brief. The booking form is the exception and is fully wired; see Phase 3.
- Focus states and motion are done everywhere: `FOCUS` / `FOCUS_ON_OLIVE` in
  `components/ui/tokens.ts`, and one ticker as the only authored animation.

---

## Phase 3 — the booking system (built, never run)

The booking flow used to be a WordPress page at `flexandflow.fit/appointment/` — a
BookingPress install nobody here controlled. It now runs in this app. **`BOOKING-PLAN.md`
is the spec and the reasoning; read it before changing any of this.**

Five steps, in the order the old system used: **staff → service → date & time → basic
details → summary**. Confirmations go out by email (SendGrid) and WhatsApp (the studio's
own WAHA server), and the confirmation carries a `.ics` so the appointment lands in the
customer's phone calendar.

**Status: written in full, never executed.** There is no database yet, so nothing here
has been run — not the seed, not a query, not a message. The owner is testing it
themselves. Treat every part of it as unverified.

### What was added

| Area | Where |
|---|---|
| Data model | `prisma/schema.prisma`, migrations under `prisma/migrations/` |
| Seed & catalogue | `prisma/seed.ts`, `lib/booking/catalogue.ts` |
| Availability | `lib/booking/availability.ts` (pure), `lib/booking/slots.ts` (queries) |
| Writes & state | `lib/booking/create.ts`, `lib/booking/transitions.ts`, `lib/booking/guard.ts` |
| API | `app/api/booking/**`, `app/api/cron/**` |
| Wizard | `components/booking/**`, `app/(main)/booking/page.tsx` |
| After booking | `app/(main)/booking/confirmation/…`, `app/(main)/booking/manage/…` |
| Notifications | `lib/notifications/**` |
| Calendar | `lib/calendar/ics.ts`, `lib/calendar/links.ts` |
| Admin | `app/(admin)/**`, `lib/admin/**`, `proxy.ts` |

### Things that will bite

1. **`Booking.endAt` includes the clean-down buffer; `BookingSummary.endAt` does not.**
   The database column is what the no-overlap constraint compares, so it has to cover
   the turnover. The customer-facing end is `startAt + durationMinutes`. Confusing the
   two either double-books the room or tells someone their massage runs fifteen minutes
   longer than it does.

2. **Double-booking is prevented by Postgres, not by application code.** The
   `booking_no_overlap` exclusion constraint in
   `prisma/migrations/*_booking_no_overlap/migration.sql` is hand-written — Prisma cannot
   express it — and it needs the `btree_gist` extension. Regenerating migrations without
   carrying it forward silently removes the only real protection. `isSlotTakenError()` in
   `lib/db.ts` turns the resulting `23P01` into a friendly message; that error is an
   expected outcome, not a fault.

3. **The studio is UTC+8 and the server is UTC.** Every human-facing time goes through
   `lib/booking/time.ts`. A bare `new Date().getHours()` anywhere in booking code is
   eight hours wrong and looks correct in local testing.

4. **Prices now exist in two places.** The marketing pages derive theirs from
   `lib/data/services.ts` through `lib/pricing.ts`; the wizard charges what is in the
   `ServiceVariant` table. `npm run check:prices` compares them and fails on any
   disagreement — this repo has published a wrong price three times, and that script is
   the fourth-time guard. The seed also adds two 90-minute variants that the marketing
   data has no row for (sports massage, lymphatic drainage), taken from the old booking
   UI's screenshots rather than from the price list. **The owner has not verified them.**

5. **Notifications never block a booking.** The booking commits, then jobs are queued in
   `NotificationJob` and sent from `after()` and the cron retry. This is not
   over-engineering: a WAHA session that has quietly logged out is the most likely
   failure mode in the whole system, and it must not be able to fail a customer's
   booking. The unique index on `(bookingId, channel, kind, target)` is what makes retry
   idempotent.

6. **Next 16 renamed `middleware.ts` to `proxy.ts`.** The admin guard is `proxy.ts` at
   the repo root, exporting `proxy`. A file called `middleware.ts` would do nothing at
   all.

7. **Prisma 7 has no Rust query engine.** The datasource URL is in `prisma.config.ts`,
   not `schema.prisma`; the client is generated into `generated/prisma/` (gitignored,
   so `prisma generate` runs as part of `npm run build`); and the connection goes through
   the Neon driver adapter in `lib/db.ts`.

### Before it can go live

- **SendGrid domain authentication for `flexandflow.fit`** (three CNAMEs). The from
  address must not be the studio's Gmail — sending as `@gmail.com` through SendGrid fails
  DMARC and lands in spam. Gmail belongs in `SENDGRID_REPLY_TO`. DNS is slow; do this first.
- **WAHA details from the owner**: base URL (public, HTTPS), API key, session name, and
  which number receives admin notifications.
- **A Neon database**, then `prisma migrate deploy` and `prisma db seed`.
- **The owner verifies every price and duration** against the real price list. See point 4.
- **Cron.** Vercel's Hobby plan allows one job a day, which is not enough for the
  ten-minute retry loop. `CRON.md` gives both options — Pro, or a `curl` cron on the box
  already running WAHA.
- `.env.example` lists every variable; `lib/env.ts` validates them and names the missing one.

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
