import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogListing, { POSTS_PER_PAGE } from "@/components/blog/BlogListing";
import PageHero from "@/components/ui/PageHero";
import { posts } from "@/lib/data/posts";

const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

export function generateStaticParams() {
  /* Page 1 lives at /blog, so only generate 2..n here. */
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

/**
 * WordPress gives every paginated page the same `<head>` as /blog/ itself —
 * same title, same description, and a canonical pointing back at /blog/ — so
 * the pages consolidate there rather than being suppressed. Mirrored exactly:
 * an earlier version numbered the title and self-canonicalised under noindex,
 * which is a cleaner pattern but is not what Google has on record.
 */
export function generateMetadata(): Metadata {
  return {
    title: "Blog - Flex and Flow",
    description:
      "Explore our blog for expert tips on yoga, flexibility training, and Physical Therapy in Uluwatu to support your overall well-being.",
    alternates: { canonical: "/blog/" },
  };
}

export default async function BlogPaginatedPage(
  props: PageProps<"/blog/page/[page]">,
) {
  const { page } = await props.params;
  const current = Number(page);

  if (!Number.isInteger(current) || current < 2 || current > totalPages) {
    notFound();
  }

  return (
    <>
      <PageHero
        title="Blog"
        eyebrow={`Page ${current}`}
        crumbs={[{ label: "Blog" }]}
      />
      <BlogListing
        posts={posts}
        page={current}
        hrefFor={(target) => (target === 1 ? "/blog" : `/blog/page/${target}`)}
      />
    </>
  );
}
