/**
 * Dropping Cloudflare's copy of whatever a CMS change just altered.
 *
 * There are three caches between a published revision and a reader, and they
 * have to be cleared in the right order to be cleared at all:
 *
 *   1. **Next's own** — the prerendered page on Vercel. `revalidateFor` in
 *      `lib/cms/write.ts` handles this with `updateTag` and `revalidatePath`.
 *   2. **Cloudflare's edge** — this module. The zone is proxied and holds the
 *      HTML for hours.
 *   3. **The reader's browser** — `cache-control: max-age=7200` reaches them
 *      too, and nothing server-side can reach back. A visitor who loaded the
 *      old article ten minutes ago keeps it until it expires. Lower
 *      Cloudflare's Browser Cache TTL if that ever matters more than the
 *      bandwidth it saves.
 *
 * The order is why this hangs off `revalidateFor` rather than off the publish
 * action directly. Purging Cloudflare *before* Next has been told the page
 * changed simply refetches the same stale render and caches it again — the
 * purge appears to do nothing, twice.
 *
 * ## It never fails a publish
 *
 * Scheduled with `after()`, exactly as booking notifications are, and for the
 * same reason: an expired Cloudflare token must not be able to stop the owner
 * publishing an article. The worst case here is a page that stays stale for a
 * couple of hours — annoying, and much better than a publish that appears to
 * have failed. Failures are logged and swallowed.
 *
 * ## The URL list mirrors `revalidateFor`
 *
 * Not approximately. Any page Next regenerates must also be dropped from the
 * edge, or the edge keeps serving the old one; any page it does not regenerate
 * is pointless to purge, because Cloudflare would just fetch the same bytes
 * back. Change one list and change the other.
 *
 * Purge by URL is capped at 30 per request on this plan, so a list longer than
 * that falls back to emptying the zone. That is the honest trade: chunking to
 * name every blog page precisely is more requests and more ways to be wrong
 * than one blunt purge that refills from Vercel's cache on first request.
 */
import "server-only";

import { after } from "next/server";

/* The pagination arithmetic has to match the route's exactly — one page out
   and the purge misses the listing somebody is actually looking at. Importing
   the constant is what keeps them from drifting. */
import { POSTS_PER_PAGE } from "@/components/blog/BlogListing";
import { publishedParams } from "@/lib/cms/read";
import type { DocIdentity } from "@/lib/cms/write";
import {
  CloudflarePurgeError,
  isLoopbackOrigin,
  MAX_URLS_PER_PURGE,
  normalisePurgeUrls,
  purgeEverything,
  purgeUrls,
} from "@/lib/cloudflare/purge";
import { cachePurgeEnabled, env } from "@/lib/env";

/**
 * The credentials, or `null` when there is nothing sensible to purge.
 *
 * Both checks live here rather than at the call sites so neither can throw in
 * the middle of a publish: `env()` validates the whole schema, and a loopback
 * origin means a dev server with nothing in front of it.
 */
function credentials(): { zoneId: string; apiToken: string } | null {
  if (!cachePurgeEnabled()) return null;
  if (isLoopbackOrigin(env().NEXT_PUBLIC_SITE_URL)) return null;

  return {
    zoneId: env().CLOUDFLARE_ZONE_ID ?? "",
    apiToken: env().CLOUDFLARE_API_TOKEN ?? "",
  };
}

/** What every failure here does: says so, and stops. */
function report(error: unknown): void {
  /* Swallowed on purpose. The change already succeeded and the database is
     correct; this is the cache catching up, and it must not turn a successful
     publish into an error toast. Cloudflare's own wording is logged because it
     names the cause — "10000: Authentication error" is a token to fix, not a
     fault to investigate. */
  console.error(
    "[cms] edge purge failed",
    error instanceof CloudflarePurgeError ? error.message : error,
  );
}

/**
 * Every public path a change to one document can alter.
 *
 * Read from the database rather than assumed, so "every other treatment page"
 * means the nine that exist today and the tenth the day it is added.
 */
async function affectedPaths(doc: DocIdentity): Promise<string[]> {
  const paths = new Set<string>();

  /* The page's own address, taken from the identity passed in rather than
     looked up: on a move this runs once for the old address and once for the
     new one, and by then the row no longer records where it used to live. */
  paths.add(`/${doc.urlPrefix}/${doc.slug}/`);
  /* Publishing adds a URL to the sitemap and unpublishing removes one. */
  paths.add("/sitemap.xml");

  if (doc.kind === "SERVICE") {
    paths.add("/");
    paths.add("/services/");
    paths.add("/price-list/");
    /* Every treatment page lists every other treatment in its sidebar, so a
       renamed or repriced one is wrong on eight pages besides its own. */
    for (const sibling of await publishedParams("SERVICE")) {
      paths.add(`/${sibling.urlPrefix}/${sibling.slug}/`);
    }
    return [...paths];
  }

  paths.add(`/${doc.urlPrefix}/`);
  for (const sibling of await publishedParams("POST", doc.urlPrefix)) {
    paths.add(`/${sibling.urlPrefix}/${sibling.slug}/`);
  }

  /* Page 1 lives at `/blog/`; `/blog/page/[page]` starts at 2. One page beyond
     the current count on purpose — publishing the seventh post creates a page
     that did not exist before, and unpublishing it leaves one that has to stop
     existing. Both are edge-cached either way. */
  const published = await publishedParams("POST");
  const pages = Math.max(1, Math.ceil(published.length / POSTS_PER_PAGE));
  paths.add("/blog/");
  for (let page = 2; page <= pages + 1; page += 1) {
    paths.add(`/blog/page/${page}/`);
  }

  return [...paths];
}

/**
 * Schedule the edge purge for one document's change.
 *
 * Call it from `revalidateFor` and nowhere else — see the note at the top
 * about ordering. Returns immediately; the work happens after the response.
 *
 * `updateDocSettings` calls `revalidateFor` twice, for the address before and
 * after a move, so a move costs two purges. Coalescing them would mean
 * threading state through for the sake of one extra API call, which is not a
 * trade worth making.
 */
export function purgeEdgeFor(doc: DocIdentity): void {
  after(async () => {
    try {
      const cloudflare = credentials();
      if (!cloudflare) return;

      const urls = normalisePurgeUrls(
        await affectedPaths(doc),
        env().NEXT_PUBLIC_SITE_URL,
      );

      if (urls.length > MAX_URLS_PER_PURGE) {
        await purgeEverything(cloudflare);
        console.log(
          `[cms] edge purge: whole zone (${urls.length} URLs affected, over the ${MAX_URLS_PER_PURGE} limit)`,
        );
        return;
      }

      await purgeUrls(cloudflare, urls);
      console.log(`[cms] edge purge: ${urls.length} URL(s)`);
    } catch (error) {
      report(error);
    }
  });
}

/**
 * Schedule a whole-zone purge, for changes too wide to enumerate.
 *
 * Renaming a category moves every post inside it, so the edge is left holding
 * each one at its **old** address — and those addresses are exactly what the
 * database no longer records, because the rename is what removed them. Listing
 * them would mean reconstructing a cross product of every category slug
 * involved against every post that moved, to save a purge of a zone with 32
 * pages in it. Category changes are rare and this is always right.
 */
export function purgeEdgeEverything(reason: string): void {
  after(async () => {
    try {
      const cloudflare = credentials();
      if (!cloudflare) return;

      await purgeEverything(cloudflare);
      console.log(`[cms] edge purge: whole zone (${reason})`);
    } catch (error) {
      report(error);
    }
  });
}
