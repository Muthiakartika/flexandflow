/**
 * Checks `lib/seo/pages.ts` and `lib/seo/sections`, and with a URL, what that
 * deployment serves.
 *
 * Sections are checked against the CMS's own block schema, for internal links
 * that point at no page, for nested bold and italic (which `RichText` cannot
 * render), and for a question asked twice on one page.
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
import { existsSync } from "node:fs";
import { join } from "node:path";

import { blocksSchema } from "@/lib/cms/blocks";
import { PAGE_COPY } from "@/lib/seo/copy";
import { PAGE_FIXES } from "@/lib/seo/fixes";
import { PAGE_SEO } from "@/lib/seo/pages";
import { PAGE_PHOTOS } from "@/lib/seo/photos";
import { PRICE_MISSING, PRICE_TOKEN } from "@/lib/seo/price-tokens";
import { PAGE_SECTIONS } from "@/lib/seo/sections";

/* Pages with their own route files, which sections may link to beside the
   treatments and articles in `PAGE_SEO`. */
const FIXED_PAGES = [
  "/",
  "/about-us/",
  "/services/",
  "/price-list/",
  "/contact-us/",
  "/blog/",
  "/therapist/ginny/",
  "/therapist/yuni/",
];

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

/** Every string a reader sees in a block, for the link and markup checks. */
function textsOf(block: (typeof PAGE_SECTIONS)[string][number]): string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "callout":
      return [block.text];
    case "list":
    case "columns":
      return block.items;
    case "table":
      return [...block.head, ...block.rows.flat()];
    case "faq":
      return block.items.flatMap((item) => [item.question, item.answer]);
    case "gallery":
      return block.images.flatMap((image) => (image.caption ? [image.caption] : []));
    default:
      return [];
  }
}

/** The checks every block the code writes must pass, sections and copy alike. */
function checkBlocks(path: string, label: string, blocks: (typeof PAGE_SECTIONS)[string]): void {
  const known = new Set([...Object.keys(PAGE_SEO), ...FIXED_PAGES]);
  check(`${label} has an entry in lib/seo/pages.ts`, Boolean(PAGE_SEO[path]));

  const parsed = blocksSchema.safeParse(blocks);
  check(
    `${label} blocks are valid`,
    parsed.success,
    parsed.success ? "" : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );

  const texts = blocks.flatMap(textsOf);
  const internal = texts.flatMap((text) =>
    [...text.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]),
  );
  for (const link of internal) {
    check(`${label} links to ${link}`, known.has(link), "no such page");
  }
  check(
    `${label} never nests bold and italic`,
    !texts.some((text) => text.includes("***")),
  );

  const questions = blocks.flatMap((block) =>
    block.type === "faq" ? block.items.map((item) => item.question.toLowerCase()) : [],
  );
  check(`${label} asks each question once`, new Set(questions).size === questions.length);

  checkTokens(label, texts);
  const typed = texts.filter((text) => HARD_PRICE.test(text.replace(PRICE_TOKEN, "")));
  for (const text of typed) warn(`${label} types a price instead of a token: "${text.slice(0, 70)}…"`);
}

function checkSections(): void {
  console.log("\nlib/seo/sections");
  for (const [path, blocks] of Object.entries(PAGE_SECTIONS)) checkBlocks(path, path, blocks);
  console.log(`  ${Object.keys(PAGE_SECTIONS).length} pages with sections`);

  console.log("\nlib/seo/copy");
  for (const [path, copy] of Object.entries(PAGE_COPY)) {
    checkBlocks(path, `${path} (copy)`, copy.body);
    if (copy.excerpt) checkTokens(`${path} (copy excerpt)`, [copy.excerpt]);
  }
  console.log(`  ${Object.keys(PAGE_COPY).length} pages with their copy in code`);

  for (const [path, fixes] of Object.entries(PAGE_FIXES)) {
    checkTokens(`${path} (fixes)`, fixes.map((f) => f.replace));
  }

  console.log("\nlib/seo/photos");
  for (const [path, photo] of Object.entries(PAGE_PHOTOS)) {
    check(`${path} photo ${photo.src} is in public/`, existsSync(join("public", photo.src)));
  }
}

/* A price written as a figure: "IDR 500,000", or a bare "500,000" table cell. */
const HARD_PRICE = /IDR\s?\d|\b\d{1,3}(,\d{3})+\b/;

