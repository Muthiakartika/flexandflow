/**
 * Posts per page, matching the WordPress listing.
 *
 * In its own module because `SearchableGrid` is a client component and needs
 * it: importing it from `BlogListing`, where it used to live, would pull that
 * file's `BlogSidebar` — an async Server Component that queries the CMS — into
 * the client graph and fail the build. `BlogListing` re-exports it, so the
 * existing `import { POSTS_PER_PAGE } from "@/components/blog/BlogListing"`
 * call sites keep working.
 */
export const POSTS_PER_PAGE = 6;

/**
 * Where page *n* of a listing lives. Page 1 is the bare listing URL — that is
 * the shape WordPress published and the shape `/blog/page/[page]` enforces by
 * 404ing on `page=1`.
 *
 * A function rather than the prop it replaced, because the listing now spans
 * the server/client boundary and **functions cannot be passed to a Client
 * Component**. `BlogListing` used to take `hrefFor` and both of its callers
 * supplied the same closure; they pass a `basePath` string now and each side
 * builds the href from this, so the two can never drift.
 */
export function listingHref(basePath: string, page: number): string {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}
