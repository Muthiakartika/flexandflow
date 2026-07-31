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
  layout/             Header, DesktopNav, MobileNav, Footer, NewsletterForm
  ui/                 Button, Container, Section, SectionHeading, Accordion,
                      PageHero, Reveal
  cards/              ServicePriceCard, TreatmentCard, PostCard
  content/            RichText, ServiceArticle, PostArticle
  blog/               BlogListing, BlogSidebar, Pagination, SearchForm
  forms/              ContactForm
sections/home/        Hero, PrivateTherapy, CompleteWellness, Gallery,
                      Treatments, Faqs
lib/
  site.ts             site config, nav, contact details, WordPress URLs
  content.ts          slug resolution, neighbours, SEO mapping
  data/               ported page content (services, posts, therapists, home)
types/                shared content types
public/images/        original assets, keeping the WordPress yyyy/mm paths
```

## Design tokens

All values in [`app/globals.css`](app/globals.css) are ported 1:1 from the
theme's CSS custom properties and Elementor kit:

- Palette — primary `#7f8c3a`, tertiary `#dcdddc`, page background `#f0efeb`,
  link hover `#738b69`
- Type — body `Andika` 16px/1.625; headings `Amatic SC` 400, line-height 1.26,
  with the theme's fluid `clamp()` scale (h1 40→74px, h2 38→64px, …)
- Boxed container — `max-width: 1810px` with a 20px gutter
- Buttons — white fill, primary text and 3px border, inverting on hover

Base element styles live in `@layer base` and component classes in
`@layer components`, so Tailwind utilities can still override them.

## Notes on fidelity

Layout was matched by screenshot-diffing every page against the live site at
390 / 768 / 1024 / 1440px, then reconciling measured values. Verified equal at
1440px: header 110px, logo 140x140, hero panel 1385x1025 inset 20px, hero H1
81px, section H2 56px, boxed container 1300px on service pages with 820px body
copy, gallery photos 268px tall.

- **Header** has two arrangements, as the theme does: above 1281px the nav sits
  left with the oversized logo centred and overhanging, the Contact Us CTA, and
  the 6-dot trigger for the off-canvas services panel; below 1281px the logo is
  flush left with the WordPress booking CTA and a drawer trigger. Every nav item
  reserves 25px for the burst glyph that marks the current page.
- **Hero** is a panel inset 20px with 20px rounded top corners, the looping
  video (`public/video/home-banner.mp4`) behind a 50% white wash, the theme's
  decorative cut-outs, and a cream wave masked over the bottom edge.
- **Masks** are the theme's own PNGs, kept in `public/shapes/`: the wavy edge on
  treatment-card photos, the scalloped edge on the Complete Wellness photo and
  FAQ band, and the hero wave. Benefit icons, the clover bullet, the nav glyph,
  and the slide-menu trigger are SVGs extracted from the original markup.
- `Reveal` reproduces Elementor's scroll-triggered `fadeInUp` entrances and
  honours `prefers-reduced-motion`.
- Two images referenced by the "sitting too long" post 404 upstream (deleted
  from the WordPress media library) and are omitted rather than cloned broken.
- The footer's Privacy Policy and Cookie Policy links render collapsed on the
  original and both 404, so only the copyright line is shown.
- The About page's team cards omit the working-hours line, which the original
  renders at `font-size: 0`.
- The Yuni profile's "Contact Now" button is broken upstream (`http://Contact`);
  it points at `/contact-us` here, matching the Ginny profile.
- Forms (contact, newsletter, blog search) are presentation-only, per the brief.
  The contact form keeps the original field names for whenever a backend lands.

## Regenerating ported content

`lib/data/services.ts` and `lib/data/posts.ts` are generated from the live site
rather than hand-written — prefer regenerating over hand-editing so the copy
stays verbatim.
