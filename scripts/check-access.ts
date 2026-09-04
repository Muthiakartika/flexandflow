/**
 * Walks every admin URL as each role and checks who is actually let in.
 *
 * `check-permissions.ts` proves the permission *table* is right. This proves
 * the **gates** are — that `requirePermission` is on every page, that the API
 * routes check for themselves, and that nothing is reachable just because
 * somebody knows its address. Those are different failures: a page missing its
 * guard passes every table check ever written.
 *
 * It mints a session with the app's own signing key rather than posting a
 * password, so no credential is typed, stored or printed anywhere. The token
 * proves only "this admin id"; every route still re-reads the row and resolves
 * its permissions from the database, which is exactly the path being tested.
 *
 *   npm run check:access                       # against localhost:3008
 *   npx tsx scripts/check-access.ts <baseUrl>
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { PrismaNeon } from "@prisma/adapter-neon";
import { SignJWT } from "jose";

import { PrismaClient } from "../generated/prisma/client";

const BASE = (process.argv[2] ?? "http://localhost:3008").replace(/\/+$/, "");

/** Must match `ADMIN_COOKIE` in `lib/admin/session.ts`. */
const COOKIE = "ff_admin_session";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`    ok    ${label}`);
  } else {
    failures += 1;
    console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function sessionFor(email: string): Promise<string | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!admin) return null;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");

  return new SignJWT({ email: admin.email, name: admin.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

type Outcome = "allowed" | "denied";

/**
 * What happened, in the only two terms that matter.
 *
 * ## Why the status code is not enough
 *
 * Every admin page has a `loading.tsx`, so Next starts streaming its skeleton
 * before the page component — and therefore before `requirePermission` — has
 * run. Once bytes are on the wire the status line is already sent and cannot
 * be changed to a 307, so the redirect is delivered *inside* the stream: a
 * `<meta id="__next-page-redirect" http-equiv="refresh">` for the plain HTML
 * case, and a `NEXT_REDIRECT` digest for the router.
 *
 * The result is that a denied page answers **HTTP 200**. That is safe — the
 * body carries the skeleton and the redirect and none of the page's data,
 * which was checked by hand — but it means a status-only test reads every
 * refusal as a success. This is exactly the trap that made the first run of
 * this script report the content editor as having access to the customer list.
 *
 * So the marker is what decides, and the body is checked for leaks either way.
 */
const REDIRECT_MARKER = 'id="__next-page-redirect"';

/**
 * Content that must never appear on a page somebody was refused. If any of
 * these survives a redirect, the guard fired too late to matter.
 *
 * The viewer's *own* email is excluded by the caller, because the sidebar
 * prints it on every page in the panel — it is who you are signed in as, not
 * somebody else's data. Matching it was this script's own false positive on
 * its second run, and it is worth naming: a leak detector that cries wolf on
 * every page is one whose next real finding gets waved through.
 */
function leaksIn(body: string, ownEmail: string): string[] {
  const others = [...body.matchAll(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((match) => match[0].toLowerCase())
    .filter((email) => email !== ownEmail.toLowerCase());

  const found: string[] = [];

  if (others.length) found.push(`another admin's email (${others[0]})`);
  if (/\+62\s?\d{3}/.test(body)) found.push("a customer phone number");
  if (/Customer<\/th>/i.test(body)) found.push("the bookings table");

  return found;
}

async function visit(
  path: string,
  token: string,
  ownEmail: string,
): Promise<Outcome | string> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: `${COOKIE}=${token}` },
    redirect: "manual",
  });

  if (response.status === 404) return "denied";

  if (response.status === 307 || response.status === 308) {
    const to = response.headers.get("location") ?? "";
    if (to.includes("/admin/login")) return `bounced to login (${to})`;
    if (/\/admin\/?(\?|$)/.test(to)) return "denied";
    return `redirected to ${to}`;
  }

  if (response.status !== 200) return `HTTP ${response.status}`;

  const body = await response.text();

  if (!body.includes(REDIRECT_MARKER)) return "allowed";

  /* Refused — but a refusal that already streamed the data is not a refusal.
     Reported as a leak rather than as a denial so it can never pass quietly. */
  const leaked = leaksIn(body, ownEmail);

  return leaked.length ? `LEAKED ${leaked.join(", ")} before redirecting` : "denied";
}

/** `true` where the account should get in. */
const MATRIX: { path: string; label: string; booking: boolean; content: boolean }[] = [
  { path: "/admin/", label: "panel home", booking: true, content: true },
  { path: "/admin/profile/", label: "own profile", booking: true, content: true },

  /* Website content. */
  { path: "/admin/treatments/", label: "treatments list", booking: false, content: true },
  { path: "/admin/blog/", label: "blog list", booking: false, content: true },
  { path: "/admin/treatments/new/", label: "new treatment", booking: false, content: true },
  { path: "/admin/blog/new/", label: "new post", booking: false, content: true },
  { path: "/api/cms/media/", label: "image library API", booking: false, content: true },

  /* The diary. */
  { path: "/admin/bookings/", label: "bookings list", booking: true, content: false },
  { path: "/admin/schedule/", label: "schedule", booking: true, content: false },
  { path: "/admin/services/", label: "booking prices", booking: true, content: false },
  {
    path: "/admin/bookings/export/",
    label: "customer CSV export",
    booking: true,
    content: false,
  },

  /* Neither. */
  { path: "/admin/settings/", label: "studio settings", booking: false, content: false },
  { path: "/admin/team/", label: "admin accounts", booking: false, content: false },
  { path: "/admin/team/new/", label: "add an admin", booking: false, content: false },
  { path: "/admin/intake/", label: "intake form editor", booking: false, content: false },
];

async function main(): Promise<void> {
  console.log(`\nChecking access at ${BASE}\n`);

  const accounts = [
    { email: "booking@flexandflow.fit", key: "booking" as const, label: "Booking Staff" },
    { email: "content@flexandflow.fit", key: "content" as const, label: "Content Editor" },
  ];

  for (const account of accounts) {
    const token = await sessionFor(account.email);

    if (!token) {
      console.log(`  ${account.email} — no such account, skipped\n`);
      continue;
    }

    console.log(`  ${account.label} (${account.email})\n`);

    for (const row of MATRIX) {
      const expected: Outcome = row[account.key] ? "allowed" : "denied";
      const actual = await visit(row.path, token, account.email);

      check(
        `${expected === "allowed" ? "can" : "cannot"} reach ${row.label} (${row.path})`,
        actual === expected,
        actual === expected ? "" : `got ${actual}`,
      );
    }

    console.log("");
  }

  /* The gate that protects everything above. Without a cookie at all, nothing
     may answer 200. */
  console.log("  Nobody at all\n");

  for (const row of MATRIX) {
    const response = await fetch(`${BASE}${row.path}`, { redirect: "manual" });
    check(
      `${row.path} is closed to anonymous callers`,
      response.status !== 200,
      `HTTP ${response.status}`,
    );
  }

  console.log(
    failures === 0
      ? "\nEvery route let in exactly who it should.\n"
      : `\n${failures} access check${failures === 1 ? "" : "s"} failed.\n`,
  );

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
