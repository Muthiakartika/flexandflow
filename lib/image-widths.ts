/**
 * The widths every photo in `public/images/` is pre-resized to, as WebP, by
 * `scripts/image-variants.mjs` (run before `next build` and `next dev`), and
 * that `lib/image-loader.ts` points `next/image` at. Shared so the two cannot
 * drift: a width the loader asks for that the script never wrote would be a
 * broken image.
 *
 * They cover what the layout asks for (`deviceSizes` and `imageSizes` in
 * `next.config.ts`): 128 for avatars and logos at 2–3× density, up to 1920
 * for the widest photo on a 2× screen. Kept in step with those lists; the
 * loader rounds a requested width up to the next one here.
 */
export const IMAGE_WIDTHS = [128, 256, 384, 640, 828, 1080, 1920] as const;

/** Where the variants live: under `/images/` so Cloudflare's cache rule for
 *  that path covers them, in a folder of their own that git ignores. */
export const VARIANT_DIR = "/images/_v";
