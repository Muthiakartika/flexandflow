import type { Metadata } from "next";

import CategoryArchiveGrid from "@/components/blog/CategoryArchiveGrid";
import PageHero from "@/components/ui/PageHero";
import { postsInCategory } from "@/lib/content";

export const metadata: Metadata = {
  title: "Injury Guide Archives - Flex and Flow",
  description:
    "Guides on preventing and recovering from common injuries, from surfing to sitting too long.",
  alternates: { canonical: "/injury-guide/" },
};

export default function InjuryGuideArchive() {
  return (
    <>
      <PageHero
        title="Category: Injury Guide"
        crumbs={[{ label: "Injury Guide" }]}
      />
      <CategoryArchiveGrid posts={postsInCategory("injury-guide")} />
    </>
  );
}
