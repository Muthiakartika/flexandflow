/**
 * Checks `lib/seo/pages.ts`, and with a URL, what that deployment serves.
 *
 * Without an argument it checks the file alone: every key is a canonical path
 * with both slashes, nothing is empty, no two pages share a title or a
 * description, and lengths are flagged where Google usually truncates.
 *
 * With a base URL it also fetches every page in the file and compares the
 * served `<title>`, description and robots tag against it. Point it at a
 * Vercel preview before merging, or at the live site after. It then reads
 * the sitemap and lists any article or treatment the file does not cover;
 * those fall back to the panel's values, which is allowed but should be a
 * choice rather than an accident.
 *
 *   npx tsx scripts/check-seo.ts                          # the file only
 *   npx tsx scripts/check-seo.ts https://flexandflow.fit  # plus the pages
 */
import { PAGE_SEO } from "@/lib/seo/pages";

const BASE = process.argv[2]?.replace(/\/+$/, "");

/* Roughly where Google's snippet cuts off. Over it is a warning, not a
   failure: several live article titles run longer on purpose. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

let failures = 0;
let warnings = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
}

function warn(label: string): void {
  warnings += 1;
  console.log(`  warn  ${label}`);
}

/* Next escapes `&`, quotes and apostrophes in the head; decode them so the
   comparison is against the text a reader sees. */
function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function checkFile(): void {
  console.log("lib/seo/pages.ts");
  const entries = Object.entries(PAGE_SEO);
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const [path, seo] of entries) {
    check(`${path} is a canonical path`, /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/.test(path));
    check(`${path} has a title and a description`, Boolean(seo.title.trim() && seo.description.trim()));

    const sameTitle = titles.get(seo.title);
    if (sameTitle) check(`${path} has its own title`, false, `same as ${sameTitle}`);
    titles.set(seo.title, path);

    const sameDescription = descriptions.get(seo.description);
    if (sameDescription) check(`${path} has its own description`, false, `same as ${sameDescription}`);
    descriptions.set(seo.description, path);

    if (seo.title.length > TITLE_MAX) warn(`${path} title is ${seo.title.length} characters`);
    if (seo.description.length > DESCRIPTION_MAX) {
      warn(`${path} description is ${seo.description.length} characters`);
    }
  }
  console.log(`  ${entries.length} pages in the file`);
}

async function checkServed(base: string): Promise<void> {
  console.log(`\n${base}`);

  for (const [path, seo] of Object.entries(PAGE_SEO)) {
    const response = await fetch(`${base}${path}`);
    const html = await response.text();
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
    const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
    const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";

    check(`${path} answers 200`, response.status === 200, `got ${response.status}`);
    check(`${path} title`, title === seo.title, `serves "${title}"`);
    check(`${path} description`, description === seo.description, `serves "${description}"`);
    check(
      `${path} robots`,
      /\bnoindex\b/.test(robots) === Boolean(seo.noindex) &&
        /\bnofollow\b/.test(robots) === Boolean(seo.nofollow),
      `serves "${robots || "(no robots tag)"}"`,
    );
  }

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const listed = [...sitemap.matchAll(/<loc>[^<]*?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);

  for (const [path, seo] of Object.entries(PAGE_SEO)) {
    if (seo.noindex) check(`${path} is out of the sitemap`, !listed.includes(path));
  }

  /* Articles and treatments are the two-segment addresses; the fixed pages
     (`/about-us/` and the like) set their metadata in their own route files. */
  for (const path of listed) {
    if (/^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(path) && !PAGE_SEO[path]) {
      warn(`${path} is not in lib/seo/pages.ts, so its SEO still comes from the panel`);
    }
  }
}

async function main(): Promise<void> {
  checkFile();
  if (BASE) await checkServed(BASE);

  console.log(`\n${failures} failed, ${warnings} warnings`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
