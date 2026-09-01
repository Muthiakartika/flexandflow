/**
 * Validation for the admin-management forms.
 *
 * Separate from `lib/booking/schema.ts` because nothing here is about
 * bookings, and separate from the actions module because a `"use server"` file
 * may only export async functions.
 */
import { z } from "zod";

import { PERMISSIONS } from "@/lib/admin/permissions";

/**
 * bcrypt hashes at most the first 72 **bytes** of a password and silently
 * ignores the rest. Somebody using a long passphrase would find that the tail
 * of it does not matter, and — worse — that a shorter prefix of their own
 * password also signs them in. Refusing the input is the honest answer; the
 * limit is on bytes rather than characters because an emoji or an accented
 * letter costs more than one.
 */
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Too long — passwords are limited to 72 bytes",
  );

const name = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(80, "That name is too long");

/* Lowercased before it is stored and before it is looked up. `AdminUser.email`
   is unique, and without normalising, `Owner@…` and `owner@…` are two accounts
   that both believe they are the login. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email"));

export const adminRoleSchema = z.enum(["SUPER_ADMIN", "EDITOR"]);

/**
 * Grants are validated against the known list rather than stored as typed.
 * They arrive as repeated `FormData` entries from checkboxes, so anything
 * could be posted; an unrecognised string in this column would sit there
 * looking like a permission until a future rename made it into one.
 */
export const permissionListSchema = z
  .array(z.enum(PERMISSIONS))
  .default([])
  .transform((values) => [...new Set(values)]);

export const createAdminSchema = z.object({
  name,
  email,
  password,
  role: adminRoleSchema,
  extraPermissions: permissionListSchema,
  active: z.boolean().default(true),
});

/** Password is absent unless it is being changed; empty means "leave it". */
export const updateAdminSchema = z.object({
  id: z.string().min(1),
  name,
  email,
  role: adminRoleSchema,
  extraPermissions: permissionListSchema,
  active: z.boolean().default(false),
});

export const setPasswordSchema = z.object({
  id: z.string().min(1),
  password,
});

/**
 * Changing your own password asks for the current one.
 *
 * An unattended laptop at the studio reception is the realistic threat here,
 * not a stolen hash: a session cookie is enough to reach this form, and
 * without the current password anyone who found the panel open could lock the
 * owner out of it.
 */
export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password,
    confirm: z.string().min(1, "Repeat the new password"),
  })
  .refine((value) => value.password === value.confirm, {
    message: "The two passwords do not match",
    path: ["confirm"],
  });

export const updateOwnProfileSchema = z.object({ name, email });

export const adminIdSchema = z.object({ id: z.string().min(1) });
