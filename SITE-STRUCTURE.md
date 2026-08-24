# Site structure — where the header and footer actually live

Two websites ship from this one repository, and they do **not** share a header,
a footer, or a stylesheet. That is the thing to hold on to: nothing in
`components/layout/` is ever rendered on an academy page, and nothing in
`components/academy/` is ever rendered on the studio site. Editing the wrong one
looks like your change did nothing.

```
app/
├── (main)/        the studio site, flexandflow.fit/…      → components/layout/
├── (academy)/     Flex & Flow Academy, /academy/…         → components/academy/
└── (admin)/       the booking admin panel, /admin/…       → components/admin/
```

Three groups now, on the same principle. The admin panel is an internal tool
with its own denser stylesheet, and it is `noindex, nofollow` — an admin panel
in Google's index is an incident, not an untidiness.

The brackets are Next.js **route groups**: they organise files without appearing
in the URL. `app/(main)/about-us/page.tsx` is served at `/about-us/`, not at
`/(main)/about-us/`. There is deliberately no `app/layout.tsx` — each group owns
its own `<html>`, its own `<body>`, and its own design tokens, which is what
lets the academy keep an olive-and-cream palette that would otherwise collide
with the studio's. Moving between `/` and `/academy` is a full page load rather
than a client-side transition; that is the documented behaviour of two root
layouts, and it is what keeps the two stylesheets off the same page.

---

## I want to change… → edit this file

### The studio site (flexandflow.fit)

| What you want to change | File |
|---|---|
| Logo, wordmark, "Book now" button, sticky bar | [components/layout/Header.tsx](components/layout/Header.tsx) |
| The menu items themselves (labels, links, order, dropdowns) | [lib/site.ts](lib/site.ts) → `allNavItems` |
| How the menu looks on desktop | [components/layout/DesktopNav.tsx](components/layout/DesktopNav.tsx) |
| The mobile hamburger drawer | [components/layout/MobileNav.tsx](components/layout/MobileNav.tsx) |
| Footer layout, columns, payment marks | [components/layout/Footer.tsx](components/layout/Footer.tsx) |
| The footer's own link list | [components/layout/Footer.tsx](components/layout/Footer.tsx) → the `nav` array at the top (separate from the header's) |
| Footer intro paragraph, address, phone, e‑mail, opening hours, socials | [lib/site.ts](lib/site.ts) → `footerIntro`, `contact`, `workingHours` |
| Where header and footer are mounted onto every page | [app/(main)/layout.tsx](app/(main)/layout.tsx) |
| Colours, fonts, spacing tokens | [app/(main)/globals.css](app/(main)/globals.css) |
| Where every marketing "Book now" / "Book Appointment" / "Book with Ginny" / "Book with Yuni" button points | [lib/site.ts](lib/site.ts) → `externalBookingUrl` — booking.flexandflow.fit, a WordPress booking plugin, opened in a new tab. It reads no query string, so there is no per-therapist link. |
| The wizard's own internal links (reschedule) | [lib/site.ts](lib/site.ts) → `bookingUrl` — unchanged, still `/booking/` inside this app |
| The booking wizard itself (staff → service → date → details → summary) | [components/booking/](components/booking) |
| Prices and durations customers can actually book | the database, edited at `/admin/services` — **not** `lib/data/services.ts` |
| The price list page, and Ginny/Yuni's per-therapist rates | [app/(main)/price-list/page.tsx](app/(main)/price-list/page.tsx), [lib/data/priceList.ts](lib/data/priceList.ts) — separate from `lib/data/services.ts`, on purpose; see the note at the top of that file |

Note: `components/layout/SlideMenu.tsx` is **not mounted anywhere**. It is a
leftover from the WordPress clone. Editing it changes nothing on the live site —
the mobile menu you see is `MobileNav.tsx`.

### The academy (/academy)

| What you want to change | File |
|---|---|
| Academy header, its logo, its courses mega-menu | [components/academy/site-header.tsx](components/academy/site-header.tsx) |
| Academy header menu items | same file → the `NAV` array near the top |
| Academy footer | [components/academy/site-footer.tsx](components/academy/site-footer.tsx) |
| Academy contact details, course data, prices | [lib/academy.ts](lib/academy.ts) |
| Where the academy header and footer are mounted | [app/(academy)/layout.tsx](app/(academy)/layout.tsx) |
| Academy colours and fonts | [app/(academy)/academy.css](app/(academy)/academy.css) |

