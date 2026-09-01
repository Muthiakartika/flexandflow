/**
 * Creating, saving, publishing and deleting content.
 *
 * Every save appends a revision; nothing is ever edited in place. The draft is
 * the highest version, the live page is whichever version `publishedVersion`
 * names, and publishing is a single integer moving. That is what makes "edit
 * without touching the live page" true rather than approximately true, and it
 * gives revision history for free.
 *
 * Revalidation is the other half. The public pages are prerendered and cached
 * by tag; a publish that does not invalidate them is a publish nobody sees.
 *
 * It uses `updateTag`, not `revalidateTag`. The difference matters here: with
 * `revalidateTag(tag, "max")` the next visitor is served the **stale** page
 * while a fresh one builds behind them, so the owner presses Publish, opens
 * the page, and sees the old text — and reasonably concludes it did not work.
 * `updateTag` expires immediately and the next request waits for the new
 * version, which is the read-your-own-writes behaviour a CMS needs.
 *
 * The cost is that `updateTag` may only be called from a Server Action. Every
 * function below is reached through `lib/cms/actions.ts`, which is one. If any
 * of this is ever called from a Route Handler or a cron job it will throw, and
 * the fix is `revalidateTag(tag, "max")` on that path — not moving this.
 */
import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { parseBlocks } from "@/lib/cms/blocks";
import { CMS_TAG } from "@/lib/cms/read";
import { prisma } from "@/lib/db";
import type { ContentBlock } from "@/types";

export type ContentInput = {
  title: string;
  excerpt: string;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  bannerImage: string | null;
  body: ContentBlock[];
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string | null;
  canonicalPath: string;
  tiers: unknown;
  durationLabel: string | null;
  displayDate: string | null;
};

export type DocIdentity = {
  kind: "SERVICE" | "POST";
  slug: string;
  urlPrefix: string;
};

/**
 * Everything a change to one document can affect.
 *
 * Broad on purpose. A treatment's title appears on the home grid, the services
 * grid, the price list, the sitemap and the "other treatments" list of every
 * *other* treatment page — so revalidating only its own URL leaves five places
 * showing the old one. Being generous here costs a few regenerations; being
 * precise and wrong costs a stale price on the home page.
 */
function revalidateFor(doc: DocIdentity): void {
  if (doc.kind === "SERVICE") {
    updateTag(CMS_TAG.services);
    updateTag(CMS_TAG.service(doc.slug));
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/price-list");
    /* Every other treatment page carries this one in its sidebar. */
    revalidatePath("/uluwatu-bali/[slug]", "page");
  } else {
    updateTag(CMS_TAG.posts);
    updateTag(CMS_TAG.post(doc.slug));
    revalidatePath("/blog");
    revalidatePath("/blog/page/[page]", "page");
    revalidatePath(`/${doc.urlPrefix}`);
    revalidatePath(`/${doc.urlPrefix}/[slug]`, "page");
  }

  revalidatePath(`/${doc.urlPrefix}/${doc.slug}`);
  /* Publishing adds a URL and unpublishing removes one. */
  revalidatePath("/sitemap.xml");
}

async function identity(docId: string): Promise<DocIdentity | null> {
  return prisma.contentDoc.findUnique({
    where: { id: docId },
    select: { kind: true, slug: true, urlPrefix: true },
  });
}

/** The next version number for a document. */
async function nextVersion(docId: string): Promise<number> {
  const latest = await prisma.contentRevision.findFirst({
    where: { docId },
    select: { version: true },
    orderBy: { version: "desc" },
  });
  return (latest?.version ?? 0) + 1;
}

function revisionData(input: ContentInput, version: number, authorId: string) {
  return {
    version,
    authorId,
    title: input.title,
    excerpt: input.excerpt,
    image: input.image,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    bannerImage: input.bannerImage,
    /* Validated here rather than trusted from the form. The body arrives as
       JSON from a browser, and a malformed block reaching the renderer breaks
       a page for everyone, not just for the person who saved it. */
    body: parseBlocks(input.body) as never,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoOgImage: input.seoOgImage,
    canonicalPath: input.canonicalPath,
    tiers: (input.tiers ?? undefined) as never,
    durationLabel: input.durationLabel,
    displayDate: input.displayDate,
  };
}

// ── Create ────────────────────────────────────────────────────────────────

