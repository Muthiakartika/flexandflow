import type { Metadata } from "next";

import BlogListing from "@/components/blog/BlogListing";
import SearchForm from "@/components/blog/SearchForm";
import PageHero from "@/components/ui/PageHero";
import { listPosts } from "@/lib/cms/read";
import { isGuide, newestFirst } from "@/lib/content";
import { assets } from "@/lib/site";

const title = "Bodywork Guides From Uluwatu | Flex & Flow";
const description =
  "Straight answers on surfing injuries, stretching, pregnancy massage, lymphatic drainage and " +
  "recovery, from the Flex & Flow studio in Ungasan, Uluwatu.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog/" },
  openGraph: {
    title,
    description,
    url: "/blog/",
    type: "website",
    images: [assets.pageHeroBackground],
  },
};

/**
 * The blog: "Guides From the Studio", as the home page names its row of
 * them. The newest guide leads as a wide card and the rest follow as compact
 * ones (`PostCard`), every guide on one page; the search box sits in the
 * hero rather than at the foot of the sidebar, where a phone met it last.
 * The home service page is a post in the panel but not a guide (`isGuide`).
 *
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
  const posts = newestFirst((await listPosts()).filter(isGuide));

  return (
    <>
      <PageHero
        title="Guides From the Studio"
        eyebrow="Blog"
        crumbs={[{ label: "Blog" }]}
        lead="Straight answers on what we treat every week: surf injuries, stiff hips and backs, pregnancy and recovery. Written by the studio, for bodies that surf, train and travel hard."
        actions={
          <div className="w-full sm:w-[340px]">
            <SearchForm />
          </div>
        }
      />
      <BlogListing posts={posts} page={1} searchable featured />
    </>
  );
}
