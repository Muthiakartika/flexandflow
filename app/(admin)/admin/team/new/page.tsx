import type { Metadata } from "next";

import { AdminUserForm } from "@/components/admin/AdminUserForm";
import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Add admin",
};

export default async function NewAdminPage() {
  await requirePermission("admin.manage");

  return (
    <>
      <PageHeading
        title="Add admin"
        lede="They can sign in as soon as this is saved."
        actions={
          <PendingLink href="/admin/team/" className="admin-btn admin-btn-quiet">
            Back to admins
          </PendingLink>
        }
      />

      <Panel>
        <AdminUserForm />
      </Panel>
    </>
  );
}