Quick test if you are unsure which side you are on: **is the URL under
`/academy`?** If yes it is the academy's files, if no it is the studio's.

---

## The academy is currently hidden

One switch controls it: `ACADEMY_ENABLED` in [lib/flags.ts](lib/flags.ts),
presently `false`. Nothing has been deleted — every academy route, component and
data file still exists and still compiles.

With the switch off:

| Effect | Where it happens |
|---|---|
| "Academy" disappears from the header menu, desktop and mobile alike | `lib/site.ts` filters it out of `primaryNav` |
| `/academy` and everything under it sends the visitor to the home page, temporary 307 | `next.config.ts` → `academyRedirects` |
| The legacy `/courses/…`, `/materials/…`, `/register/…`, `/schedule` aliases stop pointing at the academy | same place |
| Academy pages carry `noindex, nofollow` if they are ever served directly | `app/(academy)/layout.tsx` |

**To publish the academy**, change that one value to `true` and rebuild. The
mega menu, the routes and the redirects all come back exactly as they were —
that is why the nav entry is still written out in full in `lib/site.ts` rather
than deleted.

The redirect is deliberately **temporary (307), not permanent (301)**. A
permanent redirect is cached by browsers and search engines and would keep
sending people to the home page for months after the switch was flipped back.

### Why this does not touch the studio site's SEO

`/academy` has never been a live URL on flexandflow.fit — it returns 404 on the
WordPress site today. There is no ranking, no indexed page and no backlink to
lose by holding it back. No studio page links to it, and no studio URL changed.

---

## Photos and video

**Camera masters never go in `public/`.** Anything under `public/` is served and
deployed as-is, so a folder of 25 MB originals dropped there ships to every
visitor's browser as a downloadable URL. Masters live in `/source-photos`, which
is gitignored; the web-ready crops derived from them live in
`public/images/<year>/<month>/`. The 2026 shoot is in
`source-photos/2026-08-shoot/`.

**Crop to the frame, not to one universal ratio.** Each slot is rendered at a
fixed `aspect-[...]` with `object-cover`, so the master only has to survive the
frames it is actually used in:

| Slot | Frames it appears in | Master |
|---|---|---|
| `service.image`, `post.image` | `16/10` cards, `16/8` article banner | **16:9**, 2400 × 1350 |
| `therapist.portrait` | `4/5` profile, square card and avatar — all `object-top` | **4:5**, 1600 × 2000 |
| `therapist.sceneImage` | `4/5` profile **and** `5/4` on About us | **1:1**, 1800 × 1800 |
| PrivateTherapy lead | `5/4` | **5:4**, 2400 × 1920 |
| PrivateTherapy inset | ~`4/5` at 150 px | **4:5**, 800 × 1000 |
| Complete Wellness, About us studio | `5/4` | **5:4**, 2400 × 1920 |
| BookClose | `4/3` | **4:3**, 1600 × 1200 |
| Home page mosaic | see below | per cell |
| Hero video | `4/3` phone, `5/6` desktop | 1080 × 1920, no audio |

**`therapist.sceneImage` is the trap in that table.** It is the one asset used
in a portrait frame *and* a landscape one — `4/5` on the profile page, `5/4` on
About us. Neither a portrait nor a landscape master survives both; a square
does, giving up 20% of one axis in each. The practitioner's head therefore has
to sit inside the middle 80% of the square, and the only way to know is to
render both crops before committing. The first pass here shipped a 4:5 master
and About us cut Yuni's head clean off.

**The mosaic is six different shapes, not one.** `.mosaic` in `globals.css`
gives photo 1 a 2×2 block and photos 2, 5 and 6 a double-width strip, and every
cell collapses to roughly 1.29 on a phone:

| Photo | Desktop cell | Master |
|---|---|---|
| 1 | 590 × 384 (1.54) | 3:2, 1600 × 1067 |
| 2, 5, 6 | 590 × 186 (**3.17**) | 2:1, 1800 × 900 |
| 3, 4 | 289 × 186 (1.55) | 1.4, 1200 × 857 |

Reordering the array reshuffles which file lands in which cell, so a photo cut
for a 3.17 strip can end up in the 2×2 block. Re-cut when you reorder.

**Never `brightness-0 invert` the logo.** `FlexnFlow_new_logo.png` is not a dark
mark on transparency — it is an opaque **white disc** with the mark knocked out
of it in olive. That filter is the standard way to drop a dark logo onto a dark
ground, and here it flattens the whole disc into a plain white circle with no
mark at all. On the olive band the file needs no treatment. On white it needs
size instead: below about 56px the olive linework stops reading.

