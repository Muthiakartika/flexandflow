@AGENTS.md

# Project state — handoff

Next.js 16 + Tailwind v4 rebuild of **flexandflow.fit**, a small wellness & recovery
studio in Uluwatu, Bali. Product truth lives in `PRODUCT.md` at the repo root.

**This app now serves the domain.** Checked 2026-08-31: `/`, `/services/`,
`/price-list/`, `/about-us/`, `/blog/` and a service page all return Next markup with
no `elementor` or `wp-content` in it. The WordPress original survives in git history
and in the old Hostinger staging host, not at `flexandflow.fit`.

**So "re-sync against the live site" is now circular.** Fetching a page from the domain
returns this repo's own output, not a source to check it against. Two notes below were
written while that comparison still meant something and say so by date; treat them as
history, not as a method to repeat.

Work has run in six phases. Phase 1 (pixel-cloning the WordPress site) is **done**.
Phase 2 (a full UI redesign) is **in progress and unresolved** — read that section before
changing anything. Phase 3 (the booking system) is **built and verified against a live
Neon database, SendGrid and WAHA**; `BOOKING-PLAN.md` is its spec. Phase 4 (online
payment through Xendit) is **built and unverifiable**: the studio has no Xendit account
yet, so not one line of it has ever run. `PAYMENT-PLAN.md` is its spec. Phase 5 (a CMS
so the owner can edit treatment pages and blog posts) is **in progress** — the editor has
never been driven by a human yet; `CMS-PLAN.md` is its spec. Phase 6 (a native client
intake & consent form, replacing an external JotForm) is **in progress** — built, verified
end to end for a real submission, with one admin sub-feature (a custom-field builder) not
yet fully click-tested; `INTAKE-PLAN.md` is its spec.

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

**Nothing is left on WordPress.** The **booking flow** moved into this app in
Phase 3 — see below. The **price list** followed on 2026-08-24: it's now
`/price-list`, an ordinary internal route like any other, backed by
`lib/data/priceList.ts` — a separate file from `lib/data/services.ts` because
its per-therapist rates (and two treatments, Combo Stretching and Massage and
Traditional Javanese Massage, that have no service page at all) don't fit
that shape, and because keeping it separate keeps it out of
`npm run check:prices`, which would otherwise fail on rows it has no
`ServiceVariant` to compare against.

Verified at 390 / 768 / 1280px across every route: no horizontal overflow, nothing
shipping at `opacity: 0`, header/body/footer gutters aligned, build generating all 32
pages.

Removed with the pages that used them, and recoverable from git history: `Reveal.tsx`
(the fade-up that shipped content invisible), `SectionHeading.tsx`, `Container.tsx`,
`ArchivePostCard.tsx`, `TreatmentCard.tsx`, `lib/masonry.ts`, `sections/home/Session.tsx`
and `Tiers.tsx` (both carried headings written for them rather than the studio's own
copy), and the theme's layout CSS — the 1810px container, the 74px photo title band,
`--band-gap`, `.service-copy`, `.hero-panel`, and the decorative PNG masks.

The four preview routes were **deleted on 2026-09-01** (CMS-PLAN.md §10.4). All
four had been rejected — `a` "Quiet", `b` "Warm" and `c` "Clear" as "too
simple", `d` "Studio" superseded by the live `/` it became — and all four were
still on Phase 1 classes. They are in git history if a direction needs revisiting.

**Header and footer** apply to every page: 76px sticky header
(`components/layout/Header.tsx`, uppercase tracked nav) and a deliberately small
**white** footer (`components/layout/Footer.tsx`). A black footer was tried and
rejected. Both now sit on `.page-wrap`, so they share the page body's 1440px measure.

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
   anything responsive that matters into `app/(main)/globals.css` as explicit `@media`
   blocks — that is why `.hero-gap-top`, `.service-container`, `.service-copy`,
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

