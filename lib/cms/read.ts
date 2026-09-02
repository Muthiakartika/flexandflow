/**
 * Reading published content, as the shapes the site already renders.
 *
 * **This is the contract that keeps the frontend intact.** Every function here
 * returns the `Service` and `Post` types from `types/index.ts` — the same ones
 * `lib/data/services.ts` and `lib/data/posts.ts` used to export as arrays. So
 * `ServiceArticle`, `PostArticle`, `RichText`, `ServicePriceCard`,
 * `BlogListing` and `BlogSidebar` take exactly the props they always took and
 * were not modified. The only change at the call sites is an `await`.
 *
 * Two orderings exist and both are preserved. `sortOrder` is the order the
 * arrays were written in (sitemap, "other treatments", blog listing);
 * `gridOrder` is the different order `/services` and `/price-list` used. See
 * `ContentDoc` in the schema.
 *
 * ## Draft mode
 *
 * `draftMode()` decides which revision is read: the published one, or the
 * latest. Next bypasses every cache layer for a request carrying the draft
 * cookie and serves the route dynamically, while everyone else keeps the
 * prerendered page — so preview costs the public site nothing.
 *
 * **None of the `list*`/`get*` functions may be called from
 * `generateStaticParams`.** They read `draftMode()`, and Next fails the build
 * with "used `draftMode()` inside `generateStaticParams`" — that hook runs at
 * build time with no request. Use `publishedParams` there, which deliberately
 * does not. This has already broken one build.
 */
import "server-only";

import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";

import {
  joinDraft,
  joinPublished,
  type ContentOrder,
  type ContentWhere,
} from "@/lib/cms/query";
import { categoryLabels } from "@/lib/cms/category-store";
import {
  toPost,
  toService,
  type Joined,
  type PostCategory,
} from "@/lib/cms/shape";
import { prisma } from "@/lib/db";
import type { Post, Service } from "@/types";

/** Invalidated by `lib/cms/write.ts` on every publish. */
export const CMS_TAG = {
  services: "cms:services",
  posts: "cms:posts",
  service: (slug: string) => `cms:service:${slug}`,
  post: (slug: string) => `cms:post:${slug}`,
} as const;

/**
 * The one page file that renders every treatment and every blog post.
 *
 * Lives here beside `CMS_TAG` because it is the same kind of thing: an
 * identifier the writers pass to Next to invalidate what this module cached.
 *
 * `revalidatePath` matches on the **route file structure, not the URL** — the
 * bundled docs are explicit, and give `/(main)/blog/[slug]` as an example.
 * Since the CMS moved categories into a dynamic segment, `[category]/[slug]`
 * is the only such file, so this is the only pattern that matches anything.
 *
 * It replaces `/uluwatu-bali/[slug]` and `` `/${category}/[slug]` ``, which
 * named `app/uluwatu-bali/[slug]/page.tsx` and friends — files that stopped
 * existing when categories became rows, leaving those calls matching no page.
 * The symptom hid well: the edited page itself refreshed, because a literal
 * path like `/uluwatu-bali/cupping-therapy` still resolves, while its siblings
 * kept the old title in their sidebars until something else rebuilt them.
 *
 * One pattern covers every category, so a treatment change now invalidates the
 * blog posts too. Broader than before, deliberately — `revalidateFor` already
 * prefers a few extra regenerations to a stale price.
 */
export const ARTICLE_ROUTE = "/[category]/[slug]";

export type { PostCategory };

/**
 * Which of the two joins to use.
 *
 * `unstable_cache` is applied only to the published path. Next bypasses it in
 * draft mode anyway, but wrapping the draft path would mean a cache key that
 * could hold unpublished copy — and content nobody has approved must not be
 * one cache-key collision away from the public site.
 */
async function load(
  where: ContentWhere,
  orderBy: ContentOrder,
  tags: string[],
): Promise<Joined[]> {
  const { isEnabled } = await draftMode();
  if (isEnabled) return joinDraft(prisma, where, orderBy);

  return unstable_cache(
    () => joinPublished(prisma, where, orderBy),
    ["cms", where.kind, where.urlPrefix ?? "*", where.slug ?? "*", orderBy],
    { tags },
  )();
}

// ── Services ──────────────────────────────────────────────────────────────

/** Every published treatment, in reading order. */
export async function listServices(): Promise<Service[]> {
  const rows = await load({ kind: "SERVICE" }, "sortOrder", [CMS_TAG.services]);
  return rows.map(toService);
}

/**
 * The treatments with published rates, in the order `/services` and
 * `/price-list` show them.
 *
 * Replaces the hand-written `pricedServiceSlugs` array. `full-body-massage`
 * and `facial-massage` stay out of it because they carry no `gridOrder` —
 * both are live, indexable pages that appear on no menu, on purpose.
 */
export async function listPricedServices(): Promise<Service[]> {
  const rows = await load({ kind: "SERVICE" }, "gridOrder", [CMS_TAG.services]);
  return rows.map(toService);
}

export async function getService(slug: string): Promise<Service | null> {
  const rows = await load(
    { kind: "SERVICE", urlPrefix: "uluwatu-bali", slug },
    "sortOrder",
    [CMS_TAG.services, CMS_TAG.service(slug)],
  );
  return rows.length ? toService(rows[0]) : null;
}

// ── Posts ─────────────────────────────────────────────────────────────────

/** Every published post, newest-written first, as the listing shows them. */
export async function listPosts(): Promise<Post[]> {
  const [rows, labels] = await Promise.all([
    load({ kind: "POST" }, "sortOrder", [CMS_TAG.posts]),
    categoryLabels(),
  ]);
  return rows.map((row) => toPost(row, labels));
}

export async function listPostsInCategory(
  category: PostCategory,
): Promise<Post[]> {
  const [rows, labels] = await Promise.all([
    load({ kind: "POST", urlPrefix: category }, "sortOrder", [CMS_TAG.posts]),
    categoryLabels(),
  ]);
  return rows.map((row) => toPost(row, labels));
}

export async function getPost(
  category: PostCategory,
  slug: string,
): Promise<Post | null> {
  const [rows, labels] = await Promise.all([
    load({ kind: "POST", urlPrefix: category, slug }, "sortOrder", [
      CMS_TAG.posts,
      CMS_TAG.post(slug),
    ]),
    categoryLabels(),
  ]);
  return rows.length ? toPost(rows[0], labels) : null;
}

// ── Static params ─────────────────────────────────────────────────────────

/**
 * Slugs for `generateStaticParams`, read straight from the table.
 *
 * Deliberately does not go through `load`: `generateStaticParams` runs at
 * build time where there is no request, and reading `draftMode()` there would
 * be both meaningless and a way to prerender a draft.
 *
 * A slug published after the build is absent from this list and renders on
 * demand instead, then caches — which is what lets a new post go live without
 * a redeploy.
 */
export async function publishedParams(
  kind: "SERVICE" | "POST",
  urlPrefix?: string,
): Promise<{ slug: string; urlPrefix: string }[]> {
  return prisma.contentDoc.findMany({
    where: {
      kind,
      ...(urlPrefix ? { urlPrefix } : {}),
      status: "PUBLISHED",
      publishedVersion: { not: null },
    },
    select: { slug: true, urlPrefix: true },
    orderBy: { sortOrder: "asc" },
  });
}
