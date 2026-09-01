"use client";

import { useActionState, useState } from "react";

import { FieldError } from "@/components/admin/primitives";
import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import { IDLE, type ActionState } from "@/lib/admin/action-state";
import {
  grantableFor,
  PERMISSION_LABEL,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  type AdminRoleValue,
  type Permission,
} from "@/lib/admin/permissions";
import {
  createAdminAction,
  updateAdminAction,
} from "@/lib/admin/team-actions";
import type { TeamMember } from "@/lib/admin/team";

/**
 * One form for creating an admin and for editing one.
 *
 * The two differ by three things — a password field, a heading, and whether
 * the row already exists — which is not enough to justify two forms that would
 * drift apart on the fourth change. Passwords on an existing account are
 * changed through their own form (`AdminPasswordForm`), because "save this
 * person's details" and "replace their credential" should not be one button.
 *
 * The server re-derives every rule this component draws. Hiding the grants
 * from a super admin and disabling your own role select are conveniences; the
 * checks that matter are in `lib/admin/team-actions.ts`.
 */
export function AdminUserForm({
  member,
  isSelf = false,
  isLastSuperAdmin = false,
}: {
  /** Absent when creating. */
  member?: TeamMember;
  /** Whether the signed-in admin is editing their own account. */
  isSelf?: boolean;
  /** Whether this account is the only one who can still manage the panel. */
  isLastSuperAdmin?: boolean;
}) {
  const editing = Boolean(member);

  const [state, action] = useActionState<ActionState, FormData>(
    editing ? updateAdminAction : createAdminAction,
    IDLE,
  );

  const [role, setRole] = useState<AdminRoleValue>(member?.role ?? "EDITOR");

  const fields = state.fields ?? {};

  /* Locked for the two changes that would sign you out of the page you are
     standing on, and for the last super admin, whose demotion would leave
     nobody able to undo it. Both are refused by the server too. */
  const roleLocked = isSelf || isLastSuperAdmin;
  const activeLocked = isSelf || isLastSuperAdmin;

  return (
    <form action={action} className="grid gap-4">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor="admin-name">
            Name
          </label>
          <input
            id="admin-name"
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            defaultValue={member?.name ?? ""}
            className="admin-input"
          />
          <FieldError message={fields.name} />
        </div>

        <div>
          <label className="admin-label" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={member?.email ?? ""}
            className="admin-input"
          />
          <FieldError message={fields.email} />
          <p className="mt-1 text-[12px] text-faint">
            This is the login. It is stored in lower case.
          </p>
        </div>
      </div>

      {editing ? null : (
        <div className="sm:max-w-[50%]">
          <label className="admin-label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="admin-input"
          />
          <FieldError message={fields.password} />
          <p className="mt-1 text-[12px] text-faint">
            At least 10 characters. Give it to them another way — it is never
            shown again after this.
          </p>
        </div>
      )}

      {/* ── Role ──────────────────────────────────────────────────────── */}
      <fieldset className="border-t border-line pt-4">
        <legend className="admin-label px-0">Role</legend>

        <div className="grid gap-2">
          {(["SUPER_ADMIN", "EDITOR", "BOOKING_STAFF"] as const).map((value) => (
            <label
              key={value}
              className={`flex gap-3 rounded-[8px] border p-3 ${
                role === value
                  ? "border-olive bg-cream"
                  : "border-line bg-surface"
              } ${roleLocked ? "opacity-60" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                disabled={roleLocked}
                onChange={() => setRole(value)}
                className="mt-1 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-ink">
                  {ROLE_LABEL[value]}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {ROLE_DESCRIPTION[value]}
                </span>
              </span>
            </label>
          ))}
        </div>

        {/* Radios are not submitted while disabled, and the server requires a
            role — so the locked case posts the unchanged value here instead. */}
        {roleLocked ? <input type="hidden" name="role" value={role} /> : null}

        {isSelf ? (
          <p className="mt-2 text-[12px] text-faint">
            You cannot change your own role. Another super admin can.
          </p>
        ) : isLastSuperAdmin ? (
          <p className="mt-2 text-[12px] text-faint">
            This is the only active super admin. Promote someone else before
            changing this one.
          </p>
        ) : null}

        <FieldError message={fields.role} />
      </fieldset>

      {/* ── Extra permissions ─────────────────────────────────────────── */}
      {role === "SUPER_ADMIN" ? (
        <p className="border-t border-line pt-4 text-[13px] text-muted">
          A super admin already has every permission, so there is nothing extra
          to grant.
        </p>
      ) : (
        <fieldset className="border-t border-line pt-4">
          <legend className="admin-label px-0">Extra permissions</legend>
          <p className="mb-3 text-[13px] text-muted">
            {ROLE_DESCRIPTION[role]} Anything beyond that is granted here, one
            person at a time.
          </p>

          {/* The role's own defaults are filtered out — they are already
              granted, and a ticked checkbox that cannot be unticked is worse
              than no checkbox. Crossing the line between the two jobs is
              deliberately possible but never accidental: giving an editor
              `booking.manage` here is a choice somebody makes on purpose. */}
          <div className="grid gap-2 sm:grid-cols-2">
            {grantableFor(role).map((permission: Permission) => (
              <label
                key={permission}
                className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-line bg-surface p-2.5"
              >
                <input
                  type="checkbox"
                  name="extraPermissions"
                  value={permission}
                  defaultChecked={member?.extraPermissions.includes(permission)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="text-[13px] text-ink">
                  {PERMISSION_LABEL[permission]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* ── Status ────────────────────────────────────────────────────── */}
      <div className="border-t border-line pt-4">
        <label
          className={`flex items-center gap-2 text-[14px] font-bold text-ink ${
            activeLocked ? "opacity-60" : ""
          }`}
        >
          <input
            type="checkbox"
            name="active"
            defaultChecked={member?.active ?? true}
            disabled={activeLocked}
            className="size-4"
          />
          Active — can sign in
        </label>
        {/* Same reason as the role radios: a disabled checkbox posts nothing,
            and an edit form that silently deactivated the account it refuses to
            let you deactivate would be the worst of both. */}
        {activeLocked && (member?.active ?? true) ? (
          <input type="hidden" name="active" value="on" />
        ) : null}
        <p className="mt-1 text-[12px] text-faint">
          Deactivating takes effect on their next page load, not when their
          session expires.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <SubmitButton pendingLabel={editing ? "Saving…" : "Creating…"}>
          {editing ? "Save changes" : "Create admin"}
        </SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
