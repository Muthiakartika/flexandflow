"use server";

/**
 * Admin account management.
 *
 * Same three rules as `lib/admin/actions.ts`, and for the same reasons: each
 * action re-checks the session **and the permission** itself, everything is
 * Zod-validated because `FormData` arrives from whatever posted it, and every
 * change writes an `AuditLog` row. A form that only renders for a super admin
 * is not authorisation — the action is a public HTTP endpoint.
 *
 * The guards in `lib/admin/team.ts` are applied here rather than in the UI. A
 * disabled button is a courtesy; the check that matters is the one a crafted
 * POST also meets.
 */
import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";

import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { actingAdmin, currentAdmin } from "@/lib/admin/auth";
import {
  getAdmin,
  hasAuthoredContent,
  wouldStrandPanel,
} from "@/lib/admin/team";
import {
  adminIdSchema,
  changeOwnPasswordSchema,
  createAdminSchema,
  setPasswordSchema,
  updateAdminSchema,
  updateOwnProfileSchema,
} from "@/lib/admin/team-schema";
import { fieldErrors } from "@/lib/booking/schema";
import { prisma } from "@/lib/db";

/** Matches `prisma/seed.ts`. Changing it here alone would leave two costs in use. */
const BCRYPT_COST = 12;

const NO_SESSION: ActionState = {
  ...IDLE,
  message: "Your session has expired. Sign in again to make this change.",
};

const NOT_ALLOWED: ActionState = {
  ...IDLE,
  message: "You do not have permission to manage admin accounts.",
};

function failed(message: string, fields?: Record<string, string>): ActionState {
  return { ok: false, message, fields };
}

function done(message: string): ActionState {
  return { ok: true, message };
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Checkbox groups arrive as repeated entries under one name. */
function checkedPermissions(form: FormData): string[] {
  return form
    .getAll("extraPermissions")
    .filter((value): value is string => typeof value === "string");
}

async function audit(input: {
  actor: string;
  action: string;
  entityId: string;
  meta?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: "AdminUser",
      entityId: input.entityId,
      meta: input.meta ?? {},
    },
  });
}

function revalidateTeam(id?: string): void {
  revalidatePath("/admin/team");
  revalidatePath("/admin/profile");
  if (id) revalidatePath(`/admin/team/${id}`);
}

/** Postgres unique-violation on `AdminUser.email`, turned into one sentence. */
function isEmailTaken(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === "P2002" || code === "23505";
}

// ── Creating and editing accounts ─────────────────────────────────────────

export async function createAdminAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("admin.manage");
  if (!admin) return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;

  const parsed = createAdminSchema.safeParse({
    name: text(form, "name"),
    email: text(form, "email"),
    password: form.get("password") ?? "",
    role: text(form, "role"),
    extraPermissions: checkedPermissions(form),
    active: form.get("active") !== null,
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const { name, email, password, role, extraPermissions, active } = parsed.data;

  /* A super admin already has everything, so storing grants against one would
     be a list nobody reads that becomes live the moment they are demoted. */
  const grants = role === "SUPER_ADMIN" ? [] : extraPermissions;

  let created;
  try {
    created = await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash: await hash(password, BCRYPT_COST),
        role,
        extraPermissions: grants,
        active,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      return failed("That email already has an account.", {
        email: "Already in use",
      });
    }
    throw error;
  }

  await audit({
    actor: admin.email,
    action: "admin.create",
    entityId: created.id,
    meta: { email, role, active, grants: grants.join(",") },
  });

  revalidateTeam(created.id);
  return done(`${name} can now sign in.`);
}

