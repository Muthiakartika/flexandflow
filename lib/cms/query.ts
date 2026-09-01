/**
 * The two content queries, as plain functions over a Prisma client.
 *
 * Separate from `lib/cms/read.ts` because that module is `server-only` — it
 * imports `next/headers` for draft mode — and the ops scripts have to run the
 * same queries outside Next. `scripts/check-prices.ts` in particular compares
 * what the site *publishes* against what the wizard charges, and it can only
 * do that honestly if it reads content the same way the site does.
 *
 * No caching and no draft-mode decision here; both belong to the caller.
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DOC_SELECT, REVISION_SELECT, type Joined } from "@/lib/cms/shape";

export type ContentWhere = {
  kind: "SERVICE" | "POST";
  urlPrefix?: string;
  slug?: string;
};

export type ContentOrder = "sortOrder" | "gridOrder";

/**
 * The generated client type, not `lib/db.ts`'s instance — that one is
 * `server-only`. The app passes its pooled singleton and the scripts pass a
 * client they built themselves; both are the same class.
 */
type Client = PrismaClient;

/* Annotated rather than inferred: bare object literals widen `"asc"` to
   `string`, which Prisma's `SortOrder` union rejects, and `as const` makes the
   array `readonly`, which its mutable parameter also rejects. */
function order(by: ContentOrder): Prisma.ContentDocOrderByWithRelationInput[] {
  return by === "gridOrder"
    ? [{ gridOrder: "asc" }, { sortOrder: "asc" }]
    : [{ sortOrder: "asc" }];
}

/**
 * Documents with the revision each one publishes, in two queries rather than
 * one per document.
 *
 * Prisma cannot correlate a nested `where` to the parent row — there is no way
 * to say "include the revision whose `version` equals this document's
 * `publishedVersion`" in a single `findMany`. So the documents come back
 * first, and their revisions in one second query keyed on the composite pairs.
 * Two round trips for a whole listing, not seventeen.
 */
export async function joinPublished(
  prisma: Client,
  where: ContentWhere,
  by: ContentOrder,
): Promise<Joined[]> {
  const docs = await prisma.contentDoc.findMany({
    where: {
      ...where,
      status: "PUBLISHED",
      publishedVersion: { not: null },
      ...(by === "gridOrder" ? { gridOrder: { not: null } } : {}),
    },
    select: DOC_SELECT,
    orderBy: order(by),
  });

  if (docs.length === 0) return [];

  const revisions = await prisma.contentRevision.findMany({
    where: {
      OR: docs.map((doc) => ({
        docId: doc.id,
        version: doc.publishedVersion as number,
      })),
    },
    /* `docId` is not in the shared select — that one lists the columns
       `toService`/`toPost` read. It is added because the join needs a key. */
    select: { ...REVISION_SELECT, docId: true },
  });

  const byDoc = new Map(revisions.map((r) => [r.docId, r]));

  /* A document whose published revision is missing is dropped rather than
     rendered half-empty. The pair is written in one transaction, so this can
     only happen if a row was deleted by hand. */
  return docs.flatMap((doc) => {
    const revision = byDoc.get(doc.id);
    return revision ? [{ doc, revision }] : [];
  });
}

/**
 * The same join taking each document's newest revision — the working draft,
 * published or not. Preview only; never reachable without the draft cookie.
 */
export async function joinDraft(
  prisma: Client,
  where: ContentWhere,
  by: ContentOrder,
): Promise<Joined[]> {
  const docs = await prisma.contentDoc.findMany({
    where: {
      ...where,
      ...(by === "gridOrder" ? { gridOrder: { not: null } } : {}),
    },
    select: DOC_SELECT,
    orderBy: order(by),
  });

  if (docs.length === 0) return [];

  const revisions = await prisma.contentRevision.findMany({
    where: { docId: { in: docs.map((d) => d.id) } },
    select: { ...REVISION_SELECT, docId: true },
    orderBy: { version: "desc" },
  });

  /* Newest first, so the first hit per document is its draft. */
  const byDoc = new Map<string, (typeof revisions)[number]>();
  for (const revision of revisions) {
    if (!byDoc.has(revision.docId)) byDoc.set(revision.docId, revision);
  }

  return docs.flatMap((doc) => {
    const revision = byDoc.get(doc.id);
    return revision ? [{ doc, revision }] : [];
  });
}
