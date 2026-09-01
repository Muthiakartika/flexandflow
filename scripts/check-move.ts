/**
 * Proves a blog post still resolves after its category changes.
 *
 * Moving a post rewrites its URL, and the two categories are not symmetric:
 * `/injury-guide/<slug>/` serves posts only, while `/uluwatu-bali/<slug>/`
 * serves **both** posts and treatments and resolves services first
 * (`lib/content.ts`). So a post moved into `uluwatu-bali` is the case most
 * likely to end up reachable in the database and 404 on the site, and it is
 * the reason this check exists rather than a note saying it should be fine.
 *
 * Everything happens on a throwaway document that is **never published** —
 * the routing is exercised through Draft Mode instead, so nothing enters the
 * sitemap and no real page is touched. The document is deleted at the end,
 * including when a check fails.
 *
 *   npm run check:move
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { PrismaNeon } from "@prisma/adapter-neon";
import { SignJWT } from "jose";

import { PrismaClient } from "../generated/prisma/client";

const BASE = (process.argv[2] ?? "http://localhost:3008").replace(/\/+$/, "");
const ADMIN_COOKIE = "ff_admin_session";
const SLUG = "cms-move-probe-do-not-publish";

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

/** The `__prerender_bypass` cookie, obtained the way the editor obtains it. */
async function draftCookie(docId: string, token: string): Promise<string> {
  const response = await fetch(`${BASE}/api/cms/preview/?id=${docId}`, {
    headers: { cookie: `${ADMIN_COOKIE}=${token}` },
    redirect: "manual",
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  const bypass = /__prerender_bypass=([^;]+)/.exec(setCookie)?.[1];

  if (!bypass) throw new Error("Draft mode did not set its cookie.");
  return `${ADMIN_COOKIE}=${token}; __prerender_bypass=${bypass}`;
}

async function status(path: string, cookie: string): Promise<number> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie },
    redirect: "manual",
  });
  return response.status;
}

async function main(): Promise<void> {
  console.log(`\nMoving a post between categories, at ${BASE}\n`);

  await prisma.contentDoc.deleteMany({
    where: { slug: SLUG },
  });

  const doc = await prisma.contentDoc.create({
    data: {
      kind: "POST",
      slug: SLUG,
      urlPrefix: "injury-guide",
      /* Never published. The routing is exercised through Draft Mode, so this
         document cannot reach the sitemap or a visitor. */
      status: "DRAFT",
      sortOrder: 9999,
      revisions: {
        create: {
          version: 1,
          title: "Move probe",
          excerpt: "A throwaway document used by scripts/check-move.ts.",
          body: [
            { type: "paragraph", text: "Probe body, unique string QZX7-PROBE." },
          ] as never,
          seoTitle: "Move probe",
          seoDescription: "Throwaway.",
          canonicalPath: `/injury-guide/${SLUG}/`,
          displayDate: "January 1, 2026",
        },
      },
    },
    select: { id: true },
  });

  try {
    const token = await adminToken();
    const cookie = await draftCookie(doc.id, token);

    check(
      "the draft resolves at /injury-guide/",
      (await status(`/injury-guide/${SLUG}/`, cookie)) === 200,
    );
    check(
      "it does not also answer at /uluwatu-bali/",
      (await status(`/uluwatu-bali/${SLUG}/`, cookie)) === 404,
    );

    // ── The move ───────────────────────────────────────────────────────────
    await prisma.contentDoc.update({
      where: { id: doc.id },
      data: { urlPrefix: "uluwatu-bali" },
    });

    check(
      "after the move it resolves at /uluwatu-bali/",
      (await status(`/uluwatu-bali/${SLUG}/`, cookie)) === 200,
      "a post moved into the treatments' namespace must still be found",
    );
    check(
      "the old /injury-guide/ address now 404s",
      (await status(`/injury-guide/${SLUG}/`, cookie)) === 404,
      "nothing redirects automatically — the editor warns about exactly this",
    );

    // ── And back ───────────────────────────────────────────────────────────
    await prisma.contentDoc.update({
      where: { id: doc.id },
      data: { urlPrefix: "injury-guide" },
    });

    check(
      "moving back restores the original address",
      (await status(`/injury-guide/${SLUG}/`, cookie)) === 200,
    );

    // ── The collision the unique index has to catch ────────────────────────
    const clash = await prisma.contentDoc
      .update({
        where: { id: doc.id },
        data: { urlPrefix: "uluwatu-bali", slug: "assisted-stretching" },
      })
      .then(() => null)
      .catch((error: { code?: string }) => error.code);

    check(
      "moving onto an existing treatment's address is refused by the database",
      clash === "P2002",
      clash === null
        ? "the move succeeded — two documents now claim one URL"
        : `got ${clash}`,
    );
  } finally {
    await prisma.contentDoc.deleteMany({ where: { slug: SLUG } });
    const left = await prisma.contentDoc.count({ where: { slug: SLUG } });
    check("the probe document is cleaned up", left === 0);
  }

  console.log(
    failures === 0
      ? "\nA moved post is reachable at its new address and gone from the old one.\n"
      : `\n${failures} check${failures === 1 ? "" : "s"} failed.\n`,
  );

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.contentDoc.deleteMany({ where: { slug: SLUG } }).catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
