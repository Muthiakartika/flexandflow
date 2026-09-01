/**
 * Registers the images that ship under `public/` in the media library.
 *
 * Without this the picker opens empty, and the owner's first impression of the
 * CMS is that all the studio's photography has vanished. Nothing is copied or
 * moved: the rows point at the same root-relative paths the ported copy
 * already references, so no existing page changes.
 *
 * They are marked `builtIn`, which makes them undeletable from the panel —
 * the file stays in the build whatever the row says, and removing the row
 * would only hide it from the picker while leaving the pages using it intact.
 *
 *   npm run cms:media
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { PrismaNeon } from "@prisma/adapter-neon";
import sharp from "sharp";

import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

/** Where the studio's own pictures live. `uploads/` is excluded — those
 *  already have rows, and `video/` is not media this picker offers. */
const ROOTS = ["images", "photos"];

const EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");

  let created = 0;
  let existing = 0;
  let skipped = 0;

  for (const root of ROOTS) {
    const base = path.join(publicDir, root);

    try {
      await stat(base);
    } catch {
      continue;
    }

    for await (const file of walk(base)) {
      const ext = path.extname(file).toLowerCase();
      const mimeType = EXTENSIONS[ext];

      if (!mimeType) {
        skipped += 1;
        continue;
      }

      /* Forward slashes: this becomes a URL, and `path.relative` gives
         backslashes on Windows, which would produce `/images\2026\08\x.jpg`. */
      const url = `/${path.relative(publicDir, file).split(path.sep).join("/")}`;

      const already = await prisma.mediaAsset.findUnique({
        where: { url },
        select: { id: true },
      });

      if (already) {
        existing += 1;
        continue;
      }

      const bytes = await readFile(file);
      const { createHash } = await import("node:crypto");
      const checksum = createHash("sha256").update(bytes).digest("hex");

      /* Two paths holding identical bytes. The checksum is unique, so the
         second one cannot be registered — and should not be: they are the same
         picture, and the row that exists already points at a working URL. */
      const duplicate = await prisma.mediaAsset.findUnique({
        where: { checksum },
        select: { url: true },
      });

      if (duplicate) {
        console.log(`  dup      ${url}\n           same bytes as ${duplicate.url}`);
        existing += 1;
        continue;
      }

      let width: number | null = null;
      let height: number | null = null;

      if (mimeType !== "image/svg+xml") {
        try {
          const meta = await sharp(bytes).metadata();
          width = meta.width ?? null;
          height = meta.height ?? null;
        } catch {
          /* Registered without dimensions rather than dropped. */
        }
      }

      await prisma.mediaAsset.create({
        data: {
          url,
          checksum,
          filename: path.basename(file),
          mimeType,
          bytes: bytes.byteLength,
          width,
          height,
          builtIn: true,
        },
      });

      created += 1;
      console.log(`  added    ${url}${width ? ` (${width}×${height})` : ""}`);
    }
  }

  console.log(
    `\n${created} registered, ${existing} already known, ${skipped} not images.\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