/** Every `{{…}}` in `texts` must be a price token `lib/seo/price-tokens.ts` reads. */
function checkTokens(label: string, texts: string[]): void {
  const raw = texts.flatMap((text) => text.match(/\{\{[^}]*\}\}/g) ?? []);
  const bad = raw.filter((token) => !new RegExp(`^${PRICE_TOKEN.source}$`).test(token));
  check(`${label} price tokens are well formed (${raw.length})`, bad.length === 0, bad.join(", "));
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
    const shown = visible(html);
    check(
      `${path} fills every price token`,
      !shown.includes("{{") && !shown.includes(PRICE_MISSING),
      shown.includes("{{") ? "an unfilled {{…}} is served" : `"${PRICE_MISSING}" is served`,
    );
    check(`${path} title`, title === seo.title, `serves "${title}"`);
    if (seo.h1) {
      const h1 = visible(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").trim();
      check(`${path} h1`, h1 === seo.h1, `serves "${h1}"`);
    }
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

/** Inline markers reduced to the text a reader sees. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/** The page's visible text, one string, with whitespace collapsed. */
function visible(html: string): string {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ");
}

/** `replace` as a pattern: its price tokens match whatever figure the page shows. */
function served(replace: string, whole = false): RegExp {
  const escape = (part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = plain(replace)
    .split(/\{\{[^}]+\}\}/)
    .map(escape)
    .join("\\d{1,3}(?:,\\d{3})+");
  return new RegExp(whole ? `^${body}$` : body);
}

/*
 * Every fix in `lib/seo/fixes.ts` must show on the served page: the new text
 * present and, outside table rows, the old text gone. A fix whose `find` no
 * longer matches the panel's copy fails here, because the page then serves
 * neither the replacement nor, usually, the old text.
 */
async function checkFixes(base: string): Promise<void> {
  for (const [path, fixes] of Object.entries(PAGE_FIXES)) {
    const html = await (await fetch(`${base}${path}`)).text();
    const text = visible(html);
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => visible(c[1]).trim()),
    );
    /* A price table on the scannable layout is a menu: its label, then each
       price, the column headings dropped. */
    const menuRows = [...html.matchAll(/<div class="price-menu-row">([\s\S]*?)<\/dd>/gi)].map((m) => [
      visible(m[1].match(/<dt[^>]*>([\s\S]*?)<\/dt>/i)?.[1] ?? "").trim(),
      ...[...visible(m[1]).matchAll(/IDR\s?\d{1,3}(?:,\d{3})+/g)].map((price) => price[0]),
    ]);

    for (const f of fixes) {
      if (f.row) {
        const row = [...rows, ...menuRows].find((cells) => f.row!.every((cell, i) => cells[i] === cell));
        check(
          `${path} row "${f.row.join(" / ")}" shows the live price`,
          Boolean(row?.some((cell) => served(f.replace, true).test(cell))) &&
            (f.stillCurrent || !row?.includes(f.find)),
          row ? `serves ${row.join(" | ")}` : "no such row",
        );
      } else {
        const label = `${path} fix "${plain(f.replace).slice(0, 48)}…"`;
        check(label, served(f.replace).test(text) && !text.includes(plain(f.find)),
          text.includes(plain(f.find)) ? "old text still served" : "new text not served (has the panel copy changed?)");
      }
    }
  }

  /* A page with its copy in code serves that copy: its lead and its opening
     paragraph, rather than the panel's. */
  for (const [path, copy] of Object.entries(PAGE_COPY)) {
    const text = visible(await (await fetch(`${base}${path}`)).text());
    const opening = copy.body.find((block) => block.type === "paragraph");
    const expected = [copy.excerpt, opening?.type === "paragraph" ? opening.text : undefined];
    for (const value of expected) {
      if (!value) continue;
      check(`${path} serves its code copy "${plain(value).slice(0, 40)}…"`, served(value).test(text), "not served");
    }
  }

  /* A page with its photo in code previews with it when the link is shared. */
  for (const [path, photo] of Object.entries(PAGE_PHOTOS)) {
    const html = await (await fetch(`${base}${path}`)).text();
    const preview = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? "";
    check(`${path} link preview is ${photo.src}`, preview.endsWith(photo.src), preview || "no og:image");
  }
}

async function main(): Promise<void> {
  checkFile();
  checkSections();
  if (BASE) {
    await checkServed(BASE);
    await checkFixes(BASE);
  }

  console.log(`\n${failures} failed, ${warnings} warnings`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
