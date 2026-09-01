"use server";

/**
 * Every mutation the CMS makes.
 *
 * Same three rules as `lib/admin/actions.ts` and for the same reasons: each
 * action re-checks the session **and** the permission, everything is
 * Zod-validated because it arrives from a browser rather than from the form,
 * and every change writes an `AuditLog` row. A server action is a public HTTP
 * endpoint; the editor rendering only for people who may use it is not
 * authorisation.
 *
 * The editor posts a typed object rather than `FormData`. A body of forty
 * nested blocks has no honest `FormData` encoding, and there is no
 * no-JavaScript version of a block editor to preserve.
 */
import { revalidatePath } from "next/cache";

import { actingAdmin, currentAdmin } from "@/lib/admin/auth";
import { loadEditorDoc, slugTaken } from "@/lib/cms/admin";
import { getCategory } from "@/lib/cms/category-store";
import {
  contentPayloadSchema,
  issueMap,
  newDocSchema,
} from "@/lib/cms/content-schema";
import {
  createDoc,
  deleteDoc,
  publishDoc,
  restoreRevision,
  saveDraft,
  unpublishDoc,
  updateDocSettings,
  type ContentInput,
} from "@/lib/cms/write";
import { prisma } from "@/lib/db";

export type CmsResult = {
  ok: boolean;
  message: string | null;
  fields?: Record<string, string>;
  /** Set by `createContent`, so the caller can navigate to the new editor. */
  docId?: string;
};

const NO_SESSION: CmsResult = {
  ok: false,
  message: "Your session has expired. Sign in again to save.",
};

const NOT_ALLOWED: CmsResult = {
  ok: false,
  message: "Your account does not include this. Ask a super admin for access.",
};

async function refusal(): Promise<CmsResult> {
  return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;
}

function failed(message: string, fields?: Record<string, string>): CmsResult {
  return { ok: false, message, fields };
}

function reason(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Nothing was saved.";
}

async function audit(input: {
  actor: string;
  action: string;
  entityId: string;
  meta?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: "ContentDoc",
      entityId: input.entityId,
      meta: input.meta ?? {},
    },
  });
}

function revalidatePanel(kind: "SERVICE" | "POST"): void {
  revalidatePath("/admin");
  revalidatePath(kind === "SERVICE" ? "/admin/treatments" : "/admin/blog");
}

// ── Saving ────────────────────────────────────────────────────────────────

/**
 * Saves a draft, and optionally publishes it in the same call.
 *
 * One action rather than two so "publish" cannot publish the *previous* draft:
 * a separate save-then-publish is two round trips, and a failure between them
 * puts the older version live while the editor shows the newer one.
 */
