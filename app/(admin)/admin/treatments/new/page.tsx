import type { Metadata } from "next";

import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { NewContentForm } from "@/components/cms/NewContentForm";
import { requirePermission } from "@/lib/admin/auth";
import { listCategories } from "@/lib/cms/category-store";

export const metadata: Metadata = { title: "New treatment" };

export default async function NewTreatmentPage() {
  await requirePermission("content.create");
  const categories = await listCategories();

  return (
    <>
      <PageHeading
        title="New treatment"
        lede="Created as a draft. Nothing appears on the website until you publish it."
        actions={
          <PendingLink href="/admin/treatments/" className="admin-btn admin-btn-quiet">
            Back to treatments
          </PendingLink>
        }
      />
      <Panel>
        <NewContentForm categories={categories} kind="SERVICE" />
      </Panel>
    </>
  );
}
