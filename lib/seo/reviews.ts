/**
 * The studio's Google reviews, as its Google Maps listing showed them on
 * `checked`. Update by hand: open the listing, copy the rating, the count
 * and the topic counts under "Reviews", and change `checked`.
 *
 * Facts only: the rating, how many reviews, and how many Google files under
 * each topic. The review text itself stays on Google, where it belongs to
 * the people who wrote it; the pages link there to read it. Quotes the
 * studio has its clients' permission to use can be added later.
 *
 * Not in the structured data on purpose: Google does not show stars for a
 * business marking up its own reviews, and its Maps reviews are Google's to
 * mark up.
 */
export const GOOGLE_REVIEWS = {
  checked: "2026-11-05",
  rating: 5.0,
  count: 201,
  /** The listing, by its stable Maps id. */
  url: "https://maps.google.com/?cid=11674242286283109423",
} as const;

export type ReviewTopic = { topic: string; count: number };

/**
 * Google's review topics for each treatment page: the page's own first,
 * then the related ones worth showing beside it.
 */
export const REVIEW_TOPICS: Record<string, ReviewTopic[]> = {
  "/uluwatu-bali/sport-massage/": [
    { topic: "sports massage", count: 18 },
    { topic: "tension release", count: 12 },
    { topic: "deep tissue massage", count: 10 },
    { topic: "experienced with knots", count: 6 },
    { topic: "muscle tension relief", count: 6 },
  ],
  "/uluwatu-bali/lymphatic-drainage/": [{ topic: "lymphatic drainage massage", count: 22 }],
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": [
    { topic: "lymphatic drainage massage", count: 22 },
  ],
  "/uluwatu-bali/assisted-stretching/": [
    { topic: "assisted stretching", count: 19 },
    { topic: "tension release", count: 12 },
  ],
  "/uluwatu-bali/cupping-therapy/": [
    { topic: "cupping", count: 10 },
    { topic: "muscle tension relief", count: 6 },
  ],
  "/uluwatu-bali/trauma-healing/": [
    { topic: "trauma release", count: 9 },
    { topic: "tension release", count: 12 },
  ],
};
