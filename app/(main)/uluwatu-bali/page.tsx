import type { Metadata } from "next";

import CategoryArchiveGrid from "@/components/blog/CategoryArchiveGrid";
import PageHero from "@/components/ui/PageHero";
import { postsInCategory } from "@/lib/content";

/**
 * Meta mirrors flexandflow.fit/uluwatu-bali/ exactly, terse description and
 * all — Yoast marks the category archives `noindex, follow`. The wording here
 * is the live site's, not ours; the fuller sentence below is page copy.
 */
const description = "Discover Flex n Flow at Uluwatu Bali Archives";

export const metadata: Metadata = {
  title: "Uluwatu Bali Archives - Flex and Flow",
  description,
  alternates: { canonical: "/uluwatu-bali/" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Uluwatu Bali Archives - Flex and Flow",
    description,
    url: "/uluwatu-bali/",
    type: "website",
  },
};

export default function UluwatuBaliArchive() {
  return (
    <>
      <PageHero
        title="Uluwatu Bali"
        eyebrow="Category"
        crumbs={[{ label: "Uluwatu Bali" }]}
        lead="Articles about wellness, recovery, and bodywork at our studio in Uluwatu, Bali."
      />
      <CategoryArchiveGrid posts={postsInCategory("uluwatu-bali")} />
    </>
  );
}
