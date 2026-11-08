/**
 * `next/image`'s loader (`images.loaderFile` in `next.config.ts`).
 *
 * Vercel's optimizer is off: its Hobby quota ran out on 2 September 2026 and
 * left photos answering 402 (IMAGE-QUOTA.md). Since then every phone has
 * downloaded the full 1920px JPEG, even for a 36px avatar. This gets the
 * optimizer's result without the quota: `scripts/image-variants.mjs` writes
 * each photo in `public/images/` as WebP at the widths in
 * `lib/image-widths.ts`, before every build, and this points `srcset` at
 * them. They are plain static files, so Vercel serves them like any other and
 * Cloudflare caches them under `/images/`.
 *
 * Anything else is returned as it is: SVGs and GIFs, CMS uploads on the media
 * host (`https://media.flexandflow.fit/uploads/…`), and the variants
 * themselves. Images given the `unoptimized` prop (the CMS editor's previews)
 * never reach a loader.
 */
import { IMAGE_WIDTHS, VARIANT_DIR } from "./image-widths";

const RESIZABLE = /^\/images\/(?!_v\/)[^?#]+\.(?:jpe?g|png)$/i;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!RESIZABLE.test(src)) return src;
  const w = IMAGE_WIDTHS.find((candidate) => candidate >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${VARIANT_DIR}${src.slice("/images".length).replace(/\.(?:jpe?g|png)$/i, "")}.${w}.webp`;
}