**Re-synced against the live WordPress site on 2026-08-04**, while the domain still
served it. Seven of the eight service pages matched. Two did not: **sport massage**
and **lymphatic drainage** carried long-form bodies (deep-tissue comparison, aftercare
sections, ten-item FAQs) that flexandflow.fit no longer served — the live pages were
the older, shorter versions. Both bodies were replaced with what the site published
then, so **the removed copy is in git history, not a bug**; do not restore it without
asking the owner. The same pass fixed three body links still pointing at the
`green-hare-976010.hostingersite.com` staging host, and reordered the home grid to the
live sequence (men's detox, trauma, stretching, sport, cupping, drainage).

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

## Editing body copy

Page bodies are `ContentBlock[]` in `lib/data/posts.ts` (blog) and
`lib/data/services.ts` (treatments) — not HTML. `components/content/RichText.tsx`
renders them, and `renderInline` understands exactly three inline markers:
`[text](url)`, `**bold**`, `*italic*`.

- **Raw `<a href="…">` does not work.** Nothing parses it, so it would print as literal
  text — and inside a double-quoted TS string its own quotes close the string, so the
  file stops compiling before it ever renders. This has already cost a debugging round.
- **A link is internal only if it starts exactly `https://flexandflow.fit`.** That
  prefix is stripped and the link becomes a `next/link`. Anything else renders as
  `<a target="_blank" rel="noopener noreferrer">`. `flexandflow.id` 301s to `.fit`, so
  copy written with it looks correct in a browser but ships as an external new-tab link
  through a redirect — normalise the domain when copy arrives that way. `/appointment/`
  is a deliberate exception and stays external.
- **Inline markers only run on `paragraph`, `list`, `columns` and `faq` text.**
  `heading` and `callout` render their text raw, so a link in either is dead markup.
- **Blog post URLs come from the `category` field, not from a folder**: `"uluwatu-bali"`
  → `/uluwatu-bali/<slug>/`, `"injury-guide"` → `/injury-guide/<slug>/`. Service pages
  share the `/uluwatu-bali/` prefix; `lib/content.ts` resolves which collection a slug
  belongs to.
- **`seo` is a separate object from `title`.** Changing a heading without changing
  `seo.title` leaves the old title in search results.
- The copy uses typographic apostrophes (`’`) throughout. Google Docs exports straight
  ones, so converting them back is part of pasting copy in.

When copy arrives as a Google Doc, `export?format=txt` gives the prose and
`export?format=html` is the only way to see which words carry which `href` — the text
export drops links silently. Add `&tab=<tab-id>` for a doc whose URL names a tab.
Diffing that export against the strings already in the data file is what tells you
which paragraphs actually changed; four docs in a row differed by two sentences each,
and eyeballing them would have missed it.

---

## Image optimization & caching — read `IMAGE-QUOTA.md`

**The Vercel image optimizer is switched off** (`images.unoptimized: true`,
2026-09-02). The quota ran out mid-month and `/_next/image` was answering `402`
for 158 of the site's 191 variants, so most photographs were broken on the live
site. Turning it back on is deleting that one line — but read the box at the top
of `IMAGE-QUOTA.md` first, because re-running `npm run images:optimize` changes
every source file's content hash and invalidates the whole variant cache at
once, which is part of how the quota was exhausted in the first place.

Applied 2026-09-02. `images` in `next.config.ts` was on Next's defaults, which is
where the Vercel quota exposure was; it now pins `minimumCacheTTL` to 31 days (the
default 4 hours re-bills a variant ~180 times a month), caps `deviceSizes` at 1920,
and trims `imageSizes`. `vercel.json` pins functions to `sin1` — Neon is on
`ap-southeast-1` and the Vercel default is Washington DC. Three things follow that
will bite otherwise:

1. **`npm run images:optimize` never changes a file extension**, and the WebP
   conversion the runbook describes is deliberately not done. Every path under
   `public/images` and `public/photos` is stored in Postgres — 68 `MediaAsset` rows
   plus the `ContentRevision` blocks of published articles — so a rename takes the
   photography off live pages. It was measured before being rejected: WebP reaches
   8.36 MB against the 8.49 MB in-place re-encode already achieved. Always follow
   with **`npm run images:sync`**, which repairs the `checksum` / `bytes` /
   `width` / `height` the rewrite invalidated.

2. **`sharp` is pinned to `0.34.5`, not `^0.35.4`** — the exact version Next 16.2.12
   bundles. With two versions installed, npm hoists a `@img/sharp-win32-x64` that
   Next's own copy then loads, every transform throws inside the server, and Next's
   `catch` **silently serves the unoptimized original**. No HTTP error, no log the
   app writes; the only symptom is `/_next/image` returning the source byte count and
   never `Content-Type: image/webp`. Both copies work fine when required from a plain
   Node script, which is what makes it slow to find. Re-run `IMAGE-QUOTA.md` §6 after
   any `sharp` or `next` upgrade.

3. **The Cloudflare half is not done** and is dashboard work on the studio's account.
   It matters more than it sounds: this site serves a 28.9 kB WebP to a modern
   `Accept` header and a 41.5 kB JPEG to `*/*`, and Cloudflare honours only
   `Vary: Accept-Encoding` — so whichever a crawler asks for first is served to
   everybody. `IMAGE-QUOTA.md` §5 has the two rules and their required order.

`/blog` was the one marketing page still rendering per request; its `?s=` filter
moved to the client behind `<Suspense>` and it is `○ (Static)` now. The URL and the
search box are unchanged.

## Outstanding

- **Owner review of the redesigned site** is the next step. Ask for screenshots rather
  than iterating blind (gotcha 1).
- **The 70 rewritten photographs have not been looked at by a human.** They were
  re-encoded at mozjpeg 80 and capped at 1920px wide; aspect ratios are unchanged and
  every page was checked for broken images numerically, but nobody has compared a
  before and after by eye. Ask the owner (gotcha 1).
- **Meta re-synced against the live WordPress site on 2026-08-18**, while the domain
  still served it. All 27 indexable URLs then matched flexandflow.fit character for
  character on title, description and robots — including the archives' and profiles'
  `noindex, follow` with no description at all, and the
  `max-image-preview:large, max-snippet:-1, max-video-preview:-1` that Yoast puts on every
  indexable page (dropping those would visibly shrink the search result). `trailingSlash:
  true` was turned on the same day so the served URLs match the indexed ones.
  `SITE-STRUCTURE.md` records the rules. Its `curl` one-liner now reads this app back to
  itself, so it still catches a regression you introduce — it no longer confirms parity
  with what Google indexed. For that, compare against Search Console or git history.
- **Article measure removed on 2026-08-31.** `.prose-flex :where(p)` carried
  `max-width: 68ch`, which stopped paragraphs ~300px short of the featured image, the
  headings and the lists in the same column; the owner read that as a broken layout
  rather than as a measure. Paragraphs now fill the article column — 899px beside the
  blog sidebar, 859px beside the service one, ≈102ch at 15px. That is past the
  comfortable reading range, so if long articles start to feel heavy, `85ch` (≈750px)
  is the middle ground. One line in `app/(main)/globals.css`.
- **Button contrast — decision still open.** Filled surfaces site-wide now use
  `--color-primary-strong: #6d7932` (**4.76:1** with white at 15px) instead of
  `--color-primary` `#7f8c3a` (**3.67:1**, fails AA). The brand colour is untouched and
  still owns every accent; reverting is one line in `app/(main)/globals.css`.
- **No social proof.** Both reference sites lead on star ratings and named reviews; this
  site has none. Owner needs to supply a real Google rating and quotes. Do not invent them.
- **`ContactForm` and `NewsletterForm` still post nowhere** — they acknowledge locally,
  per the brief. The booking form is the exception and is fully wired; see Phase 3.
- Focus states and motion are done everywhere: `FOCUS` / `FOCUS_ON_OLIVE` in
  `components/ui/tokens.ts`, and one ticker as the only authored animation.

---

## Phase 3 — the booking system (built and verified)

The booking flow used to be a WordPress page at `flexandflow.fit/appointment/` — a
BookingPress install nobody here controlled. It now runs in this app. **`BOOKING-PLAN.md`
is the spec and the reasoning; read it before changing any of this.**

Five steps, in the order the old system used: **staff → service → date & time → basic
details → summary**. Confirmations go out by email (SendGrid) and WhatsApp (the studio's
own WAHA server), and the confirmation carries a `.ics` so the appointment lands in the
customer's phone calendar.

**Status: verified end to end against real services.** Migrations applied to a Neon
database, seed run, a booking made through the wizard in a browser, and 36 notifications
delivered through SendGrid and the studio's WAHA server with none failing. The
`booking_no_overlap` constraint was tested directly in SQL: an overlapping insert is
refused with `23P01`, a non-overlapping one is accepted. Reschedule, the 12-hour
cancellation cutoff, the `.ics` (including `METHOD:CANCEL`), token forgery returning 404,
and the admin panel were all exercised.

The one thing that could not be checked from here is whether the emails land in an inbox
or in spam — that needs someone to look at the mailbox.

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
- **Cron.** Runs on GitHub Actions (`.github/workflows/booking-cron.yml`), not Vercel —
  Vercel's Hobby plan allows one job a day, which is not enough for a retry loop. Needs
  `CRON_SECRET` as an Actions secret. `CRON.md` explains the interval, what breaks
  without a scheduler, and the alternatives.
- `.env.example` lists every variable; `lib/env.ts` validates them and names the missing one.

---

## Phase 4 — online payment (built, never run)

Xendit, chosen over PayPal because **IDR is not a PayPal transaction currency** — the
published Rp prices would have had to be charged in USD at a rate that drifts. Local
gateways process international Visa/Mastercard in IDR anyway, so PayPal bought nothing.
**`PAYMENT-PLAN.md` is the spec and the reasoning; read it before changing any of this.**

The customer chooses **pay at the studio** or **pay now** on the summary step. Paying
now opens a charge and collects it in a modal over the wizard rather than on a hosted
page — QRIS and virtual account are rendered by our own UI; cards go to Xendit's, because
3-D Secure belongs to the issuing bank and cannot be drawn by us.

**Status: written in full, never executed.** The studio has no Xendit account yet, so
there are no credentials and nothing here has ever made a request. The database
migrations *have* been applied. Treat every code path as unverified.

### Things that will bite

1. **Xendit does not sign its callbacks.** It sends the dashboard's Callback Verification
   Token in the `x-callback-token` header, and matching it is the only evidence a request
   came from Xendit. That is a bearer secret, not a signature — compare it in constant
   time, never log request headers, and **re-fetch the charge over the API before
   believing anything in the body**. Copying Midtrans's SHA512 thinking here leaves a
   hole. See `PAYMENT-PLAN.md` §5.

2. **The confirmation must not be sent until the money arrives.** `POST /api/booking`
   queues notifications for `AT_STUDIO` only. On the online path the payment callback
   queues them, after settlement. Moving that call back to the route would email people
   confirmations for bookings they never paid for.

3. **`AWAITING_PAYMENT` holds its slot.** It sits alongside `PENDING` and `CONFIRMED` in
   the `booking_no_overlap` constraint, which is why nobody can take a time out from
   under someone at the payment screen. The migration that added the enum value and the
   one that uses it are **deliberately separate**: Postgres refuses to use a value added
   by `ALTER TYPE … ADD VALUE` inside the same transaction, and Prisma runs each
   migration in one.

4. **The charge expires before the hold does.** `XENDIT_INVOICE_MINUTES` (13) is under
   the 15-minute hold on purpose. Reverse them and somebody can pay for a slot that has
   already been released — money in, no booking, manual refund.

5. **Payments fail closed.** `paymentsEnabled()` is true only when both
   `XENDIT_SECRET_KEY` and `XENDIT_CALLBACK_TOKEN` are set. With either missing the
   wizard offers only "pay at the studio" and the callback route 404s, so a
   half-configured deployment cannot take money it is unable to confirm.

6. **Most Indonesian rails have no refund API.** QRIS and virtual account refunds are a
   bank transfer somebody makes by hand. The admin panel records refunds; it does not
   move money, and its copy says so. Anyone who assumes otherwise will believe a customer
   has been repaid when they have not.

7. **The cheap rails are listed first on purpose.** `PAYMENT_CHANNELS` in
   `lib/payments/types.ts` is ordered QRIS → virtual account → e-wallet → card, and that
   is a cost decision, not an aesthetic one: a virtual account keeps roughly six times
   more of a Rp750,000 booking than a card does. Do not re-sort it.

### Before it can go live

- **A Xendit account**, verified. Needs company documents, NPWP and a business bank
  account; it takes weeks. Ask Xendit whether a sole trader can onboard or a PT is
  required — that decides what the client has to prepare.
- **Four things from the Xendit dashboard**, only two of which are environment
  variables: the API secret key, the Callback Verification Token, the callback URL
  (`/api/payments/xendit/` — **with** the trailing slash, or `trailingSlash: true`
  answers 308 and a webhook sender that does not follow redirects on POST never
  arrives) registered against **every** payment event the studio accepts, and the payment methods themselves switched on. A callback row left blank
  means those payments are collected and never confirmed — the money arrives and the
  booking stays unpaid. `PAYMENT-PLAN.md` §9 has the checklist.
- **Two decisions from the owner that block the work being finished**: full payment or
  deposit, and the refund policy. Neither is a technical question and both must appear on
  the summary step before anyone presses pay.
- Every `TODO(xendit):` in `lib/payments/` confirmed against the current API docs. They
  mark the places where the exact endpoint or field name was written from expectation
  rather than from a tested call.

---

## Phase 5 — the CMS (in progress)

The owner wants to edit treatment pages and blog posts without opening the
source code. **`CMS-PLAN.md` is the audit, the plan and the settled decisions;
read it before touching any of this.** Its §1.3 is the finding the whole design
rests on: `ContentBlock[]` is *already* a block model, so the CMS stores that
same union as JSON and `components/content/RichText.tsx` stays the only
renderer. Nothing about how a page draws changes.

Phases 3–8 are listed in `CMS-PLAN.md` §9. **Phases 3–7 are built.** Phase 8
(the owner's own walk-through) has not happened — see "What has not been
checked" below.

### The layout

| Area | Where |
|---|---|
| Schema | `ContentDoc`, `ContentRevision`, `MediaAsset` in `prisma/schema.prisma` |
| Block format | `types/index.ts` (`ContentBlock`), validated by `lib/cms/blocks.ts` |
| Public reads | `lib/cms/read.ts` (cached, draft-aware) over `lib/cms/query.ts` |
| Categories | `lib/cms/categories.ts` (rules), `category-store.ts`, `category-actions.ts` |
| Row → domain | `lib/cms/shape.ts` — used by the site *and* by the import check |
| Writes | `lib/cms/write.ts`, actions in `lib/cms/actions.ts` |
| Panel reads | `lib/cms/admin.ts` |
| Marker ↔ HTML | `lib/cms/inline.ts` |
| Media | `lib/cms/media.ts`, `lib/cms/storage.ts`, `app/api/cms/media/` |
| Preview | `app/api/cms/preview/`, `components/cms/PreviewBanner.tsx` |
| Editor | `components/cms/**` |
| Panel routes | `app/(admin)/admin/{treatments,blog}/**` |
| Public routes | `app/(main)/[category]/` and `[category]/[slug]/` |

### The routing, which changed

`app/(main)/uluwatu-bali/` and `app/(main)/injury-guide/` **no longer exist**.
Categories are rows in `ContentCategory`, so the studio can add one without a
deploy — and a route folder per category cannot do that. Both are served by
`app/(main)/[category]/` and `app/(main)/[category]/[slug]/` now.

That is a dynamic segment at the root of the site, so:

- **Static segments win.** `/services`, `/blog`, `/about-us`, `/price-list`,
  `/contact-us`, `/therapist`, `/academy`, `/admin` and `/api` keep their own
  folders and are never reachable through `[category]`. `npm run check:category`
  walks every one of them and would catch it if that ever stopped being true.
- **A category may not take one of those names.** `RESERVED_SLUGS` in
  `lib/cms/categories.ts` refuses it — the category would not break the page,
  it would be shadowed by it, and every post in it would 404 with nothing on
  screen to explain why. Add a top-level route and add it to that list.
- **An unknown category must 404**, not render an empty archive. A soft 404 on
  every mistyped URL on the domain is the failure that would otherwise creep in.
- **`uluwatu-bali` is `locked`.** Every treatment page is served from it, and
  `lib/cms/read.ts` looks services up under that literal string — renaming it
  would not move the nine treatment pages, it would delete them. Its label can
  still change; its slug cannot.
- **Renaming a category moves its documents in the same transaction**, and
  rewrites the `canonicalPath` on their revisions. A canonical tag left
  pointing at the old address tells Google to index a URL that now 404s.

The two archives' WordPress-matched metadata moved onto the rows and was seeded
**by the migration**, not by `prisma/seed.ts` — between a migration and a
separate seed step, `/uluwatu-bali/` would 404, and that is where every
treatment lives.

### Things that will bite

1. **Never call `lib/cms/read.ts`'s `list*`/`get*` from `generateStaticParams`.**
   They read `draftMode()`, and Next fails the build outright with "used
   `draftMode()` inside `generateStaticParams`" — that hook runs at build time
   with no request. Use `publishedParams`, which deliberately does not. This
   has already broken one build.

2. **`lib/data/services.ts` and `lib/data/posts.ts` are no longer read by the
   site.** They stay in git as the record of what WordPress published, as the
   input to `prisma/seed.ts`, and as the independent thing
   `npm run check:site` compares the live pages against. Editing them changes
   nothing.

3. **`npm run check:prices` now reads the CMS**, not that file. It had to: the
   owner can edit marketing rates from the panel (CMS-PLAN.md §10.2), so a
   check still pointed at the file would pass while the live page advertised
   something else.

4. **Two orderings, both real.** `sortOrder` is the reading order (sitemap,
   "other treatments", blog listing); `gridOrder` is the different order
   `/services` and `/price-list` use. Collapsing them reshuffles one page. A
   null `gridOrder` means "not on the priced grid", which is how
   `full-body-massage` and `facial-massage` stay live but off every menu.

5. **`lib/cms/write.ts` uses `updateTag`, not `revalidateTag`.**
   `revalidateTag(tag, "max")` serves the *stale* page to the next visitor, so
   the owner publishes, opens the page, sees the old text and concludes it
   failed. `updateTag` expires immediately — but may only be called from a
   Server Action. Everything there is reached through `lib/cms/actions.ts`; a
   route handler or cron job calling it would throw.

6. **The inline format cannot nest bold and italic.** `***text***` matches
   neither of `renderInline`'s patterns and would reach the page as literal
   asterisks, so the editor makes the two mutually exclusive. `heading` and
   `callout` render raw, so their mark controls are hidden entirely.

7. **`npm run check:inline` is the guard on all of that.** It round-trips every
   paragraph, list item, column and FAQ answer in the real content — 818
   strings — through `markersToHtml` and back. Without it, opening a published
   article and pressing save could rewrite an apostrophe or drop an href on a
   live page and nobody would notice for weeks.

8. **Moving a published page needs `content.publish`**, because it throws away
   an indexed URL. That covers both halves of the address: the slug *and* the
   category, since a post's `urlPrefix` is its category and changing it moves
   the page just as surely. Nothing redirects automatically — the editor warns
   with both addresses spelled out. Deleting a published page is refused
   outright; unpublish first. All of it is enforced in the action, not the UI.

   A treatment's prefix is **fixed at `uluwatu-bali`** and the editor shows it
   as static text: `lib/cms/read.ts` looks treatments up there and nowhere
   else, so one on another prefix would exist in the database and 404 on the
   site. `saveContent` pins it regardless of what is posted.

   `npm run check:move` covers the risky direction — a post moved *into*
   `uluwatu-bali` lands in the treatments' namespace, where `resolveUluwatuSlug`
   resolves services first. It runs on a throwaway draft, never publishes, and
   also proves the unique index refuses a move onto a treatment's address.

9. **Restart the dev server after `prisma generate`.** `lib/db.ts` caches the
   client on `globalThis` so hot reloads do not exhaust Postgres connections —
   which also means a running server keeps the *old* client forever. A schema
   change shows up as `Cannot read properties of undefined (reading
   'findMany')` or `Value 'X' not found in enum`, neither of which points at
   the cause. This has cost time twice.

10. **Uploads go to object storage, never `public/`.** `public/` is baked into
   the build, so an upload written there on a deployed server vanishes at the
   next deploy. The local-disk driver is for development only; production needs
   the `MEDIA_S3_*` variables in `.env.example`.

### What has not been checked

The editor has **never been driven by a human**. Everything below it is
verified — the schema, the import, the read layer, the round trip, the
permission gates, the build — but nobody has opened `/admin/treatments/`,
edited a block and pressed publish. Ask the owner to do exactly that before
trusting it.

Also unverified: the S3 driver in `lib/cms/storage.ts` has never run. The
studio has no bucket yet, so every upload so far has gone to local disk.

### What Phase 3 changed (roles — this affects code that predates the CMS)

`AdminUser` gained `role` (`SUPER_ADMIN` | `EDITOR`), `extraPermissions`,
`deletedAt` and `updatedAt`. Things that follow, and will bite otherwise:

1. **"Signed in" is no longer enough anywhere.** Every page in `(admin)` now
   calls `requirePermission(...)` and every action in `lib/admin/actions.ts`
   goes through `actingAdmin(permission)` instead of `currentAdmin()`. An
   editor with no `booking.manage` must not be able to cancel an appointment by
   posting to an action whose form they were never shown. A new admin page or
   action that only calls `requireAdmin()` is a hole.

   **A denied page answers HTTP 200, not 307.** Every admin page has a
   `loading.tsx`, so Next streams the skeleton before `requirePermission` runs;
   once bytes are on the wire the status line cannot change, and the redirect
   is delivered inside the stream as
   `<meta id="__next-page-redirect" http-equiv="refresh">`. No data leaks — the
   body is skeleton and redirect only — but any test that reads the status code
   alone will report every refusal as a success. `check-access.ts` looks for
   that marker and scans the body for leaks; a first draft of it that trusted
   the status reported the content editor as having the customer list.

2. **Nothing branches on the role — everything branches on `can()`.** That
   indirection is what makes a third role one entry in `ROLE_PERMISSIONS`
   (`lib/admin/permissions.ts`) with no call sites to change. Keep it that way.

3. **`lib/admin/permissions.ts` is deliberately not `server-only`.** `AdminNav`
   is a client component and filters its links with the same `hasPermission`
   the server guards use, so the nav and the guards cannot disagree. It holds
   no secrets and reaches nothing. The client check decides what is *drawn*;
   a hidden link is not authorisation.

4. **The migration backfills `SUPER_ADMIN` explicitly.** `EDITOR` is the right
   default for new accounts and the wrong one for the rows that predate the
   column — applying it to those would have demoted the owner and locked them
   out of the page that grants the role back. `prisma/seed.ts` creates its
   first admin as `SUPER_ADMIN` for the same reason.

5. **Two guards refuse in the action, not just in the UI.** You cannot delete,
   deactivate or demote *yourself*, and you cannot do any of those to the *last
   active super admin*. Both end with somebody in a database console otherwise.
   The rule is `wouldStrand()` in `lib/admin/permissions.ts` — pure, taking the
   count as an argument, so it is checkable without a database.

6. **Permissions are read from the row on every request, never from the JWT.**
   Revoking one bites on the next page load rather than in eight hours.

7. **`/admin/` renders for everyone**, because `requirePermission` sends people
   there — an editor without `booking.manage` gets a placeholder instead of the
   agenda, which is a list of customer names and phone numbers. That
   placeholder becomes the CMS dashboard in Phase 7.

8. **Three roles, and two of them are disjoint on purpose.** `EDITOR` runs the
   website and cannot open a booking; `BOOKING_STAFF` runs the diary and cannot
   change a word on the site. Neither can reach settings or admin accounts.
   Crossing the line is possible — `booking.manage` is offered as a grant on the
   editor form — but never by accident. `grantableFor(role)` is what the form
   offers, so a checkbox for something the role already holds never appears.

9. **Two check scripts, and they answer different questions.**
   `npm run check:permissions` proves the permission *table* — role defaults,
   grant resolution, the stranding guard, a round trip through a probe account.
   `npm run check:access` proves the *gates*: it mints a session with the app's
   own signing key (no password is typed or stored) and walks every admin URL
   as each role, checking who gets in and scanning refused pages for leaked
   data. A page that forgot its guard passes the first and fails the second.

10. **`npm run admin:create`** makes an account from the command line, for the
    ones that have to exist before anybody can sign in to make them. It never
    prints the password — terminal output ends up in logs and transcripts — and
    appends it to the gitignored `.admin-accounts.txt` instead.

## Phase 6 — Client Intake & Consent form (in progress)

The studio sent every client to an external JotForm before a booking. It now
lives natively in this app: SUPER_ADMIN-editable fields, submissions synced to
a Google Sheet (service account, up to two Gmail addresses), and a WhatsApp
notification to the studio through the same WAHA integration Phase 3 already
verified. **`INTAKE-PLAN.md` is the spec, the as-built model, and the current
status; read it before changing any of this** — it is more detailed than this
section and is the file to update as this phase progresses.

Every booking CTA site-wide now routes through `/intake` first — no memory,
every attempt requires a fresh fill — with the site nav hidden on that page,
redirecting on success to the external `booking.flexandflow.fit`
([[booking-external-redirect]] in memory; the booking form itself is still
WordPress/BookingPress, untouched by this phase).

### Status, in short

Data model, seed, the public form (all 34 fields, conditional field reveal,
a country-code phone field, image uploads), the booking gate, Google Sheets
sync and WhatsApp notifications are **built and verified working** — a real
submission was completed end to end in a browser (201 Created, real WhatsApp
sent, correct E.164 data, redirect to booking confirmed by tab origin
change), and the owner confirmed the Sheet receives rows.

A SUPER_ADMIN field-builder was added on top of that (add a custom field of
any kind — dropdown/radio/checkbox/text/phone/date/signature/image/textarea —
from `/admin/intake/`, delete only the ones added this way). Its backend is
written and typechecks/lints clean; its public rendering was confirmed by
direct DOM inspection; one of its two dropdowns was proven to work through a
real browser click. **A full click-through — add one custom field, see it on
the public form, delete it again — has not been completed.** `INTAKE-PLAN.md`
has the detail on exactly what blocked that (a browser-pane coordinate
instability in this environment, not a code defect) and what to try next.

### Two real bugs this phase's own build had introduced

1. `components/intake/SignaturePad.tsx`'s `canvas.setPointerCapture()` could
   throw `NotFoundError` for an untracked pointer id, uncaught — silently
   breaking the whole signature pad with no visible error. This is very
   likely what the owner's original "can't submit" report was.
2. A stale-closure race in the draft-autosave (`IntakeForm.tsx`): rapid state
   changes could each save a stale `state.answers` snapshot, silently
   dropping a change from the persisted draft. Fixed by moving the save into
   a `useEffect` keyed on `state.answers`.

Both are fixed. `INTAKE-PLAN.md` §6 has the two smaller ones (a Google env
var name mismatch, and the seed script not syncing `kind` on existing rows).

### A gotcha that isn't in this file's own environment notes yet

**Under this project's `next dev` (Next 16, Turbopack), the persistent Data
Cache lives at `.next/dev/cache/fetch-cache/`, not `.next/cache/fetch-cache/`**
— the webpack-dev path this file's other `unstable_cache` notes assume.
Deleting the wrong one is a silent no-op that looks exactly like a successful
clear. This cost real time in this phase: the database and the running
process were both already correct, and the page still rendered stale data
until the *right* directory was deleted. See `INTAKE-PLAN.md` §7.

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
