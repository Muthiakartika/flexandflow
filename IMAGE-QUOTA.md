# Image optimization & cache — what is done, and what is left

Applied 2026-09-02 from `vercel-image-quota-runbook.md`. Everything in §1–§4 is
in the repo and verified locally. **§5 is not done** — it is Cloudflare
dashboard work on the studio's own account, and it is the half that protects
against the worst failure mode here.

---

> ## ⚠ THE OPTIMIZER IS CURRENTLY OFF
>
> `images.unoptimized: true` was set on **2026-09-02** because Vercel's Image
> Optimization quota ran out mid-month. `/_next/image` was answering
> **`402 Payment Required`** (`x-vercel-error:
> OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`) for anything not already cached —
> **158 of the site's 191 variants**, so most photographs were rendering as
> broken images on the live site.
>
> With `unoptimized`, `next/image` emits the file in `public/` directly: no
> `/_next/image`, therefore **no transformations, no image cache reads, no
> cache writes, and no 402 possible**. Verified in the build: the pages emit
> zero `/_next/image` URLs.
>
> **Why this is acceptable here:** §2 already shrank the sources to 8.49 MB and
> capped them at 1920px, and Cloudflare already caches `/images/**` at the edge
> (measured: MISS → HIT), so repeat visitors are served from the edge and
> Vercel barely sees the traffic.
>
> **What it costs:** no responsive `srcset` and no WebP conversion. Measured
> per page: **3.0 MB on `/`**, 1.6 MB on `/about-us/`, 523 kB average across
> the 23 sitemap pages — roughly 4–5× what the optimizer was delivering.
>
> **To turn it back on: delete the one `unoptimized: true` line** in
> `next.config.ts`. Everything else in that block is still tuned and takes
> effect again immediately. Do it once the quota resets (dashboard → Usage →
> Image Optimization) or the plan is upgraded, and re-run §6.
>
> **Before turning it back on, know what exhausted the quota.** Two candidates,
> and they compound: the pre-existing 4-hour `minimumCacheTTL` (now 31 days),
> which re-billed every variant up to six times a day; and re-encoding all 70
> source files in §2, which changes their content hashes and therefore
> invalidated every cached variant at once, forcing a full re-transform of the
> site. The second is a one-off, but it is the reason not to re-run
> `images:optimize` casually while the quota is tight.

---

## 0. Which meter is actually the problem

Three meters share the word "image" on the Vercel usage page and they respond
to different fixes. Read them before acting on anything below:
vercel.com → team scope → **Usage** → **Image Optimization**. Per-image detail
is under **Observability** → **Image Optimization**.

| Meter | Hobby limit | Driven by | What helps |
|---|---|---|---|
| Transformations | 5,000/mo | unique variants | §1 |
| Cache writes | 100,000/mo | MISS + STALE | §1 (`minimumCacheTTL`) |
| Cache reads | 300,000/mo | traffic | a CDN in front — §5 |

If **cache reads** is the one at the ceiling, none of §1 helps and turning
optimization off makes it worse: the raw file goes out instead, and Fast Data
Transfer rises.

---

## 1. `next.config.ts` — the fences

This project was running on defaults, which is where the exposure was. Now:

```ts
images: {
  minimumCacheTTL: 2678400,               // was 14400 (4 hours)
  formats: ["image/webp"],                // default, pinned deliberately
  qualities: [75],                        // default, pinned deliberately
  deviceSizes: [640, 828, 1080, 1920],    // was 8 entries, up to 3840
  imageSizes: [64, 96, 128, 256, 384],    // was 7 entries
}
```

**`minimumCacheTTL` is the big one.** At the 4-hour default a variant can go
STALE six times a day, and each staleness is a cache write *and* a re-billed
transformation — roughly 180 a month for one untouched picture. At 31 days it
is about one. The cache is keyed on the file's content hash, so **redeploys do
not clear it**; the number is a monthly ceiling, not a per-deploy one.

**`deviceSizes` was capped at 1920** because the page body is capped at 1440px
and the widest single slot is the article hero at 1024px. The defaults' 2048
and 3840 could only ever have been produced by upscaling.

Measured on the production build, cold:

| Request | Before | After |
|---|---|---|
| `sizes="56px"` logo srcset | 15 candidate widths | 9 |
| `sizes="…46vw, 30vw"` card srcset | 10 | 6 |
| `w=750 / 1200 / 2048 / 3840` | 200 OK | **400** |
| `q=50 / q=100` | 200 OK | **400** |
| `Cache-Control` on `/_next/image` | `max-age=14400` | `max-age=2678400` |

`localPatterns` is deliberately **not** set. Statically imported images resolve
to `/_next/static/media/**`, not to their `public/` path, so an allowlist
naming `/images/**` would 400 the logo. The four settings above are enough.

---

## 2. Source files — `npm run images:optimize`

```bash
npm run images:optimize -- --dry   # report, write nothing
npm run images:optimize            # rewrite in place
npm run images:sync                # then refresh the MediaAsset rows
```

