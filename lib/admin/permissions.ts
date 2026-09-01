/**
 * What an admin is allowed to do.
 *
 * Nothing in this codebase asks "is this a super admin". It asks `can(admin,
 * "content.publish")`. That indirection is the whole reason a third role can
 * be added later as one entry in `ROLE_PERMISSIONS` without touching a single
 * call site — which is what the brief means by a scalable permission system.
 *
 * Deliberately **not** `server-only`. `AdminNav` is a client component and has
 * to know which sections to draw; the resolved permission list is passed to it
 * as props and checked with the same `hasPermission` the server uses, so the
 * nav and the guards can never disagree about what a role means. That is safe
 * because this module holds no secrets and reaches nothing — it is a lookup
 * table and two pure functions. The client-side check decides what is *drawn*;
 * every server action re-checks for real, because a hidden link is not
 * authorisation.
 */

export const PERMISSIONS = [
  /* Content — the CMS. */
  "content.view",
  "content.create",
  "content.update",
  "content.delete",
  "content.publish",

  /* Media library. */
  "media.upload",
  "media.delete",

  /* The panel that existed before the CMS. */
  "booking.manage",
  "settings.manage",

  /* Admin accounts. */
  "admin.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type AdminRoleValue = "SUPER_ADMIN" | "EDITOR" | "BOOKING_STAFF";

/**
 * The defaults a role carries before per-user grants.
 *
 * **`EDITOR` and `BOOKING_STAFF` are disjoint**, and that is the point of
 * having both: the website and the diary are two different jobs that happen to
 * live behind one login, and neither needs the other's access.
 *
 * - An editor writes treatments and blog posts and uploads the pictures for
 *   them. They **cannot open a booking**, because the booking pages are a list
 *   of customer names, phone numbers and email addresses, and handing those
 *   over just because both jobs share a panel would be a privacy expansion
 *   nobody asked for.
 * - Booking staff run the diary and the prices the wizard charges. They
 *   **cannot change a word on the website** — the pages are indexed, and an
 *   accidental edit to one is a public mistake.
 *
 * Two things are grants rather than editor defaults, both because they are
 * hard to undo:
 *
 * - **`content.publish`.** The brief says an editor may publish "jika
 *   diberikan permission", so that is exactly what it is.
 * - **`content.delete`.** Deleting a published treatment removes a URL that is
 *   in Google's index, and this site has 27 indexable URLs it cannot afford to
 *   lose one of by accident. The action refuses outright while a page is live;
 *   this is the second lock.
 *
 * `check-permissions.ts` asserts the disjointness, so a future edit that
 * quietly gives one role the other's access fails a check rather than a
 * privacy review.
 */
export const ROLE_PERMISSIONS: Record<AdminRoleValue, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  EDITOR: ["content.view", "content.create", "content.update", "media.upload"],
  BOOKING_STAFF: ["booking.manage"],
};

/**
 * What may be granted on top of a role, for the admin-management form.
 *
 * Everything except a super admin's implicit lot. A role's own defaults are
 * filtered out per role at the call site rather than here, because the two
 * non-super roles no longer share a set.
 */
export const GRANTABLE_PERMISSIONS: readonly Permission[] = PERMISSIONS;

/** The permissions worth offering as extras for one role — its own excluded. */
export function grantableFor(role: AdminRoleValue): Permission[] {
  const defaults = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return PERMISSIONS.filter((permission) => !defaults.has(permission));
}

function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * A role's defaults plus this account's own grants.
 *
 * `extraPermissions` is a `String[]` in Postgres, so it can hold anything a
 * bad migration or a hand-edited row put there. Unknown strings are dropped
 * rather than carried, because a permission this build does not recognise
 * cannot be checked against anything and silently keeping it invites a future
 * rename to grant access it never meant to.
 */
export function permissionsFor(
  role: AdminRoleValue,
  extra: readonly string[] = [],
): Permission[] {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const value of extra) {
    if (isPermission(value)) granted.add(value);
  }
  return PERMISSIONS.filter((permission) => granted.has(permission));
}

export function hasPermission(
  granted: readonly string[],
  permission: Permission,
): boolean {
  return granted.includes(permission);
}

/**
 * Whether a change would leave nobody able to administer the panel.
 *
 * Pure, and takes the super-admin count rather than counting for itself, so
 * the rule can be checked without a database — `scripts/check-permissions.ts`
 * does exactly that. `lib/admin/team.ts` wraps it with the query.
 *
 * Only a change that *removes* the last usable super admin is refused. Editing
 * that account's name, or granting it something, is not a threat to anything.
 */
export function wouldStrand(
  target: { role: AdminRoleValue; active: boolean; deleted: boolean },
  activeSuperAdmins: number,
  next: { role?: AdminRoleValue; active?: boolean; deleted?: boolean },
): boolean {
  const isLastOne =
    target.role === "SUPER_ADMIN" &&
    target.active &&
    !target.deleted &&
    activeSuperAdmins <= 1;

  if (!isLastOne) return false;

  const stillSuperAdmin = (next.role ?? target.role) === "SUPER_ADMIN";
  const stillActive = (next.active ?? target.active) && !next.deleted;

  return !(stillSuperAdmin && stillActive);
}

/** Human labels for the admin-management screens. */
export const PERMISSION_LABEL: Record<Permission, string> = {
  "content.view": "View content",
  "content.create": "Create content",
  "content.update": "Edit content",
  "content.delete": "Delete content",
  "content.publish": "Publish and unpublish",
  "media.upload": "Upload images",
  "media.delete": "Delete images",
  "booking.manage": "Manage bookings and schedule",
  "settings.manage": "Change studio settings",
  "admin.manage": "Manage admin accounts",
};

export const ROLE_LABEL: Record<AdminRoleValue, string> = {
  SUPER_ADMIN: "Super Admin",
  EDITOR: "Content Editor",
  BOOKING_STAFF: "Booking Staff",
};

export const ROLE_DESCRIPTION: Record<AdminRoleValue, string> = {
  SUPER_ADMIN:
    "Full access, including admin accounts, publishing, and studio settings.",
  EDITOR:
    "The website: treatments, blog posts and images. Cannot see bookings or customer details. Publishing is granted per person.",
  BOOKING_STAFF:
    "The diary: bookings, working hours, time off and the prices the booking wizard charges. Cannot change anything on the website.",
};
