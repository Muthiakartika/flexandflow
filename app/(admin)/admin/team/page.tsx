import type { Metadata } from "next";
import Link from "next/link";

import { PendingLink } from "@/components/admin/PendingLink";
import {
  Empty,
  PageHeading,
  Panel,
  TableBox,
} from "@/components/admin/primitives";
import { requirePermission } from "@/lib/admin/auth";
import {
  PERMISSION_LABEL,
  ROLE_LABEL,
  type Permission,
} from "@/lib/admin/permissions";
import { countActiveSuperAdmins, listAdmins } from "@/lib/admin/team";

export const metadata: Metadata = {
  title: "Admins",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function StatusChip({
  active,
  deleted,
}: {
  active: boolean;
  deleted: boolean;
}) {
  if (deleted) {
    return <span className="admin-chip bg-cream text-muted">removed</span>;
  }
  return active ? (
    <span className="admin-chip bg-ok-soft text-ok">active</span>
  ) : (
    <span className="admin-chip bg-danger-soft text-danger">inactive</span>
  );
}

/**
 * Everyone who can sign in.
 *
 * Gated on `admin.manage` rather than on the role, like everything else in the
 * panel — an editor who has been granted that permission belongs here too.
 */
export default async function AdminTeamPage() {
  const admin = await requirePermission("admin.manage");

  const [members, superAdmins] = await Promise.all([
    listAdmins(),
    countActiveSuperAdmins(),
  ]);

  return (
    <>
      <PageHeading
        title="Admins"
        lede="Who can sign in, and what each of them may do."
        actions={
          <PendingLink href="/admin/team/new/" className="admin-btn admin-btn-solid">
            Add admin
          </PendingLink>
        }
      />

      {superAdmins <= 1 ? (
        /* Not an error — a fresh installation looks exactly like this. It is
           said out loud because the single point of failure is invisible
           otherwise, and it is only noticed on the day that account is lost. */
        <div className="admin-card mb-5 border-warn/40 bg-warn-soft p-4">
          <h2 className="text-[15px] font-bold text-warn">
            Only one super admin
          </h2>
          <p className="mt-1 text-[13px] text-ink">
            If that account is lost, nobody can add admins, publish content or
            change settings without a database console. Adding a second one now
            costs a minute.
          </p>
        </div>
      ) : null}

      <Panel>
        {members.length === 0 ? (
          <Empty>No admin accounts.</Empty>
        ) : (
          <TableBox>
            <table className="admin-table min-w-[46rem]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Extra permissions</th>
                  <th>Status</th>
                  <th>Last signed in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className={member.deletedAt ? "opacity-60" : ""}>
                    <td>
                      <span className="block font-bold text-ink">
                        {member.name}
                        {member.id === admin.id ? (
                          <span className="ml-2 text-[12px] font-normal text-faint">
                            you
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[12px] break-all text-faint">
                        {member.email}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">{ROLE_LABEL[member.role]}</td>

                    <td>
                      {member.role === "SUPER_ADMIN" ? (
                        <span className="text-[13px] text-faint">everything</span>
                      ) : member.extraPermissions.length === 0 ? (
                        <span className="text-[13px] text-faint">—</span>
                      ) : (
                        <span className="text-[13px] text-muted">
                          {member.extraPermissions
                            .map((p: Permission) => PERMISSION_LABEL[p])
                            .join(", ")}
                        </span>
                      )}
                    </td>

                    <td>
                      <StatusChip
                        active={member.active}
                        deleted={Boolean(member.deletedAt)}
                      />
                    </td>

                    <td className="whitespace-nowrap text-[13px] text-muted">
                      {member.lastLoginAt
                        ? dateFormat.format(member.lastLoginAt)
                        : "never"}
                    </td>

                    <td className="text-right whitespace-nowrap">
                      {member.deletedAt ? (
                        <span className="text-[13px] text-faint">—</span>
                      ) : (
                        <Link
                          href={`/admin/team/${member.id}/`}
                          className="text-[13px] font-bold text-olive-strong underline underline-offset-2"
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        )}
      </Panel>

      <p className="text-[13px] text-faint">
        Removed accounts stay listed when they wrote something, so the author of
        a published page still resolves. They cannot sign in.
      </p>
    </>
  );
}