Result: **15.76 MB → 8.49 MB across 74 files (−46%)**. Worst offenders were a
3168×4752 JPEG at 2.8 MB (→ 352 kB) and a 1024×1536 PNG at 2.0 MB (→ 608 kB).

**The extension never changes, and that is not laziness.** Every one of these
paths is stored in Postgres — 68 `MediaAsset` rows keyed on the URL, plus the
`ContentRevision` blocks of published articles. The runbook's version of this
script renames to `.webp` and unlinks the original; here that would pull the
photography off live pages. So the script caps width at 1920 and re-encodes to
the same format.

Converting to WebP anyway was measured before it was rejected: it reaches
**8.36 MB**, i.e. 1.5% better than what we already have, in exchange for
rewriting published content. Not worth it. (The runbook's dramatic WebP wins
are PNG sources; this library is nearly all JPEG.)

`images:sync` is the other half — re-encoding invalidates `MediaAsset.checksum`
(unique, and the upload de-duplicator), `bytes`, `width`, `height`. It leaves
`ContentRevision.imageWidth/Height` alone on purpose: the resize is
proportional, `next/image` uses those two only for aspect ratio, and it never
upscales, so a stale larger number changes nothing on screen.

---

## 3. Prerendering

The build was already almost entirely static. One marketing page was not:
`/blog` read `searchParams` for its `?s=` keyword filter, which is a dynamic
API and opted the whole route out — re-rendered per request, uncacheable, for a
listing identical for everyone not searching.

The filter now runs in the browser (`components/blog/SearchableGrid.tsx`)
behind a `<Suspense>` boundary. `/blog` is `○ (Static)`; the URL and the search
box are unchanged, and the prerendered HTML contains the full unfiltered
listing, so crawlers see everything.

Still dynamic, and correctly so: `/admin/**`, `/api/**`, `/appointment/**`, and
`/robots.txt` (it reads the request host to disallow crawling of
`*.vercel.app` preview deployments).

---

## 4. Function region — `vercel.json`

```json
{ "regions": ["sin1"] }
```

Neon is on `ap-southeast-1`. Vercel defaults every new project to `iad1`
(Washington DC), so each query was crossing the Pacific twice. Pick the region
nearest the **database**, not the visitors — static pages are still served from
the edge nearest the visitor without invoking a function.

Confirm after deploying, in `x-vercel-id`:

- `sin1::sin1::…` — edge and function in the same region ✓
- `sin1::iad1::…` — still mismatched ✗
- `sin1::…` (one segment) — static page, no function ran ✓

---

## 5. NOT DONE — Cloudflare (dashboard work, ~10 minutes)

Cloudflare sits in front of this site (`lib/cloudflare/purge.ts`,
`npm run cache:purge`), which makes this section necessary rather than
optional.

**The problem, measured on this site's own build:**

```
Accept: image/avif,image/webp,*/*   →  image/webp   28,886 B
Accept: */*                         →  image/jpeg   41,487 B
```

Both variants are real, and the response carries `Vary: Accept` — but
**Cloudflare honours only `Vary: Accept-Encoding`**. Whichever variant lands in
its cache first is served to everyone. In real traffic the `*/*` request comes
from crawlers, uptime monitors and link-preview fetchers, so the 44%-larger
JPEG can win the race. On images with transparency it is worse than large: JPEG
has no alpha, and the logo would render on a solid block.

**dash.cloudflare.com → the domain → Caching → Cache Rules → Create rule.**
Order matters; the first match wins, so this must be rule 1:

> **Rule 1 — Bypass the image optimizer** · Action: **Bypass cache**
> ```
> starts_with(http.request.uri.path, "/_next/image")
> ```

The bypass has to be explicit. Cloudflare caches `/_next/image` by default, so
simply leaving it out of the cache rule is not enough. Vercel puts `Accept`
into its own cache key, so negotiation is correct once Cloudflare is out of it.

> **Rule 2 — Cache static assets** · Action: **Eligible for cache**,
> Edge TTL: **Use cache-control header from origin**
> ```
> (starts_with(http.request.uri.path, "/_next/static/")) or
> (starts_with(http.request.uri.path, "/images/")) or
> (starts_with(http.request.uri.path, "/photos/")) or
> (starts_with(http.request.uri.path, "/shapes/")) or
> (starts_with(http.request.uri.path, "/video/"))
> ```

Use `starts_with`, not `matches` — the regex operator needs a Business plan.

Then, once only: **Caching → Configuration → Purge Everything**, to drop
variants cached under the old behaviour.

Also check, in the same session:

- **SSL/TLS → Overview** must be **Full (strict)**. `Flexible` in front of
  Vercel causes a redirect loop.
- **Speed → Optimization → Content Optimization**: turn **Rocket Loader off**.
  It reorders script execution and breaks React hydration.

**The HTML is cached at Cloudflare, and on Next 16 that is safe — but only
because of one thing.** The runbook warns that App Router separates a full HTML
response from an RSC payload with `Vary: rsc, next-router-state-tree, …`, which
Cloudflare ignores, so a cached RSC payload can be served to a browser asking
for a page. Next 16 defends against exactly this **without** relying on `Vary`:
every RSC and prefetch request carries a `?_rsc=<hash>` search parameter, a
hash of the relevant request headers, which gives each variant its own cache
key (`node_modules/next/dist/docs/01-app/02-guides/cdn-caching.md`).

