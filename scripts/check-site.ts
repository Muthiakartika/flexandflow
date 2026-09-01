/**
 * Fetches the public pages and checks that what they serve still matches the
 * ported source modules.
 *
 * `scripts/cms-import.ts` proves the *data* survived the move into the CMS.
 * This proves the *pages* did — that every treatment and post still renders
 * its own copy, that both orderings survived, that the sitemap still lists
 * every indexable URL, and that the two menu-less services are still reachable
 * and still absent from the grid.
 *
 * It compares against `lib/data/services.ts` and `lib/data/posts.ts`, which
 * are no longer read by the site. That is the point: they are the record of
 * what WordPress published, so they are the only independent thing left to
 * check the database against.
 *
 *   npx tsx scripts/check-site.ts [baseUrl]     # default http://localhost:3008
 */
import { posts } from "@/lib/data/posts";
import { pricedServiceSlugs, services } from "@/lib/data/services";
import type { ContentBlock } from "@/types";

const BASE = (process.argv[2] ?? "http://localhost:3008").replace(/\/+$/, "");

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
}

async function get(path: string): Promise<{ status: number; html: string }> {
  const response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { status: response.status, html: await response.text() };
}

/**
 * The rendered page, flattened to comparable text.
 *
 * Tags are stripped, entities decoded, whitespace collapsed. The copy uses
 * typographic apostrophes, which React emits as `&#x27;` — decoding them is
 * what makes a paragraph containing "body’s" findable.
 */
function decode(value: string): string {
  return value
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function plain(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

/**
 * The `<meta name="description">` value, decoded.
 *
 * Read from the raw HTML rather than from `plain()`, which strips tags and
 * takes every attribute with them — the description is an attribute, so it is
 * simply not in the flattened text. React escapes `&` and apostrophes inside
 * it, which is why this decodes before comparing.
 */
function metaDescription(html: string): string | null {
  const match =
    html.match(/<meta name="description" content="([^"]*)"/i) ??
    html.match(/<meta content="([^"]*)" name="description"/i);
  return match ? decode(match[1]) : null;
}

/**
 * All whitespace removed.
 *
 * Used for every "does the page contain this copy" test. `plain()` replaces
 * each tag with a space, so `Our <strong>yoga</strong>combines` comes back as
 * "yoga combines" while the source says "yogacombines" — the missing space is
 * in the ported WordPress copy and is kept verbatim on purpose. Comparing
 * without whitespace at all sidesteps every difference of that kind, and none
 * of these checks is about spacing.
 */
function squash(value: string): string {
  return value.replace(/\s+/g, "");
}

