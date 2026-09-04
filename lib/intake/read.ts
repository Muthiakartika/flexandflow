/**
 * Reading the intake form's field list, as the public page renders it.
 *
 * Mirrors `lib/cms/read.ts`'s shape: a cached read, invalidated by tag from
 * the admin action rather than left to go stale until the next deploy. This
 * page has no `generateStaticParams` and no draft mode — there is only one
 * form and it is either published or it does not exist — so this is a
 * smaller version of that file's pattern, not the whole of it.
 *
 * `updateTag(INTAKE_TAG.fields)` only runs from `lib/intake/actions.ts`'s
 * Server Action — so a re-run of `prisma/seed.ts` (correcting a field's
 * `sortOrder`/`sectionKey`, or adding a new one) writes straight to Postgres
 * with nothing to invalidate this cache. `npm run db:seed` runs as a
 * standalone `tsx` script outside Next entirely and cannot call `updateTag`
 * even if it wanted to.
 *
 * **Restarting the dev server is not enough to see the correction** —
 * `unstable_cache` is backed by Next's on-disk Data Cache, which survives a
 * process restart the same way it survives a deploy. This cost real time
 * twice: the database was already right, the running process was already the
 * new one, and the page still rendered the old data until the cache
 * directory itself was deleted. **Under `next dev` with Turbopack (this
 * project, Next 16) that directory is `.next/dev/cache/fetch-cache/`, not
 * the `.next/cache/fetch-cache/` a webpack-dev setup would use** — deleting
 * the webpack-era path is a silent no-op here and looks identical to a
 * successful clear. After a structural reseed, delete
 * `.next/dev/cache/fetch-cache/` (or the whole `.next` folder) before
 * restarting — `grep -rl "<a value that changed>" .next` finds the right
 * directory directly if this ever moves again.
 */
import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import type { PublicIntakeField } from "@/lib/intake/types";

/** Invalidated by `lib/intake/actions.ts` on every field edit. */
export const INTAKE_TAG = { fields: "intake:fields" } as const;

async function loadFields(): Promise<PublicIntakeField[]> {
  return prisma.intakeFormField.findMany({
    where: { archived: false },
    select: {
      id: true,
      sectionKey: true,
      sortOrder: true,
      fieldKey: true,
      kind: true,
      label: true,
      helpText: true,
      required: true,
      options: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

/** Every intake field, in reading order — what the public form renders. */
export async function listPublicIntakeFields(): Promise<PublicIntakeField[]> {
  return unstable_cache(loadFields, ["intake", "fields", "active-v4"], {
    tags: [INTAKE_TAG.fields],
  })();
}
