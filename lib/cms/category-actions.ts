"use server";

/**
 * Creating, renaming and removing blog categories.
 *
 * A category is a URL prefix, so every one of these changes addresses that may
 * already be indexed. The guards below are not ceremony — each one prevents a
 * specific way to take pages off the internet by editing a name.
 */
import { revalidatePath, updateTag } from "next/cache";

import { actingAdmin, currentAdmin } from "@/lib/admin/auth";
import { slugProblem } from "@/lib/cms/categories";
import { CATEGORY_TAG, categoryUsage } from "@/lib/cms/category-store";
import { purgeEdgeEverything } from "@/lib/cms/purge";
import { ARTICLE_ROUTE, CMS_TAG } from "@/lib/cms/read";
import { prisma } from "@/lib/db";
import type { CmsResult } from "@/lib/cms/actions";

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

async function audit(
  actor: string,
  action: string,
  entityId: string,
  meta: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  await prisma.auditLog.create({
    data: { actor, action, entity: "ContentCategory", entityId, meta },
  });
}

/**
 * Everything a category change touches.
 *
 * Wide, because a category slug is in the URL of every post it holds, in the
 * breadcrumb of each of those pages, in the blog sidebar on every article, and
 * in the sitemap. Being generous costs a few regenerations; being precise and
 * wrong leaves the old name showing on pages nobody thought to look at.
 */
function revalidateCategories(slugs: string[]): void {
  updateTag(CATEGORY_TAG);
  updateTag(CMS_TAG.posts);

  for (const slug of slugs) {
    revalidatePath(`/${slug}`);
  }
  /* Once, not per slug: there is a single `[category]/[slug]` page file and it
     renders all of them, so repeating it would just repeat the same call. */
  revalidatePath(ARTICLE_ROUTE, "page");

  revalidatePath("/blog");
  revalidatePath("/blog/page/[page]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog");

  /* And the CDN, after Next — a rename leaves the edge holding every post at
     its old address, which is the one address the database no longer has. */
  purgeEdgeEverything(`category change: ${slugs.join(", ")}`);
}

type CategoryInput = {
  slug: string;
  label: string;
  lead: string;
  seoTitle: string;
  seoDescription: string;
};

function read(form: FormData): CategoryInput {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    slug: text("slug").toLowerCase(),
    label: text("label"),
    lead: text("lead"),
    seoTitle: text("seoTitle"),
    seoDescription: text("seoDescription"),
  };
}

function validate(input: CategoryInput): Record<string, string> | null {
  const fields: Record<string, string> = {};

  const slug = slugProblem(input.slug);
  if (slug) fields.slug = slug;

  if (!input.label) fields.label = "Give the category a name.";
  if (input.label.length > 80) fields.label = "That name is too long.";
  if (!input.seoTitle) fields.seoTitle = "Give the archive page an SEO title.";

  return Object.keys(fields).length ? fields : null;
}

