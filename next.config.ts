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
    ];
  },
};

export default nextConfig;
