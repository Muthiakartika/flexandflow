import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { siteConfig } from "@/lib/site";

/**
 * `/admin` is already `noindex, nofollow` and behind a login — disallowing it
 * here too costs nothing and keeps crawlers from spending budget on pages
 * they can't read anyway. `/api` is routes, not content; nothing under it is
 * meant to render as a page.
 *
 * Every Vercel deployment is also reachable on a `*.vercel.app` host, whether
 * or not flexandflow.fit is attached yet — if that host is crawlable, Google
 * can index it as duplicate content alongside (or instead of) the real
 * domain. Reading the request's own host means this needs no follow-up edit
 * once the custom domain goes live: the moment requests arrive on
 * flexandflow.fit instead, this falls through to the normal rules below.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";

  if (host.endsWith(".vercel.app")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
