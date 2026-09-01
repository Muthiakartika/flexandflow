import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CategoryArchiveGrid from "@/components/blog/CategoryArchiveGrid";
import PageHero from "@/components/ui/PageHero";
import { getCategory, listCategories } from "@/lib/cms/category-store";
import { postsInCategory } from "@/lib/content";

/**
 * A category archive: `/uluwatu-bali/`, `/injury-guide/`, and any category the
 * studio adds.
 *
 * This was two hand-written pages whose metadata was matched character for
 * character against WordPress (SITE-STRUCTURE.md). That metadata now lives on
 * the `ContentCategory` row and was copied into it by the migration, so the
 * two archives still emit exactly what they emitted before.
 *
 * Yoast marks these archives `noindex, follow` and this app matches that, so
 * they are also absent from `app/sitemap.ts` — listing a page here that its own
 * meta tag tells Google to skip is a contradiction Search Console reports.
 */
export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[category]">,
): Promise<Metadata> {
  const { category: slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return {};

  return {
    title: category.seoTitle,
    /* `null`, not omitted, when the category has none. An absent field
       inherits the root layout's description, which would put the home page's
       wording on this archive — and the injury-guide archive deliberately has
       no description of its own, matching WordPress. */
    description: category.seoDescription ?? null,
    alternates: { canonical: `/${category.slug}/` },
    robots: { index: false, follow: true },
    openGraph: {
      title: category.seoTitle,
      ...(category.seoDescription
        ? { description: category.seoDescription }
        : {}),
      url: `/${category.slug}/`,
      type: "website",
    },
  };
}

export default async function CategoryArchive(props: PageProps<"/[category]">) {
  const { category: slug } = await props.params;

  const category = await getCategory(slug);
  /* Anything that is not a real category falls through to here, because
     `[category]` is the last thing Next tries. A 404 is the correct answer and
     the only safe one — rendering an empty archive for `/typo/` would hand out
     a soft 404 for every mistyped URL on the domain. */
  if (!category) notFound();

  return (
    <>
      <PageHero
        title={category.label}
        eyebrow="Category"
        crumbs={[{ label: category.label }]}
        {...(category.lead ? { lead: category.lead } : {})}
      />
      <CategoryArchiveGrid posts={await postsInCategory(category.slug)} />
    </>
  );
}
