/**
 * Blog categories, which are also URL prefixes.
 *
 * `/uluwatu-bali/` and `/injury-guide/` were route folders until these became
 * rows. `app/(main)/[category]/` serves them now, so a third one is a record
 * rather than a deploy.
 *
 * Not `server-only`: the reserved list and the slug rules are checked in the
 * editor as well as in the action, and a second copy of them would eventually
 * disagree with this one. The queries below are in `lib/cms/category-store.ts`,
 * which is server-only.
 */

/**
 * Slugs a category may never take.
 *
 * Next resolves a static segment before a dynamic one, so a category called
 * `services` would not *break* `/services` — it would be shadowed by it, which
 * is worse: the category would exist in the panel, list its posts, and answer
 * 404 for every one of them with nothing on screen to explain why.
 *
 * Everything with a folder under `app/` is here, including the other two route
 * groups. `admin` and `api` are on the list even though they are not in
 * `(main)`: route groups do not appear in the URL, so all three share one
 * namespace.
 */
export const RESERVED_SLUGS: readonly string[] = [
  /* (main) */
  "about-us",
  "appointment",
  "blog",
  "contact-us",
  "price-list",
  "services",
  "therapist",
  /* (academy) */
  "academy",
  "courses",
  "materials",
  "register",
  "schedule",
  /* (admin) and the API */
  "admin",
  "api",
  /* Next's own, and the files at the root of the site. */
  "_next",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "images",
  "photos",
  "shapes",
  "video",
  "uploads",
];

export type Category = {
  id: string;
  slug: string;
  label: string;
  lead: string | null;
  seoTitle: string;
  seoDescription: string | null;
  locked: boolean;
  sortOrder: number;
};

/** Why a slug cannot be used, or null if it can. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter a web address for the category.";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Use lower-case letters, numbers and single hyphens only.";
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return `“${slug}” is already a page on this site, so a category cannot use it — every post in it would answer “not found”.`;
  }

  if (slug.length > 60) return "That is too long for a web address.";

  return null;
}

/** The treatments' home. Renaming it would unpublish all nine at once. */
export const TREATMENT_PREFIX = "uluwatu-bali";
