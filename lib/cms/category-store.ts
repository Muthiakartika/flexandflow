/**
 * Reading and writing categories.
 *
 * Split from `lib/cms/categories.ts` so the rules there (reserved slugs, slug
 * shape) can be checked in the browser as well as on the server, while the
 * queries stay server-side. Same split as `permissions.ts` / `team.ts`.
 */
import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import type { Category } from "@/lib/cms/categories";

export const CATEGORY_TAG = "cms:categories";

const SELECT = {
  id: true,
  slug: true,
  label: true,
  lead: true,
  seoTitle: true,
  seoDescription: true,
  locked: true,
  sortOrder: true,
} as const;

/**
 * Every category, in display order.
 *
 * Cached and tagged: this runs on the blog sidebar of every article and in
 * `generateStaticParams` for the whole `[category]` route, so it is one of the
 * hottest reads on the site. `lib/cms/write.ts` invalidates the tag.
 *
 * Deliberately free of `draftMode()` — unlike the document reads. A category
 * has no draft state, and reading draft mode here would make it unusable from
 * `generateStaticParams`, which is exactly where it is needed most.
 */
export const listCategories = unstable_cache(
  async (): Promise<Category[]> =>
    prisma.contentCategory.findMany({
      select: SELECT,
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
  ["cms", "categories"],
  { tags: [CATEGORY_TAG] },
);

export async function getCategory(slug: string): Promise<Category | null> {
  const all = await listCategories();
  return all.find((category) => category.slug === slug) ?? null;
}

/** Slug → label, for breadcrumbs and the listing chips. */
export async function categoryLabels(): Promise<Record<string, string>> {
  const all = await listCategories();
  return Object.fromEntries(all.map((c) => [c.slug, c.label]));
}

export type CategoryWithCount = Category & { postCount: number };

/** For the admin list: how many documents each one holds. */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const [categories, counts] = await Promise.all([
    prisma.contentCategory.findMany({
      select: SELECT,
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.contentDoc.groupBy({
      by: ["urlPrefix"],
      _count: { _all: true },
    }),
  ]);

  const byPrefix = new Map(counts.map((row) => [row.urlPrefix, row._count._all]));

  return categories.map((category) => ({
    ...category,
    postCount: byPrefix.get(category.slug) ?? 0,
  }));
}

/** How many documents would be orphaned by removing this category. */
export async function categoryUsage(slug: string): Promise<number> {
  return prisma.contentDoc.count({ where: { urlPrefix: slug } });
}
