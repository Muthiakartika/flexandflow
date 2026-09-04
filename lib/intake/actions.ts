"use server";

/**
 * The intake form's admin mutations. A separate file from
 * `lib/admin/actions.ts` (already large) and `lib/cms/actions.ts` — intake is
 * its own bounded domain with its own models and its own permission, the same
 * reasoning the CMS got its own file rather than growing the booking one.
 *
 * Same three rules as every other admin action in this codebase: re-check the
 * permission here (a server action is a public endpoint `proxy.ts` does not
 * reliably cover), validate with `lib/intake/schema.ts`, and write an
 * `AuditLog` row for every change.
 */
import { revalidatePath, updateTag } from "next/cache";

import { IDLE, type ActionState } from "@/lib/admin/action-state";
import { actingAdmin, currentAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { INTAKE_TAG } from "@/lib/intake/read";
import {
  fieldErrors,
  intakeFieldCreateSchema,
  intakeFieldUpdateSchema,
  intakeSettingsSchema,
  OPTION_KINDS,
} from "@/lib/intake/schema";
import { shareSheetWith } from "@/lib/intake/sheets";
import { loadIntakeSettings, upsertIntakeSettings } from "@/lib/intake/settings";

const NO_SESSION: ActionState = {
  ...IDLE,
  message: "Your session has expired. Sign in again to make this change.",
};

const NOT_ALLOWED: ActionState = {
  ...IDLE,
  message: "Your account does not include this. Ask a super admin for access.",
};

async function refusal(): Promise<ActionState> {
  return (await currentAdmin()) ? NOT_ALLOWED : NO_SESSION;
}

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

function checkbox(form: FormData, key: string): boolean {
  return form.get(key) !== null;
}

async function audit(input: {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta ?? {},
    },
  });
}

/** One option per line — the simplest workable editor for a DROPDOWN,
 *  RADIO or CHECKBOX_GROUP row's choice list. */
