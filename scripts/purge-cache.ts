/**
 * Purge Cloudflare's cache from the command line.
 *
 *   npm run cache:purge                       everything
 *   npm run cache:purge -- /blog/ /price-list/   just those pages
 *   npm run cache:purge -- --dry /blog/        show the URLs, send nothing
 *
 * This talks to Cloudflare directly rather than through `/api/cache/purge/`,
 * which matters in exactly the case you most want it: when the deployment is
 * broken, the app cannot be asked to fix its own cache. It is also how you
 * clear the edge after a change that never went through a deploy at all — a
 * DNS or page-rule edit, say.
 *
 * Runs under `tsx`, outside Next, so it reads the environment itself and
 * imports only the pure half of the purge module. `lib/env.ts` is `server-only`
 * and would throw here.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  CloudflarePurgeError,
  isLoopbackOrigin,
  normalisePurgeUrls,
  purgeEverything,
  purgeUrls,
} from "@/lib/cloudflare/purge";

const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? "";

/**
 * What a bare path like `/price-list/` is resolved against.
 *
 * `NEXT_PUBLIC_SITE_URL` is the honest source — except in `.env.local`, where
 * it is `http://localhost:3008` so the dev server can link to itself. Purging
 * `http://localhost:3008/price-list/` is not an error Cloudflare explains
 * kindly; it is a URL outside the zone, and the refusal points at the URL
 * rather than at the reason. So a loopback origin is ignored here and the
 * public site used instead — the same default `lib/env.ts` carries.
 */
const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const origin =
  !configuredOrigin || isLoopbackOrigin(configuredOrigin)
    ? "https://flexandflow.fit"
    : configuredOrigin;

if (!zoneId || !apiToken) {
  console.error(
    "CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN must both be set in .env.local.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.some((arg) => arg === "--dry" || arg === "--dry-run");
const targets = args.filter((arg) => !arg.startsWith("--"));

async function main(): Promise<void> {
  const credentials = { zoneId, apiToken };

  if (targets.length === 0) {
    /* No list means the whole zone, which is the deploy case and by far the
       most common one. Say so before doing it — this is a destructive-looking
       operation run from a terminal, and "everything" should not be a surprise
       inferred from an empty argument list. */
    console.log(`Purging EVERYTHING from zone ${zoneId}.`);
    if (dryRun) {
      console.log("--dry: nothing sent.");
      return;
    }
    const result = await purgeEverything(credentials);
    console.log(`Done in ${result.requests} request(s).`);
    return;
  }

  const urls = normalisePurgeUrls(targets, origin);
  /* Printed every time: a purge that silently resolved against the wrong
     origin looks exactly like one that worked. */
  console.log(`Resolving paths against ${origin}`);
  console.log(`Purging ${urls.length} URL(s) from zone ${zoneId}:`);
  for (const url of urls) console.log(`  ${url}`);

  if (dryRun) {
    console.log("--dry: nothing sent.");
    return;
  }

  const result = await purgeUrls(credentials, urls);
  console.log(`Done in ${result.requests} request(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    /* Cloudflare's own wording, which names the problem — a token without the
       purge permission reads as "10000: Authentication error", and that is a
       far better starting point than a stack trace. */
    if (error instanceof CloudflarePurgeError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
