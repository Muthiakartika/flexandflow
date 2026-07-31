import type { Metadata } from "next";

import CategoryArchiveGrid from "@/components/blog/CategoryArchiveGrid";
import PageHero from "@/components/ui/PageHero";
import { postsInCategory } from "@/lib/content";

export const metadata: Metadata = {
  title: "Uluwatu Bali Archives - Flex and Flow",
  description:
    "Articles about wellness, recovery, and bodywork at our studio in Uluwatu, Bali.",
  alternates: { canonical: "/uluwatu-bali/" },
};

export default function UluwatuBaliArchive() {
  return (
    <>
      <PageHero
        title="Category: Uluwatu Bali"
        crumbs={[{ label: "Uluwatu Bali" }]}
      />
      <CategoryArchiveGrid posts={postsInCategory("uluwatu-bali")} />
    </>
  );
}
