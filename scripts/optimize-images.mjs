/**
 * Shrink the studio's photography in place.
 *
 *   npm run images:optimize -- --dry     report only, write nothing
 *   npm run images:optimize              rewrite the files
 *
 * ## Why in place, and why the extension never changes
 *
 * The obvious version of this script converts everything to WebP and unlinks
 * the original. That is wrong *here*, and the reason is worth stating because
 * it is invisible from the filesystem: **these paths are stored in the
 * database**. Every file under `public/images` and `public/photos` has a
 * `MediaAsset` row keyed on its URL, and the published `ContentRevision`
 * blocks reference the same strings. Renaming `x.jpg` to `x.webp` would take
 * the pictures off live, published pages and leave the media library pointing
 * at files that no longer exist.
 *
 * So: same directory, same filename, same format. Only the bytes change.
 * Because the bytes change, `MediaAsset.checksum` (SHA-256, unique, the
 * upload de-duplicator), `bytes`, `width` and `height` all go stale — run
 * `npm run images:sync` afterwards, which is the other half of this job.
 *
 * ## What it actually does
 *
 * 1. **Caps the width at `MAX_WIDTH`.** This is the single biggest win and it
 *    costs nothing visually: `images.deviceSizes` in `next.config.ts` tops out
 *    at 1920, so the optimizer can never serve a pixel wider than that. A
 *    3168px source is 100% waste — decoded and thrown away on every cache
 *    MISS, and shipped in full with every deployment.
 * 2. **Re-encodes.** These came out of WordPress at whatever quality the
 *    uploader chose. mozjpeg at 80 is visually indistinguishable at the sizes
 *    this site renders and is much smaller.
 * 3. **Keeps the original if the result is bigger.** Already-tight files exist
 *    and re-encoding them twice only adds generation loss.
 *
 * `sharp` is already a dependency (Next uses it for the optimizer itself), so
 * there is nothing new to install.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * The largest width the optimizer can ever serve — keep in step with the last
 * entry of `images.deviceSizes` in `next.config.ts`. Anything above this is
 * decoded and discarded.
 */
const MAX_WIDTH = 1920;

/** JPEG quality. 80 with mozjpeg is the usual "can't tell" threshold. */
const JPEG_QUALITY = 80;

/**
 * `uploads/` is excluded on purpose: those files are content-addressed and
 * already optimised on the way in, and rewriting one would break the checksum
 * its filename is derived from. `shapes/` is SVG. `video/` is not images.
 */
const ROOTS = ["images", "photos"];

const dryRun = process.argv.slice(2).some((a) => a === "--dry" || a === "--dry-run");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Re-encode to the same format the file already is. */
async function encode(pipeline, format) {
  if (format === "png") {
    return pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
  return pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
    .toBuffer();
}

async function main() {
  const publicDir = path.join(process.cwd(), "public");

  let before = 0;
  let after = 0;
  let rewritten = 0;
  let untouched = 0;
  /** What a format change would additionally buy, reported but never applied. */
  let webpWouldBe = 0;

  for (const root of ROOTS) {
    for await (const file of walk(path.join(publicDir, root))) {
      if (!/\.(jpe?g|png)$/i.test(file)) continue;

      const original = await readFile(file);
      const meta = await sharp(original).metadata();
      const rel = path.relative(publicDir, file).split(path.sep).join("/");

      /* `withoutEnlargement` is what makes this a cap rather than a resize, so
         narrower files pass through untouched and there is no need to consult
         `meta.width` for the target. That matters more than it looks: `rotate()`
         honours EXIF orientation before the resize runs, and on a portrait
         phone photo tagged orientation 6 the stored width is the *height* of
         the picture you see. Nothing in `public/` carries a non-default
         orientation today; a future upload well might. */
      const resize = { width: MAX_WIDTH, withoutEnlargement: true };

      const output = await encode(
        sharp(original).rotate().resize(resize),
        meta.format,
      );

      /* Reported only. Converting would change the file extension, and these
         paths are in the database — see the header. */
      const asWebp = await sharp(original)
        .rotate()
        .resize(resize)
        .webp({ quality: 88, effort: 6 })
        .toBuffer();

      before += original.length;
      webpWouldBe += Math.min(asWebp.length, original.length);

      const kb = (n) => `${Math.round(n / 1024)} kB`;

      if (output.length >= original.length) {
        after += original.length;
        untouched += 1;
        console.log(`  keep     /${rel}  ${kb(original.length)} (re-encode was no smaller)`);
        continue;
      }

      after += output.length;
      rewritten += 1;

      const resized =
        (meta.width ?? 0) > MAX_WIDTH ? ` ${meta.width}px → ${MAX_WIDTH}px` : "";
      const drop = Math.round((1 - output.length / original.length) * 100);
      console.log(
        `  ${dryRun ? "would  " : "wrote  "} /${rel}  ${kb(original.length)} → ${kb(output.length)}  −${drop}%${resized}`,
      );

      if (!dryRun) await writeFile(file, output);
    }
  }

  const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
  console.log(
    `\n${rewritten} ${dryRun ? "to rewrite" : "rewritten"}, ${untouched} already tight.`,
  );
  console.log(
    `  ${mb(before)} → ${mb(after)}  (−${Math.round((1 - after / before) * 100)}%)`,
  );
  console.log(
    `  for reference, converting to WebP would reach ${mb(webpWouldBe)} — but it` +
      `\n  renames every file, and these paths are stored in the database.`,
  );
  if (!dryRun) {
    console.log(`\nNow run:  npm run images:sync`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
