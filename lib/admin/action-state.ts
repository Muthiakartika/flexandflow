/**
 * What every admin server action hands back to its form.
 *
 * This lives outside `lib/admin/actions.ts` because a `"use server"` module
 * may only export async functions — exporting the `IDLE` constant from there
 * fails the build with "Only async functions are allowed to be exported in a
 * 'use server' file". The forms need an initial state for `useActionState`, so
 * it lives here, in a module both sides can import.
 *
 * Safe in a client component: no environment, no database, no `server-only`.
 */

export type ActionState = {
  ok: boolean;
  message: string | null;
  /**
   * Field-level messages keyed by the input's `name`, so a form can print each
   * one beside the control that caused it rather than as one line at the top.
   */
  fields?: Record<string, string>;
};

export const IDLE: ActionState = { ok: false, message: null };
