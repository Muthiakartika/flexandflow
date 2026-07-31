import type { Post } from "@/types";

/**
 * Pack posts into N columns the way the original's isotope masonry does: walk
 * them in order and drop each into whichever column is currently shorter.
 * Card height is dominated by the image's aspect ratio, so that plus a
 * constant for the text block reproduces the original's distribution.
 */
export function packColumns(posts: Post[], columns = 2): Post[][] {
  const buckets: Post[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);

  for (const post of posts) {
    const ratio =
      post.image && post.imageWidth && post.imageHeight
        ? post.imageWidth / post.imageHeight
        : 0;
    /* Image height as a share of column width, plus the text block. */
    const height = (ratio ? 100 / ratio : 0) + 40;

    const target = heights.indexOf(Math.min(...heights));
    buckets[target].push(post);
    heights[target] += height;
  }

  return buckets;
}
