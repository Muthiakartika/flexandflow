/**
 * Prisma 7 config. The datasource URL lives here rather than in
 * `schema.prisma` — that is the v7 convention, not a preference.
 *
 * `DIRECT_URL` is used when it is set. Neon's pooled connection string goes
 * through PgBouncer, which cannot run the advisory locks and DDL that
 * migrations need; the direct URL bypasses the pooler. At runtime the app
 * still uses the pooled `DATABASE_URL` (see `lib/db.ts`).
 */
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

/* This project only ever has `.env.local` (see .gitignore), never a plain
   `.env` — the bare `dotenv/config` import only looks for the latter, so it
   silently loaded nothing and left DATABASE_URL/DIRECT_URL undefined for
   every standalone `prisma` CLI invocation. On Vercel/CI, where real env vars
   are injected directly and no `.env.local` file exists, this is a no-op. */
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