export async function createCategoryAction(
  _previous: CmsResult,
  form: FormData,
): Promise<CmsResult> {
  const admin = await actingAdmin("content.publish");
  if (!admin) return refusal();

  const input = read(form);
  const problems = validate(input);
  if (problems) return failed("Check the fields below.", problems);

  const existing = await prisma.contentCategory.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existing) {
    return failed("A category already uses that web address.", {
      slug: "Already in use",
    });
  }

  const last = await prisma.contentCategory.findFirst({
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const created = await prisma.contentCategory.create({
    data: {
      slug: input.slug,
      label: input.label,
      lead: input.lead || null,
      seoTitle: input.seoTitle,
      /* Null rather than empty. The injury-guide archive emits no description
         at all, matching WordPress, and an empty string is a different thing
         from an absent one in a meta tag. */
      seoDescription: input.seoDescription || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true, slug: true },
  });

  await audit(admin.email, "category.create", created.id, { slug: created.slug });
  revalidateCategories([created.slug]);

  return {
    ok: true,
    message: `“${input.label}” is ready at /${created.slug}/. It has no posts yet, so the archive is empty.`,
  };
}

export async function updateCategoryAction(
  _previous: CmsResult,
  form: FormData,
): Promise<CmsResult> {
  const admin = await actingAdmin("content.publish");
  if (!admin) return refusal();

  const id = String(form.get("id") ?? "");
  const input = read(form);

  const before = await prisma.contentCategory.findUnique({ where: { id } });
  if (!before) return failed("That category no longer exists.");

  const renaming = input.slug !== before.slug;

  /* The treatments' home. Renaming it would move all nine treatment pages at
     once, and `lib/cms/read.ts` looks them up under the literal string
     `uluwatu-bali` — so they would not move, they would simply stop existing. */
  if (before.locked && renaming) {
    return failed(
      `The web address of “${before.label}” cannot change: every treatment page is served from /${before.slug}/. You can still rename how it is displayed.`,
      { slug: "Fixed" },
    );
  }

  const problems = validate(input);
  if (problems) return failed("Check the fields below.", problems);

  if (renaming) {
    const clash = await prisma.contentCategory.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (clash && clash.id !== id) {
      return failed("Another category already uses that web address.", {
        slug: "Already in use",
      });
    }
  }

  const count = await categoryUsage(before.slug);

  try {
    /* One transaction. Renaming a category has to move its documents with it,
       and a half-applied rename would leave every post in it pointing at an
       address that no longer resolves. */
    await prisma.$transaction([
      prisma.contentCategory.update({
        where: { id },
        data: {
          slug: input.slug,
          label: input.label,
          lead: input.lead || null,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription || null,
        },
      }),
      ...(renaming
        ? [
            prisma.contentDoc.updateMany({
              where: { urlPrefix: before.slug },
              data: { urlPrefix: input.slug },
            }),
            /* The canonical tag is stored per revision and would otherwise
               keep pointing at the old address — telling Google to index a URL
               that now 404s. */
            prisma.$executeRaw`
              UPDATE "ContentRevision"
              SET "canonicalPath" = REPLACE("canonicalPath", ${`/${before.slug}/`}, ${`/${input.slug}/`})
              WHERE "docId" IN (
                SELECT "id" FROM "ContentDoc" WHERE "urlPrefix" = ${input.slug}
              )
            `,
          ]
        : []),
    ]);
  } catch (error) {
    return failed(
      error instanceof Error ? error.message : "Nothing was changed.",
    );
  }

  await audit(admin.email, "category.update", id, {
    slug: input.slug,
    renamedFrom: renaming ? before.slug : null,
    movedDocuments: renaming ? count : 0,
  });

  revalidateCategories([before.slug, input.slug]);

  return {
    ok: true,
    message: renaming
      ? `Renamed. ${count} page${count === 1 ? "" : "s"} moved to /${input.slug}/, and the old addresses now return “not found”.`
      : `“${input.label}” updated.`,
  };
}

export async function deleteCategoryAction(
  _previous: CmsResult,
  form: FormData,
): Promise<CmsResult> {
  const admin = await actingAdmin("content.publish");
  if (!admin) return refusal();

  const id = String(form.get("id") ?? "");

  const category = await prisma.contentCategory.findUnique({ where: { id } });
  if (!category) return failed("That category no longer exists.");

  if (category.locked) {
    return failed(
      `“${category.label}” cannot be removed: every treatment page is served from /${category.slug}/.`,
    );
  }

  const count = await categoryUsage(category.slug);

  /* Refused rather than cascaded. Deleting the category would leave its posts
     at an address that no longer resolves — the pages would still be in the
     database, invisible, and nobody would know why they had gone. */
  if (count > 0) {
    return failed(
      `“${category.label}” still holds ${count} page${count === 1 ? "" : "s"}. Move them to another category first — deleting it would leave them at an address that no longer works.`,
    );
  }

  await prisma.contentCategory.delete({ where: { id } });
  await audit(admin.email, "category.delete", id, { slug: category.slug });
  revalidateCategories([category.slug]);

  return { ok: true, message: `“${category.label}” has been removed.` };
}
