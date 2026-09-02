import type { Metadata } from "next";

import BlogListing from "@/components/blog/BlogListing";
import PageHero from "@/components/ui/PageHero";
import { listPosts } from "@/lib/cms/read";

const description =
  "Explore our blog for expert tips on yoga, flexibility training, and Physical Therapy in Uluwatu to support your overall well-being.";

export const metadata: Metadata = {
  title: "Blog - Flex and Flow",
  description,
  alternates: { canonical: "/blog/" },
  openGraph: {
    title: "Blog - Flex and Flow",
    description,
    url: "/blog/",
    type: "website",
  },
};

/**
 * Keyword search filters the listing client-side via the `?s=` query.
 *
 * The filtering genuinely happens in the browser now — reading `searchParams`
 * here is a dynamic API and it was the only thing keeping this page out of the
 * static build, re-rendering it for every visitor to serve a listing that is
 * the same for all of them. `BlogListing`'s `searchable` flag hands the query
 * to a client component behind a `<Suspense>` boundary instead. Nothing about
 * the URL or the search box changed.
 */
export default async function BlogPage() {
  const posts = await listPosts();

  return (
    <>
      <PageHero
        title="Blog"
        crumbs={[{ label: "Blog" }]}
        lead={description}
      />
      <BlogListing
        posts={posts}
        page={1}
        searchable
      />
    </>
  );
}
