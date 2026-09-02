/**
 * Re-read the files under `public/` and bring their `MediaAsset` rows back in
 * step with them.
 *
 *   npm run images:sync -- --dry     report only
 *   npm run images:sync              write
 *
 * The companion to `npm run images:optimize`, which rewrites those files in
 * place. Once the bytes change, four columns on the row are describing a file
 * that no longer exists:
 *
 * - **`checksum`** — SHA-256 of the bytes, and `@unique`. This is the upload
 *   de-duplicator: `lib/cms/media.ts` returns the existing row instead of
 *   storing a second copy when the hash matches. Left stale, re-uploading one
 *   of these pictures through the panel would store a duplicate rather than
 *   recognise it.
 * - **`bytes`**, **`width`**, **`height`** — what the media picker shows.
 *
 * ## What it deliberately does not touch
 *
 * `ContentRevision.imageWidth` / `imageHeight`, and the `width`/`height` on
 * image blocks inside `body`. Those look stale after a resize and are not:
 * `next/image` uses them for the **aspect ratio**, and the resize is
 * proportional, so 3168×4752 and 1920×2880 produce an identical layout. It
 * also never upscales, so a larger number cannot make it request a width the
 * file does not have. Rewriting published revisions to change a number that
 * changes nothing on screen is a worse trade than leaving it.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaNeon } from "@prisma/adapter-neon";
import sharp from "sharp";

import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const dryRun = process.argv
  .slice(2)
  .some((a) => a === "--dry" || a === "--dry-run");

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");

  /* Only the files that ship in the repo. Uploads are content-addressed and
     live in object storage; nothing local rewrites them. */
  const assets = await prisma.mediaAsset.findMany({ where: { builtIn: true } });

  let changed = 0;
  let same = 0;
  let missing = 0;
  let blocked = 0;

  for (const asset of assets) {
    if (!asset.url.startsWith("/")) continue;

    let bytes: Buffer;
    try {
      bytes = await readFile(path.join(publicDir, asset.url));
    } catch {
      missing += 1;
      console.log(`  missing  ${asset.url}`);
      continue;
    }

    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum === asset.checksum && bytes.length === asset.bytes) {
      same += 1;
      continue;
    }

    /* Two paths can hold byte-identical files — `/photos/…` and `/images/…`
       carry several of the same pictures — and `checksum` is unique. Re-encode
       them both and the second update collides. Keeping the old hash on the
       loser is harmless: it is a de-duplication hint, not an identity, and the
       row it would collide with already represents these bytes. */
    const clash = await prisma.mediaAsset.findFirst({
      where: { checksum, id: { not: asset.id } },
      select: { url: true },
    });

    let width: number | null = asset.width;
    let height: number | null = asset.height;
    try {
      const meta = await sharp(bytes).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      /* SVG and friends: no raster dimensions, and none were stored either. */
    }

    const resized = width !== asset.width || height !== asset.height;
    console.log(
      `  ${dryRun ? "would  " : "synced "} ${asset.url}` +
        `  ${Math.round(asset.bytes / 1024)} kB → ${Math.round(bytes.length / 1024)} kB` +
        (resized ? `  ${asset.width}×${asset.height} → ${width}×${height}` : ""),
    );

    if (clash) {
      blocked += 1;
      console.log(`           keeping old checksum — same bytes as ${clash.url}`);
    }

    changed += 1;
    if (dryRun) continue;

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        bytes: bytes.length,
        width,
        height,
        ...(clash ? {} : { checksum }),
      },
    });
  }

  console.log(
    `\n${changed} ${dryRun ? "to sync" : "synced"}, ${same} unchanged` +
      (missing ? `, ${missing} missing from disk` : "") +
      (blocked ? `, ${blocked} kept their checksum (duplicate bytes)` : "") +
      ".",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
