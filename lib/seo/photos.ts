/**
 * Pages whose photo the agency sets in code, in place of the panel's: the
 * studio's own photos where the panel has a stock one.
 *
 * The photo replaces the panel's wherever the page's picture is used: its
 * hero, its cards across the site, the structured data and the link preview
 * (`seo.ogImage`). The database is never written, so the panel keeps showing
 * its photo, and changing it there changes nothing on the site.
 *
 * Keyed by canonical path with both slashes. `npm run check:seo` confirms
 * every file is in `public/`, and with a URL that the page's link preview
 * serves it.
 */
import type { Seo } from "@/types";

export type PagePhoto = { src: string; width: number; height: number };

export const PAGE_PHOTOS: Record<string, PagePhoto> = {
  /* Taken at the studio, November 2026. */
  "/uluwatu-bali/pregnancy-massage-service/": {
    src: "/images/2026/11/pregnancy-massage-side-lying.jpg",
    width: 1376,
    height: 768,
  },
  "/uluwatu-bali/what-is-a-pregnancy-massage/": {
    src: "/images/2026/11/pregnancy-massage-hips.jpg",
    width: 1376,
    height: 768,
  },
};

/** The page with its code photo in place of the panel's. */
export function withPagePhoto<
  T extends { seo: Seo; image?: string; imageWidth?: number; imageHeight?: number },
>(entry: T): T {
  const photo = PAGE_PHOTOS[entry.seo.canonicalPath];
  return photo
    ? {
        ...entry,
        image: photo.src,
        /* Only articles carry the size (their listing packs by it). */
        ...("imageWidth" in entry ? { imageWidth: photo.width, imageHeight: photo.height } : {}),
        seo: { ...entry.seo, ogImage: photo.src },
      }
    : entry;
}
