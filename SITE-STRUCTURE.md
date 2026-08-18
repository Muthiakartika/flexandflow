# Site structure — where the header and footer actually live

Two websites ship from this one repository, and they do **not** share a header,
a footer, or a stylesheet. That is the thing to hold on to: nothing in
`components/layout/` is ever rendered on an academy page, and nothing in
`components/academy/` is ever rendered on the studio site. Editing the wrong one
looks like your change did nothing.

```
app/
├── (main)/        the studio site, flexandflow.fit/…      → components/layout/
└── (academy)/     Flex & Flow Academy, /academy/…         → components/academy/
```

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
