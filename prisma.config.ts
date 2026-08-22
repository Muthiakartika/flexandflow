/**
 * Prisma 7 config. The datasource URL lives here rather than in
 * `schema.prisma` — that is the v7 convention, not a preference.
 *
 * `DIRECT_URL` is used when it is set. Neon's pooled connection string goes
 * through PgBouncer, which cannot run the advisory locks and DDL that
 * migrations need; the direct URL bypasses the pooler. At runtime the app
 * still uses the pooled `DATABASE_URL` (see `lib/db.ts`).
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

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