A portrait master is `object-top` wherever a face has to survive a square crop —
drop that and the avatar centres on the person's chest.

**Briefing the photographer** for a shot whose destination is not known yet: one
frame at **2400 × 1920 (5:4)** with the subject inside the middle 60% survives
every frame above. The trimmed margin is 432 px each side and 360 px top and
bottom; anything outside that is lost somewhere on the site.

**The hero video carries no audio track.** It is `muted` and `aria-hidden`, so
the audio is pure weight — the camera original was 24-bit PCM, 2.3 Mbps of it.
Re-encode with `-an`; keep `-movflags +faststart` so it starts before it has
finished downloading.

## SEO rules that are easy to break by accident

**Every URL ends in a slash.** `trailingSlash: true` in `next.config.ts` is
load-bearing. WordPress publishes `/about-us/`, that is the form in Yoast's
sitemap and in Google's index, and it is the form every canonical tag in this
app already emits. Turn the option off and each of those indexed URLs starts
answering a 308 redirect instead of the page. Redirect **destinations** are not
normalised, so any destination you add in `next.config.ts` must be written with
its slash: `/uluwatu-bali/lymphatic-drainage/`, not `/uluwatu-bali/lymphatic-drainage`.

**Titles and descriptions are WordPress's, verbatim.** They were copied from the
live site because Google has been tracking them for months, and they are not
ours to improve. They live in three places:

- per-page, in each `page.tsx`'s `metadata` export;
- for services and blog posts, in the `seo:` block of
  [lib/data/services.ts](lib/data/services.ts) and
  [lib/data/posts.ts](lib/data/posts.ts), turned into tags by `metadataFromSeo`;
- site-wide fallbacks, in [app/(main)/layout.tsx](app/(main)/layout.tsx).

To re-check any page against the live site:

```bash
curl -s https://flexandflow.fit/about-us/ | grep -oE '<title>[^<]*</title>|<meta name="description" content="[^"]*"'
```

**The snippet directives in `robots` are not decoration.** The root layout sends
`max-image-preview:large, max-snippet:-1, max-video-preview:-1` on every
indexable page because Yoast does. They are not defaults: without them Google
falls back to a small thumbnail and a clipped snippet, so the search result
shrinks even though the ranking has not moved. Pages that need to stay out of
the index replace the whole `robots` object rather than adding to it — that is
how `noindex, follow` comes out clean.

**`description: null` is not the same as leaving it out.** WordPress publishes no
meta description at all on the category archives and the therapist profiles.
Omitting the field in Next.js does not produce that — the page silently inherits
the root layout's description, which is the home page's wording. `null` is what
actually removes it. Same for `robots`.

**Some pages are meant to stay out of the index.** WordPress marks the category
archives (`/uluwatu-bali/`, `/injury-guide/`) and the therapist profiles
`noindex, follow`, and this app matches that. Do not "fix" it by removing the
`robots` line; those pages are not supposed to compete with the service pages.
The four `/preview/…` routes are noindex for the same reason.

---

## Booking

Booking used to be a WordPress page at `flexandflow.fit/appointment/`. It now
runs inside this app.

| | |
|---|---|
| Customer flow | `/booking/` — five steps: staff, service, date & time, details, summary |
| After booking | `/booking/confirmation/<reference>/` — the "add to calendar" page |
| Customer self-service | `/booking/manage/<token>/` — view or cancel |
| Studio | `/admin/` — today's agenda, bookings, schedule, prices, payments, notification health |

Everything about how it works is in [BOOKING-PLAN.md](BOOKING-PLAN.md);
[PAYMENT-PLAN.md](PAYMENT-PLAN.md) covers paying online, and [CRON.md](CRON.md) the two
scheduled jobs.

**Two things that are easy to get wrong:**

**Prices live in two places, and only one of them is bookable.** The service
pages, the home grid and `/services` derive their figures from
`lib/data/services.ts` through `lib/pricing.ts`. The booking wizard charges what
is in the `ServiceVariant` table. Changing one does not change the other. Run
`npm run check:prices` — it compares them and fails on any disagreement. This
repo has published a wrong price three times; that script exists so the fourth
time is caught before a customer sees it.

**`/appointment/` is a permanent redirect, not a dead URL.** It is what Google
has indexed and what old links point at, so `next.config.ts` sends it to
`/booking/` with a 301. Do not remove that redirect, and do not turn off the
WordPress page until the redirect is live and verified.

