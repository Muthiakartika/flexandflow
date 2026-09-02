/**
 * Cloudflare cache purge.
 *
 * `flexandflow.fit` resolves to Cloudflare, not to Vercel: the zone is proxied
 * (orange cloud), so every response the public sees has passed through
 * Cloudflare's edge and may have been served from it. The site's HTML goes out
 * `cache-control: public, max-age=7200, must-revalidate`, which means a fresh
 * Vercel deployment is invisible to anyone whose nearest Cloudflare colo still
 * holds a copy — for up to two hours, at a different moment in each colo. The
 * owner publishes, reloads, sees the old page, and reasonably concludes the
 * deploy failed. Purging on deploy is what closes that gap.
 *
 * This module is deliberately **pure**: credentials come in as arguments and
 * nothing here reads `process.env`. That is what lets the same code serve the
 * route handler (which reads `lib/env.ts`, a `server-only` module) and
 * `scripts/purge-cache.ts` (which runs under `tsx`, outside Next, where
 * importing `server-only` throws).
 *
 * Two things about the API that are worth knowing rather than discovering:
 *
 *   * **A failed purge can answer HTTP 200.** Cloudflare reports application
 *     errors in the body, as `success: false` with an `errors` array, and only
 *     uses 4xx for the more obvious refusals. `response.ok` is therefore not
 *     enough — a purge that silently did nothing is worse than one that
 *     throws, because the deploy pipeline goes green either way.
 *   * **The zone is on the Free plan**, so exactly two of the five purge modes
 *     are available: `purge_everything`, and `files` — purge by URL, capped at
 *     **30 URLs per request**. `prefixes`, `tags` and `hosts` are Enterprise
 *     only and answer with an error rather than being ignored. Do not reach
 *     for them here without checking the plan first.
 *
 * Purge by URL is an exact string match on the full URL, including scheme,
 * host, trailing slash and query. `trailingSlash: true` in `next.config.ts`
 * means the canonical form of every page carries the slash, so
 * `normalisePurgeUrls` puts it back — `/price-list` and `/price-list/` are two
 * different cache keys, and purging the first leaves the live page stale.
 */

/** Cloudflare's per-request ceiling on `files`. Free and Pro alike. */
export const MAX_URLS_PER_PURGE = 30;

/** Cloudflare answers a purge in well under a second; this is a backstop. */
const TIMEOUT_MS = 15_000;

const API_BASE = "https://api.cloudflare.com/client/v4";

export type CloudflareCredentials = {
  /** Zone ID, from the Cloudflare dashboard's overview sidebar. */
  zoneId: string;
  /** An API token with `Zone → Cache Purge → Purge`. Not the Global API Key. */
  apiToken: string;
};

export type PurgeResult = {
  /** `"everything"`, or the normalised URLs that were actually sent. */
  purged: "everything" | string[];
  /** How many API calls it took. More than one only when chunking by 30. */
  requests: number;
};

/**
 * A purge that did not happen, whatever the HTTP status said.
 *
 * `codes` carries Cloudflare's own error codes so a caller can tell an expired
 * token (a thing to fix once) from a rate limit (a thing to retry).
 */
export class CloudflarePurgeError extends Error {
  readonly codes: number[];
  readonly status: number | null;

  constructor(
    message: string,
    codes: number[] = [],
    status: number | null = null,
  ) {
    super(message);
    this.name = "CloudflarePurgeError";
    this.codes = codes;
    this.status = status;
  }
}

type CloudflareEnvelope = {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: { id?: string } | null;
};

function describe(errors: CloudflareEnvelope["errors"]): string {
  if (!errors?.length) return "Cloudflare rejected the purge without saying why.";
  return errors
    .map((error) => `${error.code ?? "?"}: ${error.message ?? "no message"}`)
    .join("; ");
}

/**
 * One purge request. `body` is Cloudflare's own shape — `{purge_everything}`
 * or `{files}` — so the two callers below stay thin.
 */