export async function updateAdminAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("admin.manage");
  if (!admin) return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;

  const parsed = updateAdminSchema.safeParse({
    id: text(form, "id"),
    name: text(form, "name"),
    email: text(form, "email"),
    role: text(form, "role"),
    extraPermissions: checkedPermissions(form),
    active: form.get("active") !== null,
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const { id, name, email, role, extraPermissions, active } = parsed.data;

  const target = await getAdmin(id);
  if (!target || target.deletedAt) return failed("That account no longer exists.");

  /* Editing yourself is allowed — changing your own name and email is the
     point of the profile page — but the two changes that could sign you out
     mid-click are not. Being told why beats discovering it at the login. */
  if (target.id === admin.id) {
    if (role !== target.role) {
      return failed(
        "You cannot change your own role. Ask another super admin to do it.",
      );
    }
    if (!active) {
      return failed("You cannot deactivate your own account.");
    }
  }

  if (await wouldStrandPanel(target, { role, active })) {
    return failed(
      "This is the last active super admin. Promote someone else first, " +
        "or nobody will be able to manage accounts.",
    );
  }

  const grants = role === "SUPER_ADMIN" ? [] : extraPermissions;

  try {
    await prisma.adminUser.update({
      where: { id },
      data: { name, email, role, extraPermissions: grants, active },
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      return failed("That email already has an account.", {
        email: "Already in use",
      });
    }
    throw error;
  }

  await audit({
    actor: admin.email,
    action: "admin.update",
    entityId: id,
    meta: {
      email,
      role,
      active,
      grants: grants.join(","),
      roleChanged: role !== target.role,
      activeChanged: active !== target.active,
    },
  });

  revalidateTeam(id);
  return done(`${name} updated.`);
}

/** Set another admin's password. The old one is never needed and never shown. */
export async function setAdminPasswordAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("admin.manage");
  if (!admin) return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;

  const parsed = setPasswordSchema.safeParse({
    id: text(form, "id"),
    password: form.get("password") ?? "",
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const target = await getAdmin(parsed.data.id);
  if (!target || target.deletedAt) return failed("That account no longer exists.");

  await prisma.adminUser.update({
    where: { id: target.id },
    data: { passwordHash: await hash(parsed.data.password, BCRYPT_COST) },
  });

  /* The password itself is never in the meta. An audit trail that records what
     it was is a second copy of the credential in a table nobody guards. */
  await audit({
    actor: admin.email,
    action: "admin.password_set",
    entityId: target.id,
    meta: { email: target.email },
  });

  revalidateTeam(target.id);
  return done(
    `Password changed for ${target.name}. Their existing session stays valid ` +
      `until it expires — deactivate the account if you need them out now.`,
  );
}

export async function deleteAdminAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("admin.manage");
  if (!admin) return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;

  const parsed = adminIdSchema.safeParse({ id: text(form, "id") });
  if (!parsed.success) return failed("No account was named.");

  const target = await getAdmin(parsed.data.id);
  if (!target || target.deletedAt) return failed("That account no longer exists.");

  if (target.id === admin.id) {
    return failed("You cannot delete your own account.");
  }

  if (await wouldStrandPanel(target, { deleted: true })) {
    return failed(
      "This is the last active super admin. Promote someone else first.",
    );
  }

  /* Soft where the account authored something, hard where it did not. A
     revision's author has to stay resolvable or a published article gains a
     byline pointing at nothing; an account that never wrote anything leaves
     nothing behind worth keeping a row for. */
  const authored = await hasAuthoredContent(target.id);

  if (authored) {
    await prisma.adminUser.update({
      where: { id: target.id },
      data: { active: false, deletedAt: new Date() },
    });
  } else {
    await prisma.adminUser.delete({ where: { id: target.id } });
  }

  await audit({
    actor: admin.email,
    action: authored ? "admin.soft_delete" : "admin.delete",
    entityId: target.id,
    meta: { email: target.email, role: target.role },
  });

  revalidateTeam(target.id);
  return done(
    authored
      ? `${target.name} has been removed. Their name stays on the content they wrote.`
      : `${target.name} has been deleted.`,
  );
}

// ── Your own account ──────────────────────────────────────────────────────

/**
 * Name and email only. Role and status are deliberately absent: this form is
 * reachable by every admin, and it is the obvious place to try to promote
 * yourself.
 */
export async function updateOwnProfileAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const parsed = updateOwnProfileSchema.safeParse({
    name: text(form, "name"),
    email: text(form, "email"),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  try {
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: parsed.data,
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      return failed("That email already has an account.", {
        email: "Already in use",
      });
    }
    throw error;
  }

  await audit({
    actor: admin.email,
    action: "admin.profile_update",
    entityId: admin.id,
    meta: { email: parsed.data.email },
  });

  revalidateTeam(admin.id);

  /* The session JWT carries the name and email it was signed with, and this
     does not re-issue it. Nothing reads those for authorisation — every check
     goes through `currentAdmin()`, which re-reads the row — so the only stale
     copy is cosmetic, and saying so beats a nav that quietly disagrees with
     the form above it. */
  return done(
    parsed.data.email !== admin.email
      ? "Saved. Sign out and back in to see the new email in the sidebar."
      : "Saved.",
  );
}

export async function changeOwnPasswordAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await currentAdmin();
  if (!admin) return NO_SESSION;

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: form.get("currentPassword") ?? "",
    password: form.get("password") ?? "",
    confirm: form.get("confirm") ?? "",
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const row = await prisma.adminUser.findUnique({
    where: { id: admin.id },
    select: { passwordHash: true },
  });

  if (!row || !(await compare(parsed.data.currentPassword, row.passwordHash))) {
    return failed("That is not your current password.", {
      currentPassword: "Incorrect",
    });
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hash(parsed.data.password, BCRYPT_COST) },
  });

  await audit({
    actor: admin.email,
    action: "admin.password_change",
    entityId: admin.id,
  });

  return done("Your password has been changed.");
}
