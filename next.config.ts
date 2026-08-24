import type { NextConfig } from "next";

import { ACADEMY_ENABLED } from "./lib/flags";

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
      /* Academy held back — see `ACADEMY_ENABLED` in `lib/flags.ts`. Both rules
         are deliberately temporary (307): a permanent redirect would be cached
         by browsers and search engines and would still be sending people to the
         home page long after the academy is published. */
      { source: "/academy", destination: "/", permanent: false },
      { source: "/academy/:path*", destination: "/", permanent: false },
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
       * Booking now runs in this app at `/booking/`. `/appointment/` is the URL
       * WordPress published and the one Google has indexed, so it cannot simply
       * stop resolving — it is redirected, permanently, because the move is.
       *
       * The destination carries its trailing slash written in: `trailingSlash`
       * normalises incoming URLs but not redirect destinations, so without it
       * this lands on a second 308 rather than on the page.
       */
      {
        source: "/appointment",
        destination: "/booking/",
        permanent: true,
      },
      {
        source: "/appointment/:path*",
        destination: "/booking/",
        permanent: true,
      },
      ...academyRedirects,
    ];
  },
};

export default nextConfig;
