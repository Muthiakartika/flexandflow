import type { Metadata } from "next";

import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { NewContentForm } from "@/components/cms/NewContentForm";
import { requirePermission } from "@/lib/admin/auth";
import { listCategories } from "@/lib/cms/category-store";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requirePermission("content.create");
  const categories = await listCategories();

  return (
    <>
      <PageHeading
        title="New blog post"
        lede="Created as a draft. Nothing appears on the website until you publish it."
        actions={
          <PendingLink href="/admin/blog/" className="admin-btn admin-btn-quiet">
            Back to blog
          </PendingLink>
        }
      />
      <Panel>
        <NewContentForm categories={categories} kind="POST" />
      </Panel>
    </>
  );
}