Measured on the live zone 2026-09-02: a distinct query string always answers
`cf-cache-status: MISS` and a repeated one answers `HIT`, so Cloudflare **is**
keying on the query string, `_rsc` does its job, and all 23 sitemap URLs return
`text/html`. The collision is only reachable by hand-crafting a request that
sends the `rsc` header *without* `_rsc`, which no real client does.

Two things therefore must not change, or the protection disappears:

- **Never set Cloudflare to ignore the query string** in the cache key (an
  option on Cache Rules and the old "Cache Level: Ignore Query String"). That
  strips `_rsc`, and then HTML and RSC payloads collide for real.
- **Never let the CDN strip the `rsc` request header.**

Note this is *not* protection the images get: `/_next/image` varies on `Accept`
and has no equivalent discriminator in its query string, which is why rule 1
above is still needed.

Cloudflare holding the HTML is also why `lib/cms/purge.ts` exists — `updateTag`
purges Vercel, not Cloudflare, so a publish must drop the edge copy too. That
integration is already wired.

---

## 5b. Measured on the live site, 2026-09-02 (after deploy)

Crawled all 23 sitemap URLs and collected every `/_next/image` URL they emit:

| | |
|---|---|
| Distinct source images | 33 |
| **Unique variants (`url` + `w` + `q`)** | **191** |
| Widths in play | 64 96 128 256 384 640 828 1080 1920 — the configured set, nothing else |
| Qualities in play | 75 only |

191 is the ceiling on transformations, and with a 31-day TTL each bills roughly
once a month: **under 4% of the 5,000/month Hobby allowance.** There is no case
for `unoptimized: true` here — a 1920px source that is ~200 kB on disk goes out
as a 20–40 kB WebP, so the optimizer is paying for itself several times over at
a rounding error's worth of quota.

Confirmed live: `x-nextjs-prerender: 1`, `x-vercel-cache: HIT`/`PRERENDER`,
`x-vercel-id: sin1::…` (one region segment — static, no function invoked), and
the deployed build output carries `minimumCacheTTL: 2678400`.

The `max-age=7200` visible on HTML and image responses is **Cloudflare's Browser
Cache TTL** (2 hours), not Vercel's — `/_next/static/` still comes through with
`max-age=31536000, immutable`, so nothing is rewriting headers globally. It
governs the reader's browser only; Vercel's own image cache still runs on the
31 days above. Already documented in `lib/cms/purge.ts`.

## 6. Verifying after deploy

```bash
curl -sI https://flexandflow.fit/ | grep -iE "cache-control|age:|x-vercel-cache|x-nextjs-prerender|cf-cache-status|x-vercel-id"
```

Run it twice. Wanted: `x-nextjs-prerender: 1`, `x-vercel-cache: HIT` (or
`PRERENDER`/`STALE` — all normal), and `Age:` above zero. `Cache-Control:
public, max-age=0, must-revalidate` on a cached page is **correct**, not a bug:
Vercel strips `s-maxage` before passing the response down, and the side effect
— Cloudflare declining to store the HTML — is the behaviour we want.

```bash
U='https://flexandflow.fit/_next/image/?url=%2Fimages%2F2026%2F08%2Fgallery-1.jpg&w=828&q=75'
curl -sI "$U" -H 'Accept: image/avif,image/webp,*/*' | grep -i content-type   # want image/webp
curl -sI "$U" -H 'Accept: */*'                       | grep -i content-type   # image/jpeg is fine
curl -sI "$U" -H 'Accept: image/avif,image/webp,*/*' | grep -i content-type   # MUST be image/webp again
```

If the third returns `image/jpeg`, the CDN cache is poisoned — rule 1 in §5 is
missing or ordered below rule 2.

Note the trailing slash in `/_next/image/`. This app sets `trailingSlash:
true`, so the un-slashed form answers 308.

---

## 7. One trap worth knowing about

`sharp` was pinned from `^0.35.4` to **`0.34.5`**, the version Next 16.2.12
bundles for its own optimizer.

With two versions installed, npm hoisted `@img/sharp-win32-x64@0.35.4`
(libvips 8.18.6) where Next's nested `sharp@0.34.5` (libvips 8.17.3) would find
it. Every transform then threw inside the server —

```
GLib-GObject-CRITICAL: value "32" of type 'gint' is invalid or out of range
for property 'space' of type 'VipsInterpretation'
```

— and Next's `catch` silently falls back to **serving the original file
untouched**, with the original content type. There is no error in the HTTP
response; the only symptom is that `/_next/image` returns exactly as many bytes
as the source, and `Content-Type` never becomes `image/webp`. Both sharp copies
worked perfectly when required from a plain Node script, which is what made it
slow to find.

This bit local development and self-hosting, not Vercel, where `/_next/image`
is served by the platform's own optimizer. If `sharp` is ever upgraded, check
what `next` depends on at the same time, and re-run §6's three-request test.
