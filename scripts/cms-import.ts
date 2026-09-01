/**
 * Moves the ported content out of `lib/data/` and into the CMS tables.
 *
 * Seventeen documents: nine treatments and eight blog posts. It reads the
 * **modules**, not their text, so the copy cannot be mangled in transit —
 * what goes in is the object the site renders today, apostrophes, stray commas
 * and all.
 *
 * Then it reads every document back through `lib/cms/shape.ts` — the same
 * mapping the site uses, not a copy of it — and compares the result to the
 * source object structurally. Anything that differs is printed and the script
 * exits non-zero. A silent import that dropped a `bannerImage` or flattened an
 * apostrophe would be discovered weeks later on a live page.
 *
 *   npx tsx scripts/cms-import.ts            # import what is missing, verify all
 *   npx tsx scripts/cms-import.ts --verify   # verify only, write nothing
 *   npx tsx scripts/cms-import.ts --force    # overwrite existing documents
 *
 * Existing documents are **skipped** by default. Re-running this after the
 * owner has edited a page in the CMS would otherwise throw their work away.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated/prisma/client";
import { DOC_SELECT, REVISION_SELECT, toPost, toService, toRevisionData } from "../lib/cms/shape";
import { posts } from "../lib/data/posts";
import { pricedServiceSlugs, services } from "../lib/data/services";
import type { Post, Service } from "../types";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const args = new Set(process.argv.slice(2));
const VERIFY_ONLY = args.has("--verify");
const FORCE = args.has("--force");

/**
 * A structural fingerprint that does not depend on key order.
 *
 * `JSON.stringify` alone would report a difference between the source object
 * and the rebuilt one purely because `toService` writes its keys in a
 * different order, which says nothing about the content. Sorting the keys at
 * every level compares what is actually there.
 */
function stable(value: unknown): string {
  return JSON.stringify(normalise(value));
}

/**
 * Fields that are computed at read time rather than stored on the revision.
 *
 * `categoryLabel` is looked up from `ContentCategory` when a post is loaded,
 * so the rebuilt object carries one and the source module does not. Comparing
 * it would report a difference that says nothing about whether the *content*
 * survived the import, which is the only thing this check is for.
 */
const DERIVED_FIELDS = new Set(["categoryLabel"]);

function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (DERIVED_FIELDS.has(key)) continue;
      /* `undefined` and "absent" are the same thing in the source data — some
         optional fields are written as `undefined`, most are simply omitted —
         and they must not read as a difference. */
      if (source[key] !== undefined) out[key] = normalise(source[key]);
    }
    return out;
  }

  return value;
}

/** Where the two disagree, as a path, so a failure names the field. */
function firstDifference(a: unknown, b: unknown, path = ""): string | null {
  if (stable(a) === stable(b)) return null;

  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    const keys = new Set([
      ...Object.keys(a as object),
      ...Object.keys(b as object),
    ]);
    for (const key of keys) {
      const found = firstDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      );
      if (found) return found;
    }
  }

  const show = (value: unknown) => {
    const text = JSON.stringify(value) ?? "undefined";
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  };

  return `${path || "(root)"}\n      source: ${show(a)}\n      stored: ${show(b)}`;
}

// ── Import ────────────────────────────────────────────────────────────────

type Entry = {
  kind: "SERVICE" | "POST";
  slug: string;
  urlPrefix: string;
  sortOrder: number;
  gridOrder: number | null;
  source: Service | Post;
};

function entries(): Entry[] {
  const serviceEntries: Entry[] = services.map((service, index) => {
    /* `pricedServiceSlugs` is a *different* order from the `services` array —
       the WordPress grid led with the men's detox massage. Both orderings are
       real and both are preserved; see `gridOrder` in the schema. */
    const grid = pricedServiceSlugs.indexOf(
      service.slug as (typeof pricedServiceSlugs)[number],
    );

    return {
      kind: "SERVICE",
      slug: service.slug,
      /* Every service page is served under `/uluwatu-bali/`, sharing the
         namespace with the posts in that category. */
      urlPrefix: "uluwatu-bali",
      sortOrder: index,
      gridOrder: grid === -1 ? null : grid,
      source: service,
    };
  });

  const postEntries: Entry[] = posts.map((post, index) => ({
    kind: "POST",
    slug: post.slug,
    urlPrefix: post.category,
    sortOrder: index,
    gridOrder: null,
    source: post,
  }));

  return [...serviceEntries, ...postEntries];
}

