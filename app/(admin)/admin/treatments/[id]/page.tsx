import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading } from "@/components/admin/primitives";
import { ContentEditor } from "@/components/cms/ContentEditor";
import { RevisionList } from "@/components/cms/RevisionList";
import { can, requirePermission } from "@/lib/admin/auth";
import { listRevisions, loadEditorDoc } from "@/lib/cms/admin";
import { listCategories } from "@/lib/cms/category-store";

export async function generateMetadata(
  props: PageProps<"/admin/treatments/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const doc = await loadEditorDoc(id);
  return { title: doc ? doc.title : "Treatments" };
}

export default async function EditPage(props: PageProps<"/admin/treatments/[id]">) {
  const admin = await requirePermission("content.update");
  const { id } = await props.params;

  const doc = await loadEditorDoc(id);
  /* Wrong kind on the right id: the two editors are separate URLs and a
     treatment opened under /admin/blog/ would show a date field and no rates. */
  if (!doc || doc.kind !== "SERVICE") notFound();

  const [revisions, categories] = await Promise.all([
    listRevisions(id),
    listCategories(),
  ]);

  return (
    <>
      <PageHeading
        title={doc.title}
        lede={`/${doc.urlPrefix}/${doc.slug}/`}
        actions={
          <PendingLink href="/admin/treatments/" className="admin-btn admin-btn-quiet">
            Back to treatments
          </PendingLink>
        }
      />

      <ContentEditor
        doc={doc}
        categories={categories}
        canPublish={can(admin, "content.publish")}
        canDelete={can(admin, "content.delete")}
      />

      <RevisionList docId={doc.id} revisions={revisions} />
    </>
  );
}
