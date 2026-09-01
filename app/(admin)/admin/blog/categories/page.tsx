import type { Metadata } from "next";

import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { CategoryForm } from "@/components/cms/CategoryForm";
import { DeleteCategoryButton } from "@/components/cms/DeleteCategoryButton";
import { can, requirePermission } from "@/lib/admin/auth";
import { listCategoriesWithCounts } from "@/lib/cms/category-store";

export const metadata: Metadata = { title: "Categories" };

/**
 * Blog categories, which are URL prefixes.
 *
 * These were two route folders in the source until the studio needed a third.
 * `app/(main)/[category]/` serves them now, so adding one is a row rather than
 * a deploy — but a slug here is a public address, which is why every control
 * on this page says what it will do to the pages underneath it.
 */
export default async function CategoriesPage() {
  const admin = await requirePermission("content.view");
  const categories = await listCategoriesWithCounts();
  const mayEdit = can(admin, "content.publish");

  return (
    <>
      <PageHeading
        title="Blog categories"
        lede="A category is part of the web address of every post in it."
        actions={
          <PendingLink href="/admin/blog/" className="admin-btn admin-btn-quiet">
            Back to blog
          </PendingLink>
        }
      />

      {!mayEdit ? (
        <div className="admin-card mb-5 p-4">
          <p className="text-[13px] text-muted">
            Categories change public web addresses, so editing them needs
            publish permission. You can see them here.
          </p>
        </div>
      ) : null}

      {categories.map((category) => (
        <Panel
          key={category.id}
          title={category.label}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <code className="text-[12px]">/{category.slug}/</code>
              <span>
                {category.postCount} page{category.postCount === 1 ? "" : "s"}
              </span>
              {category.locked ? (
                <span className="admin-chip bg-cream text-muted">
                  treatments live here
                </span>
              ) : null}
            </span>
          }
        >
          {mayEdit ? (
            <>
              <CategoryForm category={category} />
              <div className="mt-4 flex justify-end border-t border-line pt-3">
                <DeleteCategoryButton
                  id={category.id}
                  label={category.label}
                  postCount={category.postCount}
                  locked={category.locked}
                />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">
              {category.lead ?? "No introduction set."}
            </p>
          )}
        </Panel>
      ))}

      {mayEdit ? (
        <Panel
          title="Add a category"
          description="It appears as soon as it is saved, with an empty archive until you file something in it."
        >
          <CategoryForm />
        </Panel>
      ) : null}

      <p className="text-[13px] text-faint">
        A category cannot use the address of an existing page —{" "}
        <code>services</code>, <code>blog</code>, <code>about-us</code> and the
        rest are refused, because a page always wins over a category and every
        post in it would answer &ldquo;not found&rdquo;.
      </p>
    </>
  );
}