async function post(
  credentials: CloudflareCredentials,
  body: Record<string, unknown>,
): Promise<void> {
  const { zoneId, apiToken } = credentials;

  if (!zoneId || !apiToken) {
    throw new CloudflarePurgeError(
      "Cloudflare purge is not configured — CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN must both be set.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    /* Network, DNS or timeout: Cloudflare never saw the request. */
    throw new CloudflarePurgeError(
      `Could not reach the Cloudflare API: ${(error as Error).message}`,
    );
  }

  /* Read as text first. An edge failure — a 5xx from Cloudflare's own front
     door, or an HTML interstitial — is not JSON, and `.json()` would throw a
     parse error that says nothing about what actually went wrong. */
  const raw = await response.text();
  let payload: CloudflareEnvelope;
  try {
    payload = JSON.parse(raw) as CloudflareEnvelope;
  } catch {
    throw new CloudflarePurgeError(
      `Cloudflare answered ${response.status} with a non-JSON body: ${raw.slice(0, 200)}`,
      [],
      response.status,
    );
  }

  /* The trap: `success: false` arrives with a 200 for most application-level
     refusals — a token missing the purge permission, a URL outside the zone, a
     purge mode the plan does not carry. Checking the status alone would let
     every one of those through as a green deploy step. */
  if (!response.ok || payload.success !== true) {
    throw new CloudflarePurgeError(
      `Cloudflare refused the purge (HTTP ${response.status}) — ${describe(payload.errors)}`,
      (payload.errors ?? []).map((error) => error.code ?? 0).filter(Boolean),
      response.status,
    );
  }
}

/**
 * The zone's own domain, asked of Cloudflare and remembered per process.
 *
 * Exists because purge-by-URL will happily accept a URL for a host it does not
 * serve and answer `success: true`, so a wrong origin produces a purge that
 * reports 200 and drops nothing. That happened on the first live call: the
 * deployment's site URL was still `…vercel.app`, every path resolved against
 * it, and the endpoint cheerfully confirmed a purge of a hostname Cloudflare
 * has never cached.
 *
 * `null` when the token cannot read the zone. `.env.example` asks for a
 * purge-only token, and a token without `Zone → Zone → Read` is a perfectly
 * reasonable thing to hold — so this degrades to no check rather than refusing
 * to work.
 */
const zoneNames = new Map<string, string | null>();

async function zoneName(
  credentials: CloudflareCredentials,
): Promise<string | null> {
  const cached = zoneNames.get(credentials.zoneId);
  if (cached !== undefined) return cached;

  let name: string | null = null;
  try {
    const response = await fetch(`${API_BASE}/zones/${credentials.zoneId}`, {
      headers: { authorization: `Bearer ${credentials.apiToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      result?: { name?: string } | null;
    };
    if (response.ok && payload.success === true && payload.result?.name) {
      name = payload.result.name.toLowerCase();
    }
  } catch {
    /* Unreadable for any reason means no check, never a failed purge. */
  }

  zoneNames.set(credentials.zoneId, name);
  return name;
}

/** Whether `host` is the zone apex or something beneath it. */
function withinZone(host: string, zone: string): boolean {
  return host === zone || host.endsWith(`.${zone}`);
}

/**
 * Drop every cached object in the zone.
 *
 * This is the right hammer after a deploy. It costs little to refill — Next's
 * static assets are content-hashed and immutable, so they come back on first
 * request and were never the reason a visitor saw stale content — and it needs
 * no list of which URLs a build changed, which is a list nothing here can
 * produce accurately anyway.
 */
export async function purgeEverything(
  credentials: CloudflareCredentials,
): Promise<PurgeResult> {
  await post(credentials, { purge_everything: true });
  return { purged: "everything", requests: 1 };
}

/**
 * Drop specific URLs, in chunks of 30.
 *
 * For the narrower case — one article republished from the CMS, say — where
 * emptying the whole edge cache to change one page is heavier than it needs to
 * be. Pass paths or absolute URLs and run them through `normalisePurgeUrls`
 * first; Cloudflare matches the string exactly.
 */
export async function purgeUrls(
  credentials: CloudflareCredentials,
  urls: string[],
): Promise<PurgeResult> {
  if (urls.length === 0) {
    throw new CloudflarePurgeError("No URLs to purge.");
  }

  /* Refuse a URL Cloudflare does not serve, rather than let it answer 200 for
     a purge that drops nothing. The origin those URLs were built from is the
     thing at fault — on a deployment that is almost always
     `NEXT_PUBLIC_SITE_URL`, still holding a `…vercel.app` hostname or a
     staging domain. Naming both sides is what makes that a two-minute fix
     instead of an afternoon. */
  const zone = await zoneName(credentials);
  if (zone) {
    const strays = urls.filter(
      (url) => !withinZone(new URL(url).hostname.toLowerCase(), zone),
    );
    if (strays.length > 0) {
      throw new CloudflarePurgeError(
        `${strays.length} of ${urls.length} URL(s) are not in the "${zone}" zone, ` +
          `so purging them would report success and drop nothing. Check the site ` +
          `URL these were built from. First offender: ${strays[0]}`,
      );
    }
  }

  /* Sequential rather than `Promise.all`: the chunks share a per-zone rate
     limit, and a partial failure is far easier to reason about when the
     batches are ordered — everything before the throw was purged, everything
     after it was not. */
  let requests = 0;
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_PURGE) {
    await post(credentials, { files: urls.slice(i, i + MAX_URLS_PER_PURGE) });
    requests += 1;
  }

  return { purged: urls, requests };
}

/**
 * Paths or URLs → the absolute, slash-correct URLs Cloudflare matches on.
 *
 * Deduplicated and order-preserving, so a caller can pass a page and its
 * parents without duplicates eating into the 30-URL ceiling.
 */
export function normalisePurgeUrls(inputs: string[], origin: string): string[] {
  const base = `${origin.replace(/\/+$/, "")}/`;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const input of inputs) {
    const trimmed = input.trim();
    if (!trimmed) continue;

    let url: URL;
    try {
      url = new URL(trimmed, base);
    } catch {
      throw new CloudflarePurgeError(`Not a URL or a path: ${trimmed}`);
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new CloudflarePurgeError(`Not an http(s) URL: ${trimmed}`);
    }

    url.pathname = withTrailingSlash(url.pathname);
    /* A fragment never reaches the server, so it is no part of a cache key.
       Leaving it on would simply fail to match anything. */
    url.hash = "";

    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }

  return out;
}

/**
 * Whether an origin is a local development server.
 *
 * Nothing is in front of localhost, so there is no edge copy to drop — and
 * `NEXT_PUBLIC_SITE_URL` is `http://localhost:3008` in `.env.local` so the dev
 * server can link to itself. Resolving `/price-list/` against that and sending
 * it to Cloudflare asks it to purge a URL outside the zone, which it refuses
 * with a message about the URL rather than about the reason.
 *
 * Exported so the CLI and the CMS hook cannot disagree about what counts as
 * local.
 */
export function isLoopbackOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(origin);
}

/**
 * `/price-list` → `/price-list/`, but `/sitemap.xml` left alone.
 *
 * `trailingSlash: true` applies to pages, not to files, and a dot in the last
 * segment is what separates the two.
 */
function withTrailingSlash(pathname: string): string {
  if (pathname.endsWith("/")) return pathname;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return last.includes(".") ? pathname : `${pathname}/`;
}
