/**
 * Turning database rows into the `Service` and `Post` shapes the site renders.
 *
 * Split out of `lib/cms/read.ts` so it is reachable without `server-only`.
 * That is not tidiness: `scripts/cms-import.ts` verifies the import by reading
 * every document back through *this exact function* and comparing it to the
 * source module, and a check that used its own copy of the mapping would prove
 * nothing about the mapping the site actually uses.
 */
import { readBlocks } from "@/lib/cms/blocks";
import type { ContentBlock, Post, Service, Seo, TherapistTier } from "@/types";

export type PostCategory = string;

export type DocRow = {
  id: string;
  slug: string;
  urlPrefix: string;
  sortOrder: number;
  gridOrder: number | null;
  /** Read for a post's "updated" date. Optional so callers that build a row
   *  by hand (the import check) need not invent them. */
  publishedVersion?: number | null;
  /** A `Date` from Prisma, an ISO string once it has been through the cache. */
  publishedAt?: Date | string | null;
};

export type RevisionRow = {
  title: string;
  excerpt: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  bannerImage: string | null;
  body: unknown;
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string | null;
  canonicalPath: string;
  seoNoindex: boolean;
  seoNofollow: boolean;
  tiers: unknown;
  durationLabel: string | null;
  displayDate: string | null;
  /** Present on rows from `lib/cms/query.ts`; see `updatedOf`. */
  version?: number;
};

export type Joined = { doc: DocRow; revision: RevisionRow };

/**
 * Slug → display name, passed in rather than looked up per post.
 *
 * `toPost` is called once per row in a listing, and a query inside it would be
 * one round trip per post to read the same handful of categories. The caller
 * has them already.
 */
export type CategoryNames = Record<string, string>;

function seoOf(revision: RevisionRow): Seo {
  return {
    title: revision.seoTitle,
    description: revision.seoDescription,
    canonicalPath: revision.canonicalPath,
    ...(revision.seoOgImage ? { ogImage: revision.seoOgImage } : {}),
    ...(revision.seoNoindex ? { noindex: true } : {}),
    ...(revision.seoNofollow ? { nofollow: true } : {}),
  };
}

function bodyOf(revision: RevisionRow, context: string): ContentBlock[] {
  return readBlocks(revision.body, context);
}

/**
 * Tiers come back as JSON and are shaped rather than parsed strictly: an
 * unreadable tier must not take down a page that is otherwise fine, and the
 * figures are normalised downstream by `lib/pricing.ts`, which already handles
 * the `Rp`-prefixed and bare forms the ported data mixes.
 */
function tiersOf(value: unknown): TherapistTier[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const tier = raw as Record<string, unknown>;
    if (typeof tier.label !== "string" || typeof tier.price !== "string") {
      return [];
    }
    return [
      {
        label: tier.label,
        note: typeof tier.note === "string" ? tier.note : "",
        price: tier.price,
        ...(typeof tier.duration === "string" ? { duration: tier.duration } : {}),
      },
    ];
  });
}

/**
 * Optional fields are spread conditionally rather than set to `undefined`,
 * because the import's verification compares against the source objects with
 * `JSON.stringify` — and `{ image: undefined }` and `{}` serialise the same
 * but behave differently under a deep equality that walks keys. Matching the
 * source exactly keeps that check honest.
 */
export function toService({ doc, revision }: Joined): Service {
  return {
    slug: doc.slug,
    title: revision.title,
    excerpt: revision.excerpt,
    /* A service always has an image; the column is nullable only because posts
       share the table, and the import guarantees it is set. */
    image: revision.image ?? "",
    tiers: tiersOf(revision.tiers),
    seo: seoOf(revision),
    body: bodyOf(revision, `service ${doc.slug}`),
    ...(revision.durationLabel ? { duration: revision.durationLabel } : {}),
    ...(revision.bannerImage ? { bannerImage: revision.bannerImage } : {}),
  };
}

/** `2026-10-30`, on the studio's calendar (UTC+8) rather than the server's. */
const studioDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(date);

/**
 * The day the version being shown went live, when that is news.
 *
 * Version 1 of a ported post is the WordPress text, so a post nobody has
 * edited since the import has no "updated" date at all. A revision newer than
 * the published one is a draft in preview, which would go live today if
 * published — so that is the date preview shows.
 */
function updatedOf({ doc, revision }: Joined): string | undefined {
  const live = doc.publishedVersion ?? 0;

  let day: string | undefined;
  if (revision.version !== undefined && revision.version > live) {
    day = studioDay(new Date());
  } else if (live > 1 && doc.publishedAt) {
    day = studioDay(new Date(doc.publishedAt));
  }

  /* Edited the same day it was first published is not an update. */
  const published = revision.displayDate ? new Date(revision.displayDate) : null;
  if (day && published && !Number.isNaN(published.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const first = `${published.getFullYear()}-${pad(published.getMonth() + 1)}-${pad(published.getDate())}`;
    if (first >= day) return undefined;
  }

  return day;
}

export function toPost({ doc, revision }: Joined, labels: CategoryNames = {}): Post {
  const updated = updatedOf({ doc, revision });
  return {
    slug: doc.slug,
    category: doc.urlPrefix,
    /* Falls back to the slug rather than to a blank. A category deleted out
       from under a post leaves a breadcrumb reading "uluwatu-bali", which is
       ugly and self-explanatory — where an empty one is just a gap nobody can
       diagnose. Deleting a category that still holds posts is refused anyway. */
    categoryLabel: labels[doc.urlPrefix] ?? doc.urlPrefix,
    title: revision.title,
    excerpt: revision.excerpt,
    date: revision.displayDate ?? "",
    ...(updated ? { updated } : {}),
    seo: seoOf(revision),
    body: bodyOf(revision, `post ${doc.slug}`),
    ...(revision.image ? { image: revision.image } : {}),
    ...(revision.imageWidth ? { imageWidth: revision.imageWidth } : {}),
    ...(revision.imageHeight ? { imageHeight: revision.imageHeight } : {}),
  };
}

/** The columns `toService`/`toPost` read, for a Prisma `select`. */
export const REVISION_SELECT = {
  title: true,
  excerpt: true,
  image: true,
  imageWidth: true,
  imageHeight: true,
  bannerImage: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  seoOgImage: true,
  canonicalPath: true,
  seoNoindex: true,
  seoNofollow: true,
  tiers: true,
  durationLabel: true,
  displayDate: true,
} as const;

export const DOC_SELECT = {
  id: true,
  slug: true,
  urlPrefix: true,
  sortOrder: true,
  gridOrder: true,
  publishedVersion: true,
  publishedAt: true,
} as const;

/** A `Service` or `Post` turned back into the columns a revision stores. */
export function toRevisionData(
  entry: Service | Post,
): Omit<RevisionRow, "body"> & { body: ContentBlock[] } {
  const service = "tiers" in entry ? entry : null;
  const post = "date" in entry ? entry : null;

  return {
    title: entry.title,
    excerpt: entry.excerpt,
    image: entry.image ?? null,
    imageWidth: post?.imageWidth ?? null,
    imageHeight: post?.imageHeight ?? null,
    bannerImage: service?.bannerImage ?? null,
    body: entry.body,
    seoTitle: entry.seo.title,
    seoDescription: entry.seo.description,
    seoOgImage: entry.seo.ogImage ?? null,
    canonicalPath: entry.seo.canonicalPath,
    seoNoindex: entry.seo.noindex ?? false,
    seoNofollow: entry.seo.nofollow ?? false,
    tiers: service?.tiers ?? null,
    durationLabel: service?.duration ?? null,
    displayDate: post?.date ?? null,
  };
}
