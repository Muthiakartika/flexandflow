import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /**
       * WordPress serves a misspelled alias of the Lymphatic Drainage service
       * (its canonical points at `lymphatic-drainage`). Keep inbound links alive.
       */
      {
        source: "/uluwatu-bali/limphatic-drainage",
        destination: "/uluwatu-bali/lymphatic-drainage",
        permanent: true,
      },
      /* Price List and Booking are not cloned — they stay on WordPress. These
         redirects catch anyone landing on the Next.js paths directly. */
      {
        source: "/price-list",
        destination: "https://flexandflow.fit/price-list/",
        permanent: false,
      },
      {
        source: "/pricelist",
        destination: "https://flexandflow.fit/price-list/",
        permanent: false,
      },
      {
        source: "/booking",
        destination: "https://flexandflow.fit/appointment/",
        permanent: false,
      },
      {
        source: "/appointment",
        destination: "https://flexandflow.fit/appointment/",
        permanent: false,
      },
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
    ];
  },
};

export default nextConfig;