/** Same normalisation, so source copy and rendered copy compare like for like. */
function normalise(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/'/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** The last sizeable paragraph of a body — the end of the article, which is
 *  what a truncated render loses first. */
function lastParagraph(body: ContentBlock[]): string | null {
  for (let i = body.length - 1; i >= 0; i -= 1) {
    const block = body[i];
    if (block.type === "paragraph" && block.text.length > 60) {
      return normalise(block.text);
    }
  }
  return null;
}

function firstHeading(body: ContentBlock[]): string | null {
  const block = body.find((b) => b.type === "heading");
  return block && block.type === "heading" ? normalise(block.text) : null;
}

async function main(): Promise<void> {
  console.log(`\nChecking ${BASE}\n`);

  console.log("Treatment pages\n");

  for (const service of services) {
    const { status, html } = await get(`/uluwatu-bali/${service.slug}/`);
    const text = plain(html);

    if (status !== 200) {
      check(`${service.slug}`, false, `HTTP ${status}`);
      continue;
    }

    const tail = lastParagraph(service.body);
    const head = firstHeading(service.body);

    const flat = squash(text);

    const problems = [
      !flat.includes(squash(normalise(service.title))) && "title missing",
      head && !flat.includes(squash(head)) && "first heading missing",
      /* The end of the article. A body that stopped halfway — the failure a
         dropped block would cause — still contains its title and its first
         heading, so only this catches it. */
      tail && !flat.includes(squash(tail)) && "final paragraph missing",
      squash(metaDescription(html) ?? "") !== squash(service.seo.description) &&
        `meta description differs (${metaDescription(html) ?? "absent"})`,
    ].filter(Boolean);

    check(`/uluwatu-bali/${service.slug}/`, problems.length === 0, problems.join(", "));
  }

  console.log("\nBlog posts\n");

  for (const post of posts) {
    const path = `/${post.category}/${post.slug}/`;
    const { status, html } = await get(path);
    const text = plain(html);

    if (status !== 200) {
      check(path, false, `HTTP ${status}`);
      continue;
    }

    const tail = lastParagraph(post.body);
    const flat = squash(text);

    const problems = [
      !flat.includes(squash(normalise(post.title))) && "title missing",
      tail && !flat.includes(squash(tail)) && "final paragraph missing",
      !flat.includes(squash(post.date)) && "published date missing",
      squash(metaDescription(html) ?? "") !== squash(post.seo.description) &&
        `meta description differs (${metaDescription(html) ?? "absent"})`,
    ].filter(Boolean);

    check(path, problems.length === 0, problems.join(", "));
  }

  console.log("\nOrdering and listings\n");

  {
    const { html } = await get("/services/");
    const page = plain(html);

    /* Only the grid. The site header lists six treatment names in its
       navigation, so searching the whole page finds those first and reports an
       order that has nothing to do with the grid. This label is the grid's own
       heading and everything after it is the list. */
    const gridStart = page.indexOf("Every treatment, both tiers, prices in IDR");
    const text = gridStart === -1 ? page : page.slice(gridStart);

    /* Position of each title in the grid, which is the order it actually
       shows — not the order any array happens to be in. */
    const positions = pricedServiceSlugs.map((slug) => {
      const service = services.find((s) => s.slug === slug)!;
      return { slug, at: text.indexOf(normalise(service.title)) };
    });

    check(
      "every priced treatment appears on /services/",
      positions.every((p) => p.at !== -1),
      positions.filter((p) => p.at === -1).map((p) => p.slug).join(", "),
    );

    const ascending = positions.every(
      (p, i) => i === 0 || p.at > positions[i - 1].at,
    );
    check(
      "/services/ is in the pricedServiceSlugs order",
      ascending,
      positions.map((p) => p.slug).join(" → "),
    );

    /* The two that are deliberately on no menu. */
    for (const slug of ["full-body-massage", "facial-massage"]) {
      const service = services.find((s) => s.slug === slug)!;
      check(
        `${slug} is absent from the /services/ grid`,
        !text.includes(normalise(service.title)),
        gridStart === -1 ? "grid label not found — check ran against the whole page" : "",
      );
    }
  }

  {
    const { status } = await get("/uluwatu-bali/full-body-massage/");
    check("full-body-massage is still reachable (indexed URL)", status === 200);
  }
  {
    const { status } = await get("/uluwatu-bali/facial-massage/");
    check("facial-massage is still reachable (indexed URL)", status === 200);
  }

  {
    const { html } = await get("/price-list/");
    const text = plain(html);
    check(
      "/price-list/ lists every priced treatment",
      pricedServiceSlugs.every((slug) => {
        const service = services.find((s) => s.slug === slug)!;
        return text.includes(normalise(service.title));
      }),
    );
  }

  {
    const { html } = await get("/blog/");
    const text = plain(html);
    const shown = posts.filter((p) => text.includes(normalise(p.title)));
    check(
      "/blog/ lists the first page of posts",
      shown.length > 0 && shown.length <= posts.length,
      `${shown.length} of ${posts.length} shown`,
    );
  }

  console.log("\nSitemap\n");

  {
    const { html } = await get("/sitemap.xml");

    const expected = [
      "/",
      "/about-us/",
      "/services/",
      "/price-list/",
      "/contact-us/",
      "/blog/",
      ...services.map((s) => s.seo.canonicalPath),
      ...posts.map((p) => p.seo.canonicalPath),
    ];

    const missing = expected.filter(
      (path) => !html.includes(`flexandflow.fit${path}<`),
    );

    check(
      `sitemap lists all ${expected.length} indexable URLs`,
      missing.length === 0,
      missing.join(", "),
    );

    /* Yoast marks the archives and profiles `noindex`, and listing a noindex
       page tells Google to index the very page its meta tag forbids. */
    const shouldBeAbsent = [
      "/uluwatu-bali/<",
      "/injury-guide/<",
      "/therapist/",
      "/preview/",
    ];
    check(
      "sitemap omits the noindex archives, profiles and previews",
      shouldBeAbsent.every((path) => !html.includes(`flexandflow.fit${path}`)),
    );
  }

  console.log("\nHome page\n");

  {
    const { html } = await get("/");
    const text = plain(html);

    const featured = [
      "lymphatic-detox-massage-for-men",
      "trauma-healing",
      "assisted-stretching",
      "sport-massage",
      "cupping-therapy",
      "lymphatic-drainage",
    ];

    check(
      "the six featured treatments are on the home page",
      featured.every((slug) => {
        const service = services.find((s) => s.slug === slug)!;
        return text.includes(normalise(service.title));
      }),
    );

    /* The hero's "from" figure is derived from the tiers, and getting it wrong
       is the exact failure this repo has shipped three times. */
    check(
      "the hero advertises IDR 500,000 as its lowest hourly rate",
      text.includes("IDR 500,000"),
    );
  }

  console.log(
    failures === 0
      ? "\nThe site serves the same content it did before the CMS.\n"
      : `\n${failures} problem${failures === 1 ? "" : "s"}.\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
