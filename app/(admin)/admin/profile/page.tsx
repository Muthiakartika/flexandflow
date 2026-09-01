import type { Metadata } from "next";

import { PageHeading, Panel } from "@/components/admin/primitives";
import { OwnPasswordForm, OwnProfileForm } from "@/components/admin/ProfileForms";
import { requireAdmin } from "@/lib/admin/auth";
import {
  PERMISSION_LABEL,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
} from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "My profile",
};

/**
 * The signed-in admin's own account.
 *
 * `requireAdmin`, not `requirePermission`: everyone who can reach the panel can
 * change their own name and password. What they *cannot* do from here is
 * change their role or status — those fields are absent from the form and
 * ignored by the action.
 */
export default async function AdminProfilePage() {
  const admin = await requireAdmin();

  return (
    <>
      <PageHeading title="My profile" lede="Your own account details." />

      <Panel title="Details">
        <OwnProfileForm name={admin.name} email={admin.email} />
      </Panel>

      <Panel title="Password">
        <OwnPasswordForm />
      </Panel>

      <Panel
        title="What you can do"
        description="Set by a super admin. Shown here so it is clear why a section is missing from the sidebar."
      >
        <p className="text-[14px] font-bold text-ink">
          {ROLE_LABEL[admin.role]}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {ROLE_DESCRIPTION[admin.role]}
        </p>

        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {admin.permissions.map((permission) => (
            <li key={permission} className="text-[13px] text-ink">
              <span aria-hidden className="mr-2 text-olive">
                ✓
              </span>
              {PERMISSION_LABEL[permission]}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
