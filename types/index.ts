/** Shared content shapes for the cloned pages. */

/** A pricing tier inside a service card ("Master Therapist" / "Therapist"). */
export type TherapistTier = {
  label: string;
  note: string;
  price: string;
  duration?: string;
};

/** Rich-text body block used by service and blog post pages. */
export type ContentBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "columns"; items: string[] }
  | { type: "image"; src: string; alt: string; width: number; height: number }
  | { type: "faq"; items: { question: string; answer: string }[] }
  | { type: "callout"; text: string };

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

/** A blog post. `category` maps to the URL prefix it lives under. */
export type Post = {
  slug: string;
  category: "uluwatu-bali" | "injury-guide";
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
  slug: "uluwatu-bali" | "injury-guide";
  label: string;
};
