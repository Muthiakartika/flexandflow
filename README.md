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

**Still on WordPress:** the price list only. Link to it with the absolute URL
from `wordpressUrls` in [`lib/site.ts`](lib/site.ts); never route it through
`next/link`.

> The brief named `/pricelist/`, which 404s on the live site. The working path is
> `/price-list/`, which is what the code uses. `next.config.ts` redirects the
> Next.js equivalents outward so no link dead-ends.

Booking used to be on WordPress too, at `/appointment/`. It now runs in this app
— see below.

## Booking

Five steps, in the order the previous system used: **staff → service → date &
time → basic details → summary**. Confirmations go out by email (SendGrid) and
WhatsApp (the studio's own WAHA server), each carrying a `.ics` so the
appointment lands in the customer's phone calendar.

| Route | What it is |
| --- | --- |
| `/booking` | the wizard |
| `/booking/confirmation/[reference]` | after booking — add to calendar |
| `/booking/manage/[token]` | the customer's own view; cancel |
| `/admin` | the studio's panel — agenda, bookings, schedule, prices, payments, message health |

`/appointment/` — the URL Google has indexed — is redirected here permanently.

**Written in full, not yet run.** There is no database attached, so nothing has
been executed against one. Setup, in order:

1. Copy `.env.example` to `.env.local` and fill it in. `lib/env.ts` validates
   every key and names whichever one is missing.
2. Create a Neon Postgres database, then:
   ```bash
   npm run db:deploy
   npm run db:seed
   ```
3. Verify every seeded price and duration against the real price list —
   `npm run check:prices` compares the booking catalogue against the marketing
   data and fails on any disagreement.
4. Authenticate `flexandflow.fit` in SendGrid before sending anything. The from
   address must not be a Gmail one: sending as `@gmail.com` through SendGrid
   fails DMARC and lands in spam.
5. Set up the two scheduled jobs — see [`CRON.md`](CRON.md).

The design and the reasoning behind every decision are in
[`BOOKING-PLAN.md`](BOOKING-PLAN.md).

### Paying

The summary step offers **pay at the studio** or **pay now**. Paying now collects QRIS or
a virtual account number in a modal over the wizard; cards go to Xendit's own page,
because 3-D Secure belongs to the issuing bank.

The cheap rails are listed first on purpose — a virtual account keeps roughly six times
more of a Rp750,000 booking than a card does.

**Not yet usable.** It needs a verified Xendit account, which the studio does not have,
so none of it has ever run. Set `XENDIT_SECRET_KEY` and `XENDIT_CALLBACK_TOKEN` together
or not at all: with either missing the wizard offers only "pay at the studio", which is
the correct state while the account is being verified.

[`PAYMENT-PLAN.md`](PAYMENT-PLAN.md) has the reasoning, including why PayPal was refused
(IDR is not a PayPal transaction currency) and why most Indonesian refunds are a bank
transfer somebody makes by hand.

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
  booking/            the wizard, step by step
  booking-result/     confirmation and manage-booking views
  admin/              the studio's panel
lib/
  site.ts             site config, nav, contact details, WordPress URLs
  pricing.ts          price/duration normalisation — see DESIGN.md
  content.ts          slug resolution, neighbours, SEO mapping
  data/               ported page content (services, posts, therapists, home)
  env.ts              validated environment; fails loudly, names the missing key
  db.ts               the one Prisma client
  booking/            time, types, validation, availability, writes, tokens
  payments/           Xendit client, charges, settlement
  notifications/      SendGrid and WAHA, their templates, and the job queue
  calendar/           .ics generation and add-to-calendar links
  admin/              session, auth, queries, server actions
prisma/               schema, migrations, seed
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
