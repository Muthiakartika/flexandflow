import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
import { DeleteAdminButton } from "@/components/admin/DeleteAdminButton";
import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { requirePermission } from "@/lib/admin/auth";
import { countActiveSuperAdmins, getAdmin } from "@/lib/admin/team";

export async function generateMetadata(
  props: PageProps<"/admin/team/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const member = await getAdmin(id);
  return { title: member ? member.name : "Admin" };
}

export default async function EditAdminPage(
  props: PageProps<"/admin/team/[id]">,
) {
  const admin = await requirePermission("admin.manage");
  const { id } = await props.params;

  const member = await getAdmin(id);
  /* A removed account is treated as gone here even though the list still shows
     it: there is nothing to edit on a row that cannot sign in and whose only
     remaining job is to keep a byline resolving. */
  if (!member || member.deletedAt) notFound();

  const isSelf = member.id === admin.id;
  const isLastSuperAdmin =
    member.role === "SUPER_ADMIN" &&
    member.active &&
    (await countActiveSuperAdmins()) <= 1;

  return (
    <>
      <PageHeading
        title={member.name}
        lede={member.email}
        actions={
          <PendingLink href="/admin/team/" className="admin-btn admin-btn-quiet">
            Back to admins
          </PendingLink>
        }
      />

      <Panel title="Details and permissions">
        <AdminUserForm
          member={member}
          isSelf={isSelf}
          isLastSuperAdmin={isLastSuperAdmin}
        />
      </Panel>

      <Panel
        title="Password"
        description={
          isSelf
            ? "Change your own password on your profile page, where the current one is asked for."
            : "Sets a new password without needing the old one."
        }
      >
        {isSelf ? (
          <PendingLink
            href="/admin/profile/"
            className="admin-btn admin-btn-quiet"
          >
            Go to my profile
          </PendingLink>
        ) : (
          <AdminPasswordForm adminId={member.id} name={member.name} />
        )}
      </Panel>

      <Panel
        title="Remove"
        description="Deactivating is usually what you want — it keeps the record and stops the login."
      >
        {isSelf ? (
          <p className="text-[13px] text-faint">
            You cannot delete your own account. Another super admin can.
          </p>
        ) : isLastSuperAdmin ? (
          <p className="text-[13px] text-faint">
            This is the only active super admin and cannot be removed. Promote
            someone else first.
          </p>
        ) : (
          <DeleteAdminButton adminId={member.id} name={member.name} />
        )}
      </Panel>
    </>
  );
}
