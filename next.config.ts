import type { NextConfig } from "next";

import { ACADEMY_ENABLED } from "./lib/flags";
import { externalBookingUrl } from "./lib/site";

/**
 * The academy's own routes, kept in one place because the switch flips them as
 * a pair: while it is unpublished the legacy top-level aliases are pointless
 * (they would 308 into a redirect), and the academy itself hands visitors back
 * to the studio home rather than showing an unfinished site.
 */
const academyRedirects = ACADEMY_ENABLED
  ? [
      /**
       * The academy used to be its own deployment, where every route sat at the
       * domain root. Now that it is mounted at `/academy`, anything still
       * pointing at the old top-level paths is sent to its new home so old
       * links and search results do not land on the main site's 404.
       */
      {
        source: "/courses/:path*",
        destination: "/academy/courses/:path*",
        permanent: true,
      },
      {
        source: "/materials/:path*",
        destination: "/academy/materials/:path*",
        permanent: true,
      },
      {
        source: "/register/:path*",
        destination: "/academy/register/:path*",
        permanent: true,
      },
      {
        source: "/schedule",
        destination: "/academy/schedule",
        permanent: true,
      },
    ]
  : [
      /* Academy held back — see `ACADEMY_ENABLED` in `lib/flags.ts`. Sent to
         the studio's booking link rather than the home page, same destination
         as every other "Book Now" CTA on the site right now, so a visitor who
         reaches a dead academy link still lands somewhere they can act on
         instead of just bouncing to the home page. Both rules are deliberately
         temporary (307): a permanent redirect would be cached by browsers and
         search engines and would still be firing long after the academy is
         published. */
      { source: "/academy", destination: externalBookingUrl, permanent: false },
      {
        source: "/academy/:path*",
        destination: externalBookingUrl,
        permanent: false,
      },
    ];

const nextConfig: NextConfig = {
  /**
   * WordPress publishes every URL with a trailing slash — that is the shape in
   * the Yoast sitemap, in every canonical tag, and in Google's index. Next's
   * default is the opposite, and it enforces it: `/about-us/` was answering
   * 308 to `/about-us`, so every indexed page would have landed on a redirect
   * the day this app replaced WordPress, and the canonical tags this app emits
   * (all of which end in a slash) pointed at URLs that redirected elsewhere.
   * Matching WordPress removes both problems at once.
   */
  trailingSlash: true,
  /**
   * Fences around Vercel's Image Optimization quota.
   *
   * Three separate meters share the word "image" on the usage dashboard and
   * they respond to different things, so it is worth being explicit about
   * which one each setting here is for:
   *
   * - **Transformations** (5,000/month on Hobby) — one per *unique* variant.
   *   The cache key is project + `w` + `q` + the source's content hash + the
   *   request's `Accept` header, so the ceiling is the size of the cross
   *   product below, not the number of visitors. `deviceSizes`, `imageSizes`,
   *   `qualities` and `formats` are the four dimensions of it.
   * - **Cache writes** (100,000/month) — one per MISS or STALE. A variant that
   *   goes stale is re-fetched *and re-billed as a transformation*, which is
   *   why `minimumCacheTTL` matters far more than it looks.
   * - **Cache reads** (300,000/month) — pure traffic. Nothing in this file
   *   moves it; only a CDN in front does.
   *
   * Everything here was previously running on defaults.
   */
  images: {
    /**
     * Next's default is 14400 — four hours. That means every variant can go
     * STALE six times a day, and each staleness is a fresh cache write *and* a
     * fresh transformation: a single image sitting untouched could bill ~180
     * transformations a month on its own. 31 days makes it bill roughly once.
     *
     * The cache survives redeploys — it is keyed on the file's content hash,
     * not on the deployment — so this is a per-month ceiling rather than a
     * per-deploy one. The trade is that a variant cannot be invalidated on
     * demand: changing a picture means changing the file (a new hash), which
     * is what the CMS does anyway, since uploads are content-addressed.
     */
    minimumCacheTTL: 2678400,

    /**
     * Both are Next 16 defaults, written out because they are quota decisions
     * and a future default that quietly adds AVIF would double the stored (and
     * billed) variants for no visible gain — AVIF costs ~50% more encoding
     * time for ~20% fewer bytes, and is cached and charged separately from
     * WebP. One format, one quality, one variant per width.
     */
    formats: ["image/webp"],
    qualities: [75],

    /**
     * Trimmed from the default 8 + 7 to match what this layout actually asks
     * for. `deviceSizes` serves any `sizes` written in `vw`; `imageSizes` is
     * concatenated onto it for `sizes` written in pixels, and every entry must
     * stay below the smallest `deviceSizes` entry.
     *
     * The page body is capped at 1440px and the widest single image slot is
     * the article hero at 1024px, so 1920 covers a 2× display with room over.
     * The defaults' 2048 and 3840 could only ever have been served by
     * upscaling — no source in `public/` is wider than 1920 (see
     * `npm run images:optimize`) — so they were pure quota surface.
     *
     * The pixel entries follow the real fixed slots in the codebase: 48/56px
     * logos, 80/96/120px thumbnails, 160/200px media tiles, 300px inline
     * figures. Widen a slot past these and check what `sizes` resolves to
     * before assuming it still fits:
     *
     *   grep -rn 'sizes=' app components --include=*.tsx
     */
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      /**
       * WordPress serves a misspelled alias of the Lymphatic Drainage service
       * (its canonical points at `lymphatic-drainage`). Keep inbound links alive.
       */
      {
        source: "/uluwatu-bali/limphatic-drainage",
        /* Trailing slash written in: `trailingSlash` normalises incoming URLs
           but not redirect destinations, so without it this lands on a second
           308 rather than on the page. */
        destination: "/uluwatu-bali/lymphatic-drainage/",
        permanent: true,
      },
      /**
       * The brief named `/pricelist/` (no hyphen), which never existed —
       * WordPress's real path, now this app's too, is `/price-list/`. Kept
       * alive permanently in case anything already links the brief's
       * spelling; `/price-list` itself needs no entry here, `trailingSlash`
       * normalises it like any other page.
       */
      {
        source: "/pricelist",
        destination: "/price-list/",
        permanent: true,
      },
      /**
       * WordPress's live blog index is `/blog-2/` (a slug-collision artifact —
       * see the comment in app/(main)/blog/page/[page]/page.tsx), not `/blog/`,
       * which genuinely 404s on WordPress. This app correctly uses the clean
       * `/blog/` path, so an old link, a bookmark, or Google's index still
       * pointing at `/blog-2/` needs to land on the real page instead of a 404.
       *
       * The trailing slash is written into both destinations for the same
       * reason as everywhere else in this file: `trailingSlash` normalises
       * incoming URLs but not redirect destinations, so without it this lands
       * on a second 308 rather than on the page.
       */
      {
        source: "/blog-2",
        destination: "/blog/",
        permanent: true,
      },
      {
        source: "/blog-2/:path*",
        destination: "/blog/:path*/",
        permanent: true,
      },
      ...academyRedirects,
    ];
  },
};

export default nextConfig;
