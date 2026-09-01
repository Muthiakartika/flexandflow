/** Shared content shapes for the cloned pages. */

/** A pricing tier inside a service card ("Master Therapist" / "Therapist"). */
export type TherapistTier = {
  label: string;
  note: string;
  price: string;
  duration?: string;
};

/** An image inside the body, with the intrinsic size `next/image` requires. */
export type ContentImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Rich-text body block used by service and blog post pages.
 *
 * This is the CMS's storage format as well as the render format — see
 * CMS-PLAN.md §1.3. The first seven were ported from WordPress and are
 * unchanged; the five below them were added for the block editor and are
 * additive, so existing content keeps rendering exactly as it did.
 *
 * `components/content/RichText.tsx` is the only renderer, and its `switch`
 * ends in `default: return null` — a block written by a newer build degrades
 * to nothing rather than throwing.
 */
export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "columns"; items: string[] }
  | ({ type: "image" } & ContentImage)
  | { type: "faq"; items: { question: string; answer: string }[] }
  | { type: "callout"; text: string }
  /* ── Added for the CMS ─────────────────────────────────────────────── */
  /** A pull-quote with an optional name. Distinct from `callout`, the olive box. */
  | { type: "quote"; text: string; attribution?: string }
  | { type: "gallery"; images: ContentImage[] }
  /** Image beside text. `side` is which side the image takes on a wide screen. */
  | ({ type: "imageText"; text: string; side?: "left" | "right" } & ContentImage)
  | { type: "cta"; label: string; href: string; variant?: "solid" | "outline" }
  | { type: "divider"; space?: "small" | "medium" | "large"; rule?: boolean };

/** A `dt_service` entry: has its own detail page plus a priced card. */
export type Service = {
  slug: string;
  /** H1 / card title. */
  title: string;
  /** Short blurb shown on the services grid. */
  excerpt: string;
  image: string;
  /** Duration label as shown on the home page treatment cards. */
  duration?: string;
  tiers: TherapistTier[];
  seo: Seo;
  body: ContentBlock[];
  /**
   * Two of the eight service pages (assisted-stretching, facial-massage) carry
   * an extra 1300x350 banner — the service photo under a 50% white wash, with
   * the body's first heading centred on top. Most services have no such banner.
   */
  bannerImage?: string;
};

/**
 * A blog post.
 *
 * `category` is the URL prefix it lives under, and it is a plain string rather
 * than a union because categories are rows in `ContentCategory` now — the
 * studio can add one from the panel, and a compile-time union could not follow.
 * `categoryLabel` travels with it so a card or a breadcrumb can name the
 * category without a second query per post.
 */
export type Post = {
  slug: string;
  category: string;
  /**
   * The category's display name, resolved when the post was loaded.
   *
   * **Derived, not stored.** It comes from `ContentCategory`, not from the
   * post's own revision, which is why it is optional: `lib/data/posts.ts` — the
   * record of what WordPress published, and the baseline
   * `scripts/cms-import.ts` compares against — has no such field and must not
   * grow one. Consumers fall back to the slug.
   */
  categoryLabel?: string;
  title: string;
  excerpt: string;
  /** Published date as displayed on the original, e.g. "June 22, 2026". */
  date: string;
  /** Absent for posts with no featured image, as on the original. */
  image?: string;
  /** Intrinsic size of the featured image; drives the listing's masonry packing. */
  imageWidth?: number;
  imageHeight?: number;
  seo: Seo;
  body: ContentBlock[];
};

export type Seo = {
  title: string;
  description: string;
  ogImage?: string;
  /** Path on the original site, used for the canonical URL. */
  canonicalPath: string;
};

export type BlogCategory = {
  slug: string;
  label: string;
};