export async function createDoc(
  doc: DocIdentity & { sortOrder?: number; gridOrder?: number | null },
  input: ContentInput,
  authorId: string,
): Promise<string> {
  /* Appended to the end of its kind, so a new page does not silently jump to
     the top of the services grid or the blog listing. */
  const last = await prisma.contentDoc.findFirst({
    where: { kind: doc.kind },
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const created = await prisma.contentDoc.create({
    data: {
      kind: doc.kind,
      slug: doc.slug,
      urlPrefix: doc.urlPrefix,
      sortOrder: doc.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      gridOrder: doc.gridOrder ?? null,
      /* Created as a draft, always. A page that went live the moment somebody
         pressed "new" would put an empty article on the domain. */
      status: "DRAFT",
      createdById: authorId,
      updatedById: authorId,
      revisions: { create: revisionData(input, 1, authorId) },
    },
    select: { id: true },
  });

  return created.id;
}

// ── Save ──────────────────────────────────────────────────────────────────

/**
 * Appends a revision. The live page is untouched until someone publishes.
 *
 * Wrapped in a transaction with the version lookup: two tabs saving at once
 * would otherwise both compute the same next version and collide on
 * `@@unique([docId, version])`.
 */
export async function saveDraft(
  docId: string,
  input: ContentInput,
  authorId: string,
): Promise<number> {
  const version = await prisma.$transaction(async (tx) => {
    const latest = await tx.contentRevision.findFirst({
      where: { docId },
      select: { version: true },
      orderBy: { version: "desc" },
    });

    const next = (latest?.version ?? 0) + 1;

    await tx.contentRevision.create({
      data: { docId, ...revisionData(input, next, authorId) },
    });

    await tx.contentDoc.update({
      where: { id: docId },
      data: { updatedById: authorId },
    });

    return next;
  });

  /* A draft changes nothing public — except in preview, which bypasses the
     cache on its own. So no revalidation here, deliberately. */
  return version;
}

// ── Publish ───────────────────────────────────────────────────────────────

export async function publishDoc(
  docId: string,
  authorId: string,
): Promise<void> {
  const doc = await identity(docId);
  if (!doc) throw new Error("That page no longer exists.");

  const version = (await nextVersion(docId)) - 1;
  if (version < 1) throw new Error("There is nothing saved to publish.");

  await prisma.contentDoc.update({
    where: { id: docId },
    data: {
      status: "PUBLISHED",
      publishedVersion: version,
      publishedAt: new Date(),
      updatedById: authorId,
    },
  });

  revalidateFor(doc);
}

export async function unpublishDoc(
  docId: string,
  authorId: string,
): Promise<void> {
  const doc = await identity(docId);
  if (!doc) throw new Error("That page no longer exists.");

  await prisma.contentDoc.update({
    where: { id: docId },
    data: {
      status: "DRAFT",
      /* Cleared, not kept. `joinPublished` filters on it, so this is what makes
         the URL 404 and drops it out of the sitemap — leaving it set would
         leave the page live with a "draft" label in the panel. */
      publishedVersion: null,
      updatedById: authorId,
    },
  });

  revalidateFor(doc);
}

// ── Settings and deletion ─────────────────────────────────────────────────

export async function updateDocSettings(
  docId: string,
  settings: {
    slug?: string;
    urlPrefix?: string;
    sortOrder?: number;
    gridOrder?: number | null;
  },
  authorId: string,
): Promise<void> {
  const before = await identity(docId);
  if (!before) throw new Error("That page no longer exists.");

  await prisma.contentDoc.update({
    where: { id: docId },
    data: { ...settings, updatedById: authorId },
  });

  /* Both the old and the new address: moving a page leaves the previous URL
     cached and still serving, which is worse than a 404 because it looks like
     the move silently failed. */
  revalidateFor(before);
  const after = await identity(docId);
  if (after) revalidateFor(after);
}

export async function deleteDoc(docId: string): Promise<void> {
  const doc = await identity(docId);
  if (!doc) return;

  /* Revisions cascade. There is no soft delete for content: a page the studio
     removed should stop existing, and the revision history of something nobody
     can reach is not worth the row. */
  await prisma.contentDoc.delete({ where: { id: docId } });

  revalidateFor(doc);
}

/** Copies an old revision forward as a new draft. Never rewrites history. */
export async function restoreRevision(
  docId: string,
  version: number,
  authorId: string,
): Promise<number> {
  const source = await prisma.contentRevision.findUnique({
    where: { docId_version: { docId, version } },
  });

  if (!source) throw new Error("That version no longer exists.");

  return saveDraft(
    docId,
    {
      title: source.title,
      excerpt: source.excerpt,
      image: source.image,
      imageWidth: source.imageWidth,
      imageHeight: source.imageHeight,
      bannerImage: source.bannerImage,
      body: source.body as unknown as ContentBlock[],
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      seoOgImage: source.seoOgImage,
      canonicalPath: source.canonicalPath,
      tiers: source.tiers,
      durationLabel: source.durationLabel,
      displayDate: source.displayDate,
    },
    authorId,
  );
}