export async function saveContent(
  payload: unknown,
  publish = false,
): Promise<CmsResult> {
  const admin = await actingAdmin("content.update");
  if (!admin) return refusal();

  if (publish && !(await actingAdmin("content.publish"))) {
    return failed(
      "Your account can edit but not publish. Save it as a draft and ask " +
        "someone who can publish to review it.",
    );
  }

  const parsed = contentPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return failed("Some fields need attention.", issueMap(parsed.error));
  }

  const input = parsed.data;

  const doc = await loadEditorDoc(input.docId);
  if (!doc) return failed("That page no longer exists.");

  /* Treatments are served from `/uluwatu-bali/` and looked up there and
     nowhere else, so their prefix is not the editor's to change — a treatment
     on another one would exist in the database and 404 on the site. For a post
     the prefix *is* its category, and moving between the two is a real thing
     to want. */
  const urlPrefix = doc.kind === "SERVICE" ? "uluwatu-bali" : input.urlPrefix;

  /* Categories are rows, so the prefix arriving from the browser has to be
     checked against the table rather than against a list compiled into this
     build. A post filed under a category that does not exist would answer 404
     at its own address — `app/(main)/[category]/` refuses an unknown one. */
  if (!(await getCategory(urlPrefix))) {
    return failed(`There is no “${urlPrefix}” category.`, {
      urlPrefix: "Unknown category",
    });
  }

  const moved = input.slug !== doc.slug || urlPrefix !== doc.urlPrefix;

  /* Moving a published page throws away an indexed URL — the same loss whether
     the last segment changed or the category did — so it is a publishing
     decision rather than an editing one. */
  if (moved) {
    if (doc.status === "PUBLISHED" && !(await actingAdmin("content.publish"))) {
      return failed(
        "This page is live, so changing its web address needs publish " +
          "permission — the old address stops working.",
        {
          slug: input.slug !== doc.slug ? "Needs publish permission" : "",
          urlPrefix:
            urlPrefix !== doc.urlPrefix ? "Needs publish permission" : "",
        },
      );
    }

    /* Checked against the *destination*. Moving a post into `uluwatu-bali`
       puts it in the same namespace as every treatment, and that is exactly
       where a collision would make one of the two unreachable. */
    if (await slugTaken(urlPrefix, input.slug, doc.id)) {
      return failed(
        urlPrefix !== doc.urlPrefix
          ? `A page at /${urlPrefix}/${input.slug}/ already exists, so this one cannot move there.`
          : "Another page already uses that web address.",
        { slug: "Already in use" },
      );
    }
  }

  const canonicalPath = `/${urlPrefix}/${input.slug}/`;

  const content: ContentInput = {
    title: input.title,
    excerpt: input.excerpt,
    image: input.image,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    bannerImage: input.bannerImage,
    body: input.body,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoOgImage: input.seoOgImage,
    /* Derived, never taken from the form. A canonical tag pointing anywhere
       other than the page's own URL tells Google to index something else. */
    canonicalPath,
    tiers: input.tiers,
    durationLabel: input.durationLabel,
    displayDate: input.displayDate,
  };

  try {
    if (moved) {
      /* Before the revision, so the revalidation inside `updateDocSettings`
         covers both the address being left and the one being taken. */
      await updateDocSettings(
        doc.id,
        { slug: input.slug, urlPrefix },
        admin.id,
      );
    }

    const version = await saveDraft(doc.id, content, admin.id);

    if (publish) await publishDoc(doc.id, admin.id);

    await audit({
      actor: admin.email,
      action: publish ? "content.publish" : "content.save",
      entityId: doc.id,
      meta: {
        slug: input.slug,
        urlPrefix,
        version,
        kind: doc.kind,
        /* Recorded because "why does that old link 404?" is a question asked
           weeks later about somebody else's change. */
        movedFrom: moved ? `/${doc.urlPrefix}/${doc.slug}/` : null,
      },
    });

    revalidatePanel(doc.kind);

    return {
      ok: true,
      message: publish
        ? `Published. The page is live at ${canonicalPath}`
        : `Saved as draft (version ${version}). The live page is unchanged.`,
    };
  } catch (error) {
    return failed(reason(error));
  }
}

// ── Publishing ────────────────────────────────────────────────────────────

export async function publishContent(docId: string): Promise<CmsResult> {
  const admin = await actingAdmin("content.publish");
  if (!admin) return refusal();

  const doc = await loadEditorDoc(docId);
  if (!doc) return failed("That page no longer exists.");

  try {
    await publishDoc(docId, admin.id);
    await audit({
      actor: admin.email,
      action: "content.publish",
      entityId: docId,
      meta: { slug: doc.slug, version: doc.version },
    });
    revalidatePanel(doc.kind);
    return { ok: true, message: `Published at /${doc.urlPrefix}/${doc.slug}/` };
  } catch (error) {
    return failed(reason(error));
  }
}

export async function unpublishContent(docId: string): Promise<CmsResult> {
  const admin = await actingAdmin("content.publish");
  if (!admin) return refusal();

  const doc = await loadEditorDoc(docId);
  if (!doc) return failed("That page no longer exists.");

  try {
    await unpublishDoc(docId, admin.id);
    await audit({
      actor: admin.email,
      action: "content.unpublish",
      entityId: docId,
      meta: { slug: doc.slug },
    });
    revalidatePanel(doc.kind);
    return {
      ok: true,
      /* Said plainly. Unpublishing is not "hiding" — the URL starts returning
         404 and leaves the sitemap, and if it was indexed that is a real loss
         of traffic somebody should have chosen deliberately. */
      message:
        `Unpublished. /${doc.urlPrefix}/${doc.slug}/ now returns "not found" ` +
        `and has been removed from the sitemap.`,
    };
  } catch (error) {
    return failed(reason(error));
  }
}

// ── Creating and deleting ─────────────────────────────────────────────────

