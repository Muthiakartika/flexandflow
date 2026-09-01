/**
 * Proves a category added from the panel actually serves pages — and that the
 * dynamic route it needs has not swallowed the rest of the site.
 *
 * `/uluwatu-bali/` and `/injury-guide/` were route folders until categories
 * became rows. They are served by `app/(main)/[category]/` now, and a catch-all
 * at the root of the site is the kind of change that works for the case you
 * tested and quietly breaks a page you forgot. So this checks both halves:
 *
 *   1. A brand-new category serves its archive and its posts.
 *   2. **Every existing top-level route still wins over it.** Next resolves a
 *      static segment before a dynamic one, so `/services` and `/blog` should
 *      be untouched — but "should" is what this script exists to replace.
 *
 * The category and post it creates are removed at the end, and the post is
 * never published: the routing is exercised through Draft Mode, so nothing
 * reaches the sitemap or a visitor.
 *
 *   npm run check:category
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { PrismaNeon } from "@prisma/adapter-neon";
import { SignJWT } from "jose";

import { PrismaClient } from "../generated/prisma/client";
import { RESERVED_SLUGS, slugProblem } from "../lib/cms/categories";

const BASE = (process.argv[2] ?? "http://localhost:3008").replace(/\/+$/, "");
const ADMIN_COOKIE = "ff_admin_session";

const CAT = "cms-category-probe";
const SLUG = "cms-category-probe-post";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) console.log(`  ok    ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function adminToken(): Promise<string> {
  const admin = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", active: true, deletedAt: null },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw new Error("No active super admin to sign a session for.");

  return new SignJWT({ email: admin.email, name: admin.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET!));
}

async function draftCookie(docId: string, token: string): Promise<string> {
  const response = await fetch(`${BASE}/api/cms/preview/?id=${docId}`, {
    headers: { cookie: `${ADMIN_COOKIE}=${token}` },
    redirect: "manual",
  });
  const bypass = /__prerender_bypass=([^;]+)/.exec(
    response.headers.get("set-cookie") ?? "",
  )?.[1];
  if (!bypass) throw new Error("Draft mode did not set its cookie.");
  return `${ADMIN_COOKIE}=${token}; __prerender_bypass=${bypass}`;
}

async function status(path: string, cookie = ""): Promise<number> {
  const response = await fetch(`${BASE}${path}`, {
    ...(cookie ? { headers: { cookie } } : {}),
    redirect: "manual",
  });
  return response.status;
}

async function cleanup(): Promise<void> {
  await prisma.contentDoc.deleteMany({ where: { slug: SLUG } });
  await prisma.contentCategory.deleteMany({ where: { slug: CAT } });
}

async function main(): Promise<void> {
  console.log(`\nCategories, at ${BASE}\n`);

  // ── The rules, without touching anything ────────────────────────────────
  console.log("  Slug rules\n");

  check(
    "a category may not take an existing page's address",
    RESERVED_SLUGS.every((slug) => slugProblem(slug) !== null),
    RESERVED_SLUGS.filter((s) => slugProblem(s) === null).join(", "),
  );
  check("uppercase is refused", slugProblem("Recovery") !== null);
  check("spaces are refused", slugProblem("two words") !== null);
  check("a normal slug is accepted", slugProblem("recovery-and-mobility") === null);

  await cleanup();

  console.log("\n  A brand-new category\n");

  const category = await prisma.contentCategory.create({
    data: {
      slug: CAT,
      label: "Probe Category",
      lead: "A throwaway category used by scripts/check-category.ts.",
      seoTitle: "Probe Category Archives",
      sortOrder: 900,
    },
    select: { id: true },
  });

  const doc = await prisma.contentDoc.create({
    data: {
      kind: "POST",
      slug: SLUG,
      urlPrefix: CAT,
      /* Never published; the routing is exercised through Draft Mode. */
      status: "DRAFT",
      sortOrder: 9999,
      revisions: {
        create: {
          version: 1,
          title: "Probe post",
          excerpt: "Throwaway.",
          body: [{ type: "paragraph", text: "Probe body." }] as never,
          seoTitle: "Probe post",
          seoDescription: "Throwaway.",
          canonicalPath: `/${CAT}/${SLUG}/`,
          displayDate: "January 1, 2026",
        },
      },
    },
    select: { id: true },
  });

  try {
    const cookie = await draftCookie(doc.id, await adminToken());

    check(
      "its archive page serves",
      (await status(`/${CAT}/`, cookie)) === 200,
      "a category added from the panel has to work with no deploy",
    );
    check(
      "a post filed under it serves",
      (await status(`/${CAT}/${SLUG}/`, cookie)) === 200,
    );
    check(
      "a category that does not exist 404s",
      (await status("/not-a-real-category/", cookie)) === 404,
      "an empty archive for every typo would be a soft 404 on the whole domain",
    );
    check(
      "an article under a category that does not exist 404s",
      (await status("/not-a-real-category/anything/", cookie)) === 404,
    );

    // ── The part a catch-all route puts at risk ───────────────────────────
    console.log("\n  Existing routes still win over the catch-all\n");

    const mustStillWork: [string, string][] = [
      ["/", "home"],
      ["/services/", "services"],
      ["/price-list/", "price list"],
      ["/about-us/", "about us"],
      ["/contact-us/", "contact"],
      ["/blog/", "blog index"],
      ["/blog/page/2/", "blog page 2"],
      ["/therapist/ginny/", "a therapist profile"],
      ["/uluwatu-bali/", "the treatments archive"],
      ["/uluwatu-bali/assisted-stretching/", "a treatment page"],
      ["/injury-guide/", "the injury-guide archive"],
      ["/injury-guide/common-surfing-injuries/", "a post"],
      ["/sitemap.xml", "the sitemap"],
      ["/robots.txt", "robots.txt"],
    ];

    for (const [path, label] of mustStillWork) {
      const code = await status(path);
      check(`${label} (${path})`, code === 200, `HTTP ${code}`);
    }

    /* The admin panel is a different route group at the same URL root, so it
       is exactly the sort of thing a top-level dynamic segment could shadow.
       A redirect to the login is the right answer; a 404 would mean the
       catch-all had claimed it. */
    const adminCode = await status("/admin/treatments/");
    check(
      "the admin panel is still gated, not swallowed (/admin/treatments/)",
      adminCode === 307 || adminCode === 308,
      `HTTP ${adminCode}`,
    );
  } finally {
    await cleanup();
    const left =
      (await prisma.contentDoc.count({ where: { slug: SLUG } })) +
      (await prisma.contentCategory.count({ where: { slug: CAT } }));
    check("the probe category and post are cleaned up", left === 0);
    void category;
  }

  console.log(
    failures === 0
      ? "\nA new category serves its pages, and nothing else moved.\n"
      : `\n${failures} check${failures === 1 ? "" : "s"} failed.\n`,
  );

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