async function importOne(entry: Entry): Promise<"created" | "replaced" | "skipped"> {
  const existing = await prisma.contentDoc.findUnique({
    where: { urlPrefix_slug: { urlPrefix: entry.urlPrefix, slug: entry.slug } },
    select: { id: true },
  });

  if (existing && !FORCE) return "skipped";

  const data = toRevisionData(entry.source);

  if (existing) {
    /* --force replaces the document outright: revisions cascade with it, so
       the history of an overwritten page goes too. That is the point of the
       flag being opt-in. */
    await prisma.contentDoc.delete({ where: { id: existing.id } });
  }

  await prisma.contentDoc.create({
    data: {
      kind: entry.kind,
      slug: entry.slug,
      urlPrefix: entry.urlPrefix,
      sortOrder: entry.sortOrder,
      gridOrder: entry.gridOrder,
      status: "PUBLISHED",
      publishedVersion: 1,
      /* The pages are already live on the domain, so the import publishes them
         rather than leaving seventeen drafts and a blank website. */
      publishedAt: new Date(),
      revisions: {
        create: {
          version: 1,
          ...data,
          body: data.body as never,
          tiers: (data.tiers ?? undefined) as never,
        },
      },
    },
  });

  return existing ? "replaced" : "created";
}

// ── Verify ────────────────────────────────────────────────────────────────

async function verify(entry: Entry): Promise<string | null> {
  const doc = await prisma.contentDoc.findUnique({
    where: { urlPrefix_slug: { urlPrefix: entry.urlPrefix, slug: entry.slug } },
    select: DOC_SELECT,
  });

  if (!doc) return "not imported";
  if (doc.publishedVersion === null) return "imported but not published";

  const revision = await prisma.contentRevision.findUnique({
    where: { docId_version: { docId: doc.id, version: doc.publishedVersion } },
    select: REVISION_SELECT,
  });

  if (!revision) return `published version ${doc.publishedVersion} is missing`;

  const rebuilt =
    entry.kind === "SERVICE"
      ? toService({ doc, revision })
      : toPost({ doc, revision });

  return firstDifference(entry.source, rebuilt);
}

async function main(): Promise<void> {
  const all = entries();

  console.log(
    `\n${all.length} documents — ${
      all.filter((e) => e.kind === "SERVICE").length
    } treatments, ${all.filter((e) => e.kind === "POST").length} posts\n`,
  );

  if (!VERIFY_ONLY) {
    const counts = { created: 0, replaced: 0, skipped: 0 };

    for (const entry of all) {
      const result = await importOne(entry);
      counts[result] += 1;
      if (result !== "skipped") {
        console.log(`  ${result.padEnd(8)} ${entry.urlPrefix}/${entry.slug}`);
      }
    }

    console.log(
      `\n  ${counts.created} created, ${counts.replaced} replaced, ` +
        `${counts.skipped} already present${
          counts.skipped && !FORCE ? " (left alone — pass --force to replace)" : ""
        }\n`,
    );
  }

  console.log("Verifying every document against its source module\n");

  let failures = 0;

  for (const entry of all) {
    const problem = await verify(entry);
    if (problem) {
      failures += 1;
      console.log(`  FAIL  ${entry.urlPrefix}/${entry.slug}\n      ${problem}`);
    } else {
      console.log(`  ok    ${entry.urlPrefix}/${entry.slug}`);
    }
  }

  // Orderings, which the objects themselves do not carry.
  console.log("");

  const grid = await prisma.contentDoc.findMany({
    where: { kind: "SERVICE", gridOrder: { not: null } },
    select: { slug: true },
    orderBy: { gridOrder: "asc" },
  });

  const gridMatches =
    grid.length === pricedServiceSlugs.length &&
    grid.every((doc, i) => doc.slug === pricedServiceSlugs[i]);

  console.log(
    gridMatches
      ? "  ok    the priced grid is in the same order as pricedServiceSlugs"
      : `  FAIL  priced grid order differs\n      source: ${pricedServiceSlugs.join(", ")}\n      stored: ${grid.map((d) => d.slug).join(", ")}`,
  );
  if (!gridMatches) failures += 1;

  const reading = await prisma.contentDoc.findMany({
    where: { kind: "SERVICE" },
    select: { slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const readingMatches =
    reading.length === services.length &&
    reading.every((doc, i) => doc.slug === services[i].slug);

  console.log(
    readingMatches
      ? "  ok    treatment reading order matches the services array"
      : `  FAIL  reading order differs\n      stored: ${reading.map((d) => d.slug).join(", ")}`,
  );
  if (!readingMatches) failures += 1;

  const postOrder = await prisma.contentDoc.findMany({
    where: { kind: "POST" },
    select: { slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const postsMatch =
    postOrder.length === posts.length &&
    postOrder.every((doc, i) => doc.slug === posts[i].slug);

  console.log(
    postsMatch
      ? "  ok    blog order matches the posts array"
      : `  FAIL  blog order differs\n      stored: ${postOrder.map((d) => d.slug).join(", ")}`,
  );
  if (!postsMatch) failures += 1;

  console.log(
    failures === 0
      ? "\nEvery document matches its source exactly.\n"
      : `\n${failures} problem${failures === 1 ? "" : "s"}.\n`,
  );

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
