/**
 * Turns a picture uploaded from the panel into a WebP before it is stored.
 *
 * The site's own photos are compressed at build time (`npm run
 * images:optimize`, `scripts/image-variants.mjs`), but CMS uploads go to the
 * media host and are served exactly as stored — the custom loader returns
 * them untouched and Vercel's optimizer is off (IMAGE-QUOTA.md). A picture
 * straight off a phone is 4000px and 3–8 MB, and that is what every visitor
 * would download. So every raster upload — JPEG, PNG, WebP, AVIF, GIF — is
 * stored as WebP, width capped at 1920px:
 *
 * - quality 80 for photographic sources (JPEG, WebP, AVIF), the usual
 *   "can't tell" threshold; 88 for PNG and GIF, which are more often
 *   screenshots and graphics where text edges show artefacts first;
 * - transparency is kept (WebP has an alpha channel);
 * - an animated GIF or WebP stays animated, every frame converted.
 *
 * The one exception is **SVG**: it is a vector (logos, icons) and rasterising
 * it would make it blurry at every size but one, so it is stored as it came.
 * Bytes sharp cannot decode are refused rather than stored, so nothing but
 * WebP and SVG ever reaches the media host.
 *
 * Not `server-only`, so `scripts/check-upload-compress.ts` can call it.
 */
import sharp from "sharp";

export const UPLOAD_MAX_WIDTH = 1920;

export type Converted =
  | {
      ok: true;
      bytes: Buffer;
      mimeType: "image/webp" | "image/svg+xml";
      /** The filename with its extension switched to match `mimeType`. */
      filename: string;
      width: number | null;
      height: number | null;
    }
  | { ok: false; message: string };

function asWebpName(filename: string): string {
  const stem = filename.replace(/\.[^./\\]+$/, "") || "image";
  return `${stem}.webp`;
}

export async function convertUpload(original: Buffer, mimeType: string, filename: string): Promise<Converted> {
  if (mimeType === "image/svg+xml") {
    return { ok: true, bytes: original, mimeType, filename, width: null, height: null };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(original).metadata();
  } catch {
    return { ok: false, message: "This file could not be read as an image. Export it again as JPG or PNG and retry." };
  }

  const animated = (meta.pages ?? 1) > 1;
  const graphic = mimeType === "image/png" || mimeType === "image/gif";

  try {
    /* `rotate()` applies the EXIF orientation before the resize, so a
       portrait phone photo is capped on the width it is displayed at, and
       the output carries no EXIF — including the GPS position a phone writes
       into it, which has no business on a public page. Animated input keeps
       every frame (`animated: true`); `rotate()` is skipped there because
       sharp cannot rotate a multi-page image and GIFs carry no EXIF. */
    const input = sharp(original, { animated });
    const pipeline = (animated ? input : input.rotate()).resize({
      width: UPLOAD_MAX_WIDTH,
      withoutEnlargement: true,
    });

    const { data, info } = await pipeline
      .webp({ quality: graphic ? 88 : 80, effort: 6, ...(animated ? { loop: meta.loop ?? 0 } : {}) })
      .toBuffer({ resolveWithObject: true });

    return {
      ok: true,
      bytes: data,
      mimeType: "image/webp",
      filename: asWebpName(filename),
      width: info.width,
      /* For an animated image `info.height` is every frame stacked. */
      height: animated ? (info.pageHeight ?? info.height) : info.height,
    };
  } catch {
    return { ok: false, message: "This image could not be converted. Export it again as JPG or PNG and retry." };
  }
}
