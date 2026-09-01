/**
 * What the CMS screens read.
 *
 * Separate from `lib/cms/read.ts` because the two answer opposite questions.
 * That one serves the public site and only ever returns what is *published*;
 * this one serves the panel and deliberately shows drafts, unpublished pages
 * and revision history — the things the website must never render.
 */
import "server-only";

import { readBlocks } from "@/lib/cms/blocks";
import { prisma } from "@/lib/db";
import type { ContentBlock } from "@/types";

export type ContentKind = "SERVICE" | "POST";

export type DocRow = {
  id: string;
  kind: ContentKind;
  slug: string;
  urlPrefix: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  /** True when the draft is ahead of what the public site shows. */
  hasUnpublishedChanges: boolean;
  publishedVersion: number | null;
  latestVersion: number;
  sortOrder: number;
  gridOrder: number | null;
  updatedAt: Date;
  updatedBy: string | null;
};

/** The URL a document is served at, once published. */
export function publicPath(doc: { urlPrefix: string; slug: string }): string {
  return `/${doc.urlPrefix}/${doc.slug}/`;
}

/**
 * Every document of one kind, newest change first, with the title taken from
 * its **draft** revision — the panel lists what the editor last wrote, not
 * what the public sees, or a renamed page would keep its old name here until
 * somebody published it.
 */
export async function listDocs(
  kind: ContentKind,
  search?: string,
): Promise<DocRow[]> {
  const docs = await prisma.contentDoc.findMany({
    where: { kind },
    select: {
      id: true,
      kind: true,
      slug: true,
      urlPrefix: true,
      status: true,
      publishedVersion: true,
      sortOrder: true,
      gridOrder: true,
      updatedAt: true,
      updatedById: true,
      revisions: {
        select: { version: true, title: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: [{ sortOrder: "asc" }],
  });

  const authorIds = [
    ...new Set(docs.map((d) => d.updatedById).filter((id) => id !== null)),
  ];

  const authors = authorIds.length
    ? await prisma.adminUser.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true },
      })
    : [];

  const nameById = new Map(authors.map((a) => [a.id, a.name]));

  const rows: DocRow[] = docs.map((doc) => {
    const latest = doc.revisions[0];
    return {
      id: doc.id,
      kind: doc.kind,
      slug: doc.slug,
      urlPrefix: doc.urlPrefix,
      title: latest?.title ?? doc.slug,
      status: doc.status,
      publishedVersion: doc.publishedVersion,
      latestVersion: latest?.version ?? 0,
      hasUnpublishedChanges:
        doc.publishedVersion !== null &&
        (latest?.version ?? 0) > doc.publishedVersion,
      sortOrder: doc.sortOrder,
      gridOrder: doc.gridOrder,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedById ? (nameById.get(doc.updatedById) ?? null) : null,
    };
  });

  if (!search?.trim()) return rows;

  /* Matched in the database's own terms would need a text index for seventeen
     rows; filtering here is simpler and the result is the same. */
  const needle = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(needle) ||
      row.slug.toLowerCase().includes(needle),
  );
}

export type EditorDoc = {
  id: string;
  kind: ContentKind;
  slug: string;
  urlPrefix: string;
  status: "DRAFT" | "PUBLISHED";
  publishedVersion: number | null;
  publishedAt: Date | null;
  sortOrder: number;
  gridOrder: number | null;
  hasUnpublishedChanges: boolean;

  /* The draft — the highest revision, which is what the editor opens. */
  version: number;
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

export async function loadEditorDoc(docId: string): Promise<EditorDoc | null> {
  const doc = await prisma.contentDoc.findUnique({
    where: { id: docId },
    select: {
      id: true,
      kind: true,
      slug: true,
      urlPrefix: true,
      status: true,
      publishedVersion: true,
      publishedAt: true,
      sortOrder: true,
      gridOrder: true,
      revisions: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!doc || doc.revisions.length === 0) return null;

  const draft = doc.revisions[0];

  return {
    id: doc.id,
    kind: doc.kind,
    slug: doc.slug,
    urlPrefix: doc.urlPrefix,
    status: doc.status,
    publishedVersion: doc.publishedVersion,
    publishedAt: doc.publishedAt,
    sortOrder: doc.sortOrder,
    gridOrder: doc.gridOrder,
    hasUnpublishedChanges:
      doc.publishedVersion !== null && draft.version > doc.publishedVersion,

    version: draft.version,
    title: draft.title,
    excerpt: draft.excerpt,
    image: draft.image,
    imageWidth: draft.imageWidth,
    imageHeight: draft.imageHeight,
    bannerImage: draft.bannerImage,
    /* Tolerant on the way out: a body with one bad block must still open in the
       editor, or the only way to fix it would be the database. */
    body: readBlocks(draft.body, `draft ${doc.slug}`),
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    seoOgImage: draft.seoOgImage,
    canonicalPath: draft.canonicalPath,
    tiers: draft.tiers,
    durationLabel: draft.durationLabel,
    displayDate: draft.displayDate,
  };
}

export type RevisionSummary = {
  version: number;
  createdAt: Date;
  author: string | null;
  isPublished: boolean;
  isDraft: boolean;
};

export async function listRevisions(
  docId: string,
  limit = 20,
): Promise<RevisionSummary[]> {
  const doc = await prisma.contentDoc.findUnique({
    where: { id: docId },
    select: { publishedVersion: true },
  });

  const revisions = await prisma.contentRevision.findMany({
    where: { docId },
    select: { version: true, createdAt: true, authorId: true },
    orderBy: { version: "desc" },
    take: limit,
  });

  const authorIds = [
    ...new Set(revisions.map((r) => r.authorId).filter((id) => id !== null)),
  ];

  const authors = authorIds.length
    ? await prisma.adminUser.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true },
      })
    : [];

  const nameById = new Map(authors.map((a) => [a.id, a.name]));
  const newest = revisions[0]?.version ?? 0;

  return revisions.map((revision) => ({
    version: revision.version,
    createdAt: revision.createdAt,
    author: revision.authorId ? (nameById.get(revision.authorId) ?? null) : null,
    isPublished: revision.version === doc?.publishedVersion,
    isDraft: revision.version === newest,
  }));
}

/** Whether a slug is free, across both kinds under the same prefix. */
export async function slugTaken(
  urlPrefix: string,
  slug: string,
  exceptDocId?: string,
): Promise<boolean> {
  const existing = await prisma.contentDoc.findUnique({
    where: { urlPrefix_slug: { urlPrefix, slug } },
    select: { id: true },
  });

  return existing !== null && existing.id !== exceptDocId;
}

export type ContentStats = {
  treatments: { total: number; published: number; drafts: number };
  posts: { total: number; published: number; drafts: number };
  pendingChanges: number;
  recent: DocRow[];
};

/** The dashboard figures. */
export async function contentStats(): Promise<ContentStats> {
  const [treatments, posts] = await Promise.all([
    listDocs("SERVICE"),
    listDocs("POST"),
  ]);

  const count = (rows: DocRow[]) => ({
    total: rows.length,
    published: rows.filter((r) => r.status === "PUBLISHED").length,
    drafts: rows.filter((r) => r.status === "DRAFT").length,
  });

  const all = [...treatments, ...posts];

  return {
    treatments: count(treatments),
    posts: count(posts),
    /* Published pages whose draft has moved on — the ones somebody edited and
       did not publish. Easy to lose track of, and invisible on the site. */
    pendingChanges: all.filter((r) => r.hasUnpublishedChanges).length,
    recent: [...all]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 6),
  };
}