function parseOptions(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "Do you have a car?" → "doYouHaveACar" — matches every hand-written
 *  fieldKey already in `lib/intake/seed-fields.ts`. */
function slugify(label: string): string {
  const words = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "field";

  return words
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join("");
}

/** Appends a number until the key is free — "email", "email2", "email3". */
async function uniqueFieldKey(label: string): Promise<string> {
  // Multipart names and prototype properties must never become question keys.
  const base = `custom_${slugify(label)}`;
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.intakeFormField.findUnique({
      where: { fieldKey: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function updateIntakeFieldAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("intake.manage");
  if (!admin) return await refusal();

  const id = text(form, "id");
  if (!id) return failed("No field was named.");

  const existing = await prisma.intakeFormField.findUnique({ where: { id } });
  if (!existing) return failed("That field no longer exists.");
  if (existing.archived) return failed("Restore this field before editing it.");

  const parsed = intakeFieldUpdateSchema.safeParse({
    id,
    label: text(form, "label"),
    helpText: text(form, "helpText"),
    required: checkbox(form, "required"),
    options: parseOptions(text(form, "options")),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  if (OPTION_KINDS.has(existing.kind) && parsed.data.options.length === 0) {
    return failed("Add at least one option, one per line.", { options: "Add at least one option." });
  }
  if (new Set(parsed.data.options).size !== parsed.data.options.length) {
    return failed("Options must be unique.", { options: "Remove duplicate options." });
  }

  /* IntakeSubmission.signatureUrl is a required column — a SIGNATURE row
     stays required regardless of what the form posted, or the API route
     would have nothing to store there. The panel hides this checkbox for
     SIGNATURE rows for the same reason; this is the guard for anyone who
     posts to the action directly. */
  const required =
    existing.kind === "SIGNATURE" ? true : parsed.data.required;

  await prisma.intakeFormField.update({
    where: { id },
    data: {
      label: parsed.data.label,
      helpText: parsed.data.helpText,
      required,
      options: OPTION_KINDS.has(existing.kind) ? parsed.data.options : [],
      updatedById: admin.id,
    },
  });

  await audit({
    actor: admin.email,
    action: "intakeField.update",
    entity: "IntakeFormField",
    entityId: id,
    meta: {
      fieldKey: existing.fieldKey,
      labelFrom: existing.label,
      labelTo: parsed.data.label,
      requiredFrom: existing.required,
      requiredTo: required,
    },
  });

  /* Immediate, not stale-while-revalidate — see lib/cms/write.ts's comment on
     the same choice. An owner who edits a field and opens /intake to check
     must see the change, not the page it replaced. */
  updateTag(INTAKE_TAG.fields);
  revalidatePath("/intake");
  revalidatePath("/admin/intake");

  return done("Saved.");
}

export async function updateIntakeSettingsAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("intake.manage");
  if (!admin) return await refusal();

  const parsed = intakeSettingsSchema.safeParse({
    shareEmail1: text(form, "shareEmail1"),
    shareEmail2: text(form, "shareEmail2"),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  const before = await loadIntakeSettings();

  await upsertIntakeSettings({
    shareEmail1: parsed.data.shareEmail1,
    shareEmail2: parsed.data.shareEmail2,
    updatedById: admin.id,
  });

  /* Only a slot that actually changed is (re-)shared — sharing on every save
     would leave a duplicate permission entry in Drive each time this form is
     submitted with the same two addresses. */
  const shareResults: string[] = [];

  if (parsed.data.shareEmail1 && parsed.data.shareEmail1 !== before.shareEmail1) {
    const result = await shareSheetWith(parsed.data.shareEmail1);
    shareResults.push(
      result.ok
        ? `Shared with ${parsed.data.shareEmail1}.`
        : `Could not share with ${parsed.data.shareEmail1}: ${result.error}`,
    );
  }

  if (parsed.data.shareEmail2 && parsed.data.shareEmail2 !== before.shareEmail2) {
    const result = await shareSheetWith(parsed.data.shareEmail2);
    shareResults.push(
      result.ok
        ? `Shared with ${parsed.data.shareEmail2}.`
        : `Could not share with ${parsed.data.shareEmail2}: ${result.error}`,
    );
  }

  await audit({
    actor: admin.email,
    action: "intakeSettings.update",
    entity: "IntakeSettings",
    entityId: "singleton",
    meta: {
      shareEmail1: parsed.data.shareEmail1,
      shareEmail2: parsed.data.shareEmail2,
    },
  });

  revalidatePath("/admin/intake");

  return done(shareResults.length > 0 ? shareResults.join(" ") : "Saved.");
}

/**
 * Adds a field the studio wants that was never in the source JotForm.
 * Everything created here is `isCustom: true`; seed cleanup leaves these
 * definitions alone. Both original and custom fields can be archived.
 */
export async function addIntakeFieldAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("intake.manage");
  if (!admin) return await refusal();

  const parsed = intakeFieldCreateSchema.safeParse({
    sectionKey: text(form, "sectionKey"),
    kind: text(form, "kind"),
    label: text(form, "label"),
    helpText: text(form, "helpText"),
    required: checkbox(form, "required"),
    options: parseOptions(text(form, "options")),
  });

  if (!parsed.success) {
    return failed("Check the fields below.", fieldErrors(parsed.error));
  }

  /* IntakeSubmission has exactly one signatureUrl column — a second
     SIGNATURE row would have nowhere of its own to be stored. The kind
     picker hides "Signature" once one exists (see AddIntakeFieldForm), so
     reaching this is only possible by posting to the action directly. */
  if (parsed.data.kind === "SIGNATURE") {
    const existingSignature = await prisma.intakeFormField.findFirst({
      where: { kind: "SIGNATURE", archived: false },
      select: { id: true },
    });
    if (existingSignature) {
      return failed(
        "This form already has a signature field — only one is supported.",
      );
    }
  }

  if (OPTION_KINDS.has(parsed.data.kind) && parsed.data.options.length === 0) {
    return failed("Check the fields below.", {
      options: "Add at least one option, one per line.",
    });
  }
  if (new Set(parsed.data.options).size !== parsed.data.options.length) {
    return failed("Options must be unique.", { options: "Remove duplicate options." });
  }

  const fieldKey = await uniqueFieldKey(parsed.data.label);

  /* Highest sortOrder overall, not just within the section — the public
     form groups by sectionKey and preserves this order within each group,
     so a new field simply lands last in whichever section it was given,
     regardless of what number every other section is using. */
  const highest = await prisma.intakeFormField.aggregate({
    _max: { sortOrder: true },
  });

  const created = await prisma.intakeFormField.create({
    data: {
      sectionKey: parsed.data.sectionKey,
      fieldKey,
      kind: parsed.data.kind,
      label: parsed.data.label,
      helpText: parsed.data.helpText,
      required: parsed.data.kind === "SIGNATURE" || (parsed.data.kind !== "INFO" && parsed.data.required),
      options: OPTION_KINDS.has(parsed.data.kind) ? parsed.data.options : [],
      isCustom: true,
      sortOrder: (highest._max.sortOrder ?? 0) + 1,
      updatedById: admin.id,
    },
  });

  await audit({
    actor: admin.email,
    action: "intakeField.create",
    entity: "IntakeFormField",
    entityId: created.id,
    meta: {
      fieldKey,
      kind: parsed.data.kind,
      sectionKey: parsed.data.sectionKey,
      label: parsed.data.label,
    },
  });

  updateTag(INTAKE_TAG.fields);
  revalidatePath("/intake");
  revalidatePath("/admin/intake");

  return done(`Added "${parsed.data.label}".`);
}

/** Remove from the active form while retaining historical field definitions. */
export async function deleteIntakeFieldAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("intake.manage");
  if (!admin) return await refusal();

  const id = text(form, "id");
  if (!id) return failed("No field was named.");

  const existing = await prisma.intakeFormField.findUnique({ where: { id } });
  if (!existing) return done("That field is already gone.");

  await prisma.intakeFormField.update({ where: { id }, data: { archived: true, updatedById: admin.id } });

  await audit({
    actor: admin.email,
    action: "intakeField.delete",
    entity: "IntakeFormField",
    entityId: id,
    meta: { fieldKey: existing.fieldKey, label: existing.label, kind: existing.kind },
  });

  updateTag(INTAKE_TAG.fields);
  revalidatePath("/intake");
  revalidatePath("/admin/intake");

  return done(`Removed "${existing.label}".`);
}

export async function restoreIntakeFieldAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await actingAdmin("intake.manage");
  if (!admin) return await refusal();
  const id = text(form, "id");
  if (!id) return failed("No field was named.");
  const existing = await prisma.intakeFormField.findUnique({ where: { id } });
  if (!existing) return failed("That field no longer exists.");
  if (existing.kind === "SIGNATURE" && await prisma.intakeFormField.findFirst({
    where: { kind: "SIGNATURE", archived: false, id: { not: id } },
  })) return failed("Remove the current signature field before restoring this one.");
  await prisma.intakeFormField.update({ where: { id }, data: { archived: false, updatedById: admin.id } });
  await audit({ actor: admin.email, action: "intakeField.restore", entity: "IntakeFormField", entityId: id });
  updateTag(INTAKE_TAG.fields);
  revalidatePath("/intake");
  revalidatePath("/admin/intake");
  return done(`Restored "${existing.label}".`);
}
