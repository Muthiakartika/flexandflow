# Flex & Flow — Next.js clone

A clone of [flexandflow.fit](https://flexandflow.fit) (WordPress + Elementor,
"miss-spa" theme) rebuilt on Next.js App Router, TypeScript, and Tailwind CSS v4.

This is a **migration, not a redesign** — layout, spacing, typography, colours,
and copy are reproduced as closely as possible.

## Getting started

```bash
npm run dev
```

## Pages

Cloned (26 routes):

| Route | Source |
| --- | --- |
| `/` | home |
| `/about-us` | About us |
| `/services` | Services (priced cards) |
| `/contact-us` | Contact Us (form is UI-only) |
| `/blog`, `/blog/page/2` | blog listing, 6 posts per page |
| `/uluwatu-bali` , `/injury-guide` | category archives |
| `/uluwatu-bali/[slug]` | 8 services + 6 posts |
| `/injury-guide/[slug]` | 2 posts |
| `/therapist/[slug]` | Ginny, Yuni |

**Not cloned — these stay on WordPress.** Every link to them is an absolute URL
from `wordpressUrls` in [`lib/site.ts`](lib/site.ts); never route them through
`next/link`:

- Price List → `https://flexandflow.fit/price-list/`
- Booking → `https://flexandflow.fit/appointment/`

> The brief named `/pricelist/` and `/booking/`, but both 404 on the live site.
> The working paths are `/price-list/` and `/appointment/`, which is what the
> code uses. `next.config.ts` also redirects the Next.js equivalents outward so
> no link dead-ends.

## Structure

```
app/                  routes, metadata, redirects
components/
  layout/             Header, DesktopNav, MobileNav, SlideMenu, Footer,
                      NewsletterForm, ScrollToTop
  ui/                 tokens.ts (shared classes), Button, PageHero, Accordion,
                      BenefitIcon
  cards/              ServicePriceCard, TherapistCard, PostCard
  content/            RichText, ServiceArticle, PostArticle, InlineFaq
  blog/               BlogListing, BlogSidebar, CategoryArchiveGrid,
                      Pagination, SearchForm
  forms/              ContactForm
sections/home/        Hero, ServiceTicker, Treatments, PrivateTherapy,
                      CompleteWellness, Practitioners, Gallery, Faqs
sections/common/      BookClose (the closing band, shared by pages)
lib/
  site.ts             site config, nav, contact details, WordPress URLs
  pricing.ts          price/duration normalisation — see DESIGN.md
  content.ts          slug resolution, neighbours, SEO mapping
  data/               ported page content (services, posts, therapists, home)
types/                shared content types
public/images/        original assets, keeping the WordPress yyyy/mm paths
```

## Design tokens

The site's design system — measure, scale, surfaces, motion, the derived-price
rule — is in **[`DESIGN.md`](DESIGN.md)**. Read that before changing any of it.
Shared class strings are in [`components/ui/tokens.ts`](components/ui/tokens.ts);
the CSS primitives are in [`app/globals.css`](app/globals.css).

The pinned brand values, unchanged since the WordPress theme:

- Palette — primary `#7f8c3a`, page background `#f0efeb`, text black. Filled
  surfaces use `--color-primary-strong` `#6d7932`, the same olive one step down,
  because white on `#7f8c3a` is 3.67:1 and fails AA
- Type — body `Andika`; headings `Amatic SC`
- The logo and all existing photography

Base element styles live in `@layer base` and component classes in
`@layer components`, so Tailwind utilities can still override them.

## Notes on content

The site was first built as a pixel-accurate clone of the WordPress original,
then redesigned. The layout is now the studio's own; **the words and the data are
still the original's, verbatim** — see the copy rule in
[`DESIGN.md`](DESIGN.md).

- **Masks** in `public/shapes/` are the theme's own art. The clover bullet, the
  star bullet, the benefit icons, the quote mark and the nav glyph are still in
  use; the wave and blob masks belong to layouts the redesign replaced and are
  kept only so the clone can be reconstructed from git history.
- Two images referenced by the "sitting too long" post 404 upstream (deleted
  from the WordPress media library) and are omitted rather than cloned broken.
- The footer's Privacy Policy and Cookie Policy links render collapsed on the
  original and both 404, so only the copyright line is shown.
- The Yuni profile's "Contact Now" button is broken upstream (`http://Contact`);
  her profile links to WhatsApp with her name in the message, as Ginny's does.
- Forms (contact, newsletter, blog search) are presentation-only, per the brief.
  The contact form keeps the original field names for whenever a backend lands.

## Regenerating ported content

`lib/data/services.ts` and `lib/data/posts.ts` are generated from the live site
rather than hand-written — prefer regenerating over hand-editing so the copy
stays verbatim.
