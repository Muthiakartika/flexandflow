import type { Metadata } from "next";

import BlogListing from "@/components/blog/BlogListing";
import PageHero from "@/components/ui/PageHero";
import { posts } from "@/lib/data/posts";

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

/** Keyword search filters the listing client-side via the `?s=` query. */
export default async function BlogPage(props: PageProps<"/blog">) {
  const { s } = await props.searchParams;
  const keyword = (Array.isArray(s) ? s[0] : s)?.toLowerCase().trim();

  const filtered = keyword
    ? posts.filter((post) =>
        `${post.title} ${post.excerpt}`.toLowerCase().includes(keyword),
      )
    : posts;

  return (
    <>
      <PageHero title="Blog" crumbs={[{ label: "Blog" }]} />
      <BlogListing
        posts={filtered}
        page={1}
        hrefFor={(page) => (page === 1 ? "/blog" : `/blog/page/${page}`)}
        emptyMessage={
          keyword ? `No posts match “${keyword}”.` : "No posts found."
        }
      />
    </>
  );
}