export async function createContent(input: unknown): Promise<CmsResult> {
  const admin = await actingAdmin("content.create");
  if (!admin) return refusal();

  const parsed = newDocSchema.safeParse(input);
  if (!parsed.success) {
    return failed("Some fields need attention.", issueMap(parsed.error));
  }

  const { kind, title, slug, urlPrefix } = parsed.data;

  /* Treatments are always served under /uluwatu-bali/, sharing that namespace
     with the posts in it. */
  const prefix = kind === "SERVICE" ? "uluwatu-bali" : urlPrefix;

  if (!(await getCategory(prefix))) {
    return failed(`There is no “${prefix}” category.`, {
      urlPrefix: "Unknown category",
    });
  }

  if (await slugTaken(prefix, slug)) {
    return failed("Another page already uses that web address.", {
      slug: "Already in use",
    });
  }

  try {
    const docId = await createDoc(
      { kind, slug, urlPrefix: prefix },
      {
        title,
        excerpt: "",
        image: null,
        imageWidth: null,
        imageHeight: null,
        bannerImage: null,
        body: [{ type: "paragraph", text: "Start writing here." }],
        seoTitle: title,
        seoDescription: "",
        seoOgImage: null,
        canonicalPath: `/${prefix}/${slug}/`,
        tiers: kind === "SERVICE" ? [] : null,
        durationLabel: null,
        displayDate:
          kind === "POST"
            ? new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : null,
      },
      admin.id,
    );

    await audit({
      actor: admin.email,
      action: "content.create",
      entityId: docId,
      meta: { kind, slug, urlPrefix: prefix },
    });

    revalidatePanel(kind);

    return {
      ok: true,
      docId,
      message: "Created as a draft. Nothing is live until you publish it.",
    };
  } catch (error) {
    return failed(reason(error));
  }
}

export async function deleteContent(docId: string): Promise<CmsResult> {
  const admin = await actingAdmin("content.delete");
  if (!admin) return refusal();

  const doc = await loadEditorDoc(docId);
  if (!doc) return failed("That page no longer exists.");

  /* Deleting something that is live removes a URL from the internet. Taking it
     down first is a separate, reversible decision, and making it a required
     one means nobody removes an indexed page in a single click. */
  if (doc.status === "PUBLISHED") {
    return failed(
      "This page is live. Unpublish it first — deleting it outright would " +
        "remove a web address that search engines have indexed.",
    );
  }

  try {
    await deleteDoc(docId);
    await audit({
      actor: admin.email,
      action: "content.delete",
      entityId: docId,
      meta: { slug: doc.slug, kind: doc.kind },
    });
    revalidatePanel(doc.kind);
    return { ok: true, message: `“${doc.title}” has been deleted.` };
  } catch (error) {
    return failed(reason(error));
  }
}

// ── History and ordering ──────────────────────────────────────────────────

export async function restoreContentRevision(
  docId: string,
  version: number,
): Promise<CmsResult> {
  const admin = await actingAdmin("content.update");
  if (!admin) return refusal();

  const doc = await loadEditorDoc(docId);
  if (!doc) return failed("That page no longer exists.");

  try {
    const created = await restoreRevision(docId, version, admin.id);
    await audit({
      actor: admin.email,
      action: "content.restore",
      entityId: docId,
      meta: { from: version, to: created },
    });
    revalidatePanel(doc.kind);
    return {
      ok: true,
      message: `Version ${version} is now the draft (saved as version ${created}). The live page is unchanged until you publish.`,
    };
  } catch (error) {
    return failed(reason(error));
  }
}

/** Moves a document up or down its list. */
export async function reorderContent(
  docId: string,
  direction: "up" | "down",
  list: "reading" | "grid",
): Promise<CmsResult> {
  const admin = await actingAdmin("content.update");
  if (!admin) return refusal();

  const doc = await prisma.contentDoc.findUnique({
    where: { id: docId },
    select: { id: true, kind: true, sortOrder: true, gridOrder: true },
  });

  if (!doc) return failed("That page no longer exists.");

  const field = list === "grid" ? "gridOrder" : "sortOrder";
  const current = list === "grid" ? doc.gridOrder : doc.sortOrder;

  if (current === null) {
    return failed("This page is not on that list.");
  }

  /* The immediate neighbour in the chosen direction, whatever its number is —
     the columns are not guaranteed contiguous, so ±1 would sometimes swap with
     nothing. */
  const neighbour = await prisma.contentDoc.findFirst({
    where: {
      kind: doc.kind,
      id: { not: docId },
      [field]:
        direction === "up" ? { lt: current, not: null } : { gt: current, not: null },
    },
    select: { id: true, sortOrder: true, gridOrder: true },
    orderBy: { [field]: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbour) return { ok: true, message: null };

  const neighbourValue =
    list === "grid" ? neighbour.gridOrder : neighbour.sortOrder;

  try {
    await prisma.$transaction([
      prisma.contentDoc.update({
        where: { id: docId },
        data: { [field]: neighbourValue },
      }),
      prisma.contentDoc.update({
        where: { id: neighbour.id },
        data: { [field]: current },
      }),
    ]);

    await updateDocSettings(docId, {}, admin.id);

    revalidatePanel(doc.kind);
    return { ok: true, message: "Order updated." };
  } catch (error) {
    return failed(reason(error));
  }
}
