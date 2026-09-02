/**
 * `/api/cache/purge/` — drop Cloudflare's edge copy of this site.
 *
 * Cloudflare proxies `flexandflow.fit` and caches the HTML for two hours
 * (`lib/cloudflare/purge.ts` explains why that matters). A Vercel deployment
 * changes what the origin serves; it does not touch what the edge is already
 * holding. This endpoint is the thing that does.
 *
 * **The trailing slash is load-bearing.** `trailingSlash: true` applies to
 * route handlers too, so `/api/cache/purge` answers 308 and a webhook sender
 * that does not follow redirects on POST never arrives. Register it as
 * `https://flexandflow.fit/api/cache/purge/` — same trap as the Xendit
 * callback, and it has already caught someone once.
 *
 * Authenticated with `CRON_SECRET`, not a fourth secret of its own. It is the
 * same category of caller — a machine, holding a shared bearer token, asking
 * the deployed app to do something it already knows how to do — and every
 * scheduler that would call this already has that value. A separate secret
 * would be one more thing to rotate and one more thing to leave unset.
 *
 * Two ways in, both fine:
 *
 *   * `POST` with no body, or `{"urls": []}` → purge the whole zone. This is
 *     what runs after a deploy.
 *   * `POST {"urls": ["/blog/my-post/", "/blog/"]}` → purge just those. Paths
 *     are resolved against `NEXT_PUBLIC_SITE_URL`; anything up to 30 URLs goes
 *     in one request and the rest are chunked.
 *
 * `GET` does the same as `POST`, for the same reason the cron routes accept
 * both: a `curl` check should not need a flag to be remembered.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { isAuthorisedCron } from "@/lib/booking/tokens";
import {
  CloudflarePurgeError,
  normalisePurgeUrls,
  purgeEverything,
  purgeUrls,
} from "@/lib/cloudflare/purge";
import { cachePurgeEnabled, env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Chunked purges are sequential; 30 URLs at a time adds up on a long list. */
export const maxDuration = 60;

/**
 * The requested URLs, or `null` for "everything".
 *
 * A missing, empty or unparseable body means everything — this endpoint is
 * called by shell scripts and webhook senders, and `curl -X POST` with no
 * `--data` is the most likely way anyone ever reaches it. Failing that request
 * on a JSON parse error would be pedantry with a stale site as the cost.
 */
async function requestedUrls(request: Request): Promise<string[] | null> {
  if (request.method !== "POST") return null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== "object") return null;
  const urls = (body as { urls?: unknown }).urls;
  if (!Array.isArray(urls)) return null;

  const strings = urls.filter((entry): entry is string => typeof entry === "string");
  return strings.length > 0 ? strings : null;
}

async function run(request: Request): Promise<Response> {
  /* `ApiError` has no "unauthorised" code — no customer-facing endpoint has
     any authentication to fail — so this borrows NOT_FOUND and overrides the
     status, exactly as the cron routes do. An unauthenticated caller learns
     nothing either way. */
  if (!isAuthorisedCron(request)) {
    return fail("NOT_FOUND", "Not authorised.", { status: 401 });
  }

  /* Fails closed, like payments: with no credentials there is nothing this can
     do, and answering 200 would tell a deploy pipeline the cache was cleared
     when no request was ever made. */
  if (!cachePurgeEnabled()) {
    return fail(
      "NOT_FOUND",
      "Cloudflare purge is not configured on this deployment.",
      { status: 404 },
    );
  }

  const credentials = {
    zoneId: env().CLOUDFLARE_ZONE_ID ?? "",
    apiToken: env().CLOUDFLARE_API_TOKEN ?? "",
  };

  try {
    const requested = await requestedUrls(request);

    const result = requested
      ? await purgeUrls(
          credentials,
          normalisePurgeUrls(requested, env().NEXT_PUBLIC_SITE_URL),
        )
      : await purgeEverything(credentials);

    return ok(result);
  } catch (error) {
    if (error instanceof CloudflarePurgeError) {
      /* Cloudflare's own message, verbatim. The caller is a machine or an
         operator reading CI output, and "10000: Authentication error" points
         at the token in a way "purge failed" does not. */
      console.error("[cache] purge failed", error.message);
      return fail("SERVER", error.message, { status: 502 });
    }

    console.error("[cache] purge failed", error);
    return serverError("Purge failed.");
  }
}

export const GET = run;
export const POST = run;
