import type { Metadata } from "next";

import CategoryArchiveGrid from "@/components/blog/CategoryArchiveGrid";
import PageHero from "@/components/ui/PageHero";
import { postsInCategory } from "@/lib/content";

/**
 * Meta mirrors flexandflow.fit/injury-guide/ exactly. Yoast marks the category
 * archives `noindex, follow` and emits no meta description for this one — only
 * an og:title — so neither does this page. The visible lead below is page copy,
 * not metadata; it was never in the `<head>` on WordPress either.
 */
export const metadata: Metadata = {
  title: "Injury Guide Archives - Flex and Flow",
  /* `null`, not omitted: an absent field inherits the root layout's
     description, which would put the home page's wording on this archive. */
  description: null,
  alternates: { canonical: "/injury-guide/" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Injury Guide Archives - Flex and Flow",
    url: "/injury-guide/",
    type: "website",
  },
};

export default function InjuryGuideArchive() {
  return (
    <>
      <PageHero
        title="Injury Guide"
        eyebrow="Category"
        crumbs={[{ label: "Injury Guide" }]}
        lead="Guides on preventing and recovering from common injuries, from surfing to sitting too long."
      />
      <CategoryArchiveGrid posts={postsInCategory("injury-guide")} />
    </>
  );
}
