/**
 * Creates an admin account from the command line.
 *
 * For the accounts that exist before anybody can sign in to make them, and for
 * handing someone a login without typing their password into a shared screen.
 * Everything it does is also possible at `/admin/team/` once a super admin can
 * get in.
 *
 * **The password is never printed.** Terminal output ends up in logs, in
 * screen shares and in transcripts; a credential that reaches any of those has
 * to be treated as burned. It is appended to `.admin-accounts.txt` instead,
 * which is gitignored — read it, pass it on, delete it.
 *
 *   npx tsx scripts/create-admin.ts --email a@b.c --name "Name" --role EDITOR
 *   npx tsx scripts/create-admin.ts ... --grant content.publish --grant media.delete
 *   npx tsx scripts/create-admin.ts ... --password "one you chose"
 *
 * Roles: SUPER_ADMIN | EDITOR | BOOKING_STAFF. Re-running for an email that
 * already exists updates the role and grants and leaves the password alone,
 * so it cannot silently lock somebody out.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";
import {
  PERMISSIONS,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
  permissionsFor,
  type AdminRoleValue,
  type Permission,
} from "../lib/admin/permissions";

/** Matches `prisma/seed.ts` and `lib/admin/team-actions.ts`. */
const BCRYPT_COST = 12;

const CREDENTIALS_FILE = ".admin-accounts.txt";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

function arg(name: string): string | undefined {
  const argv = process.argv;
  const at = argv.indexOf(`--${name}`);
  return at !== -1 && argv[at + 1] ? argv[at + 1] : undefined;
}

function args(name: string): string[] {
  const out: string[] = [];
  const argv = process.argv;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === `--${name}` && argv[i + 1]) out.push(argv[i + 1]);
  }
  return out;
}

/**
 * 24 characters from a 20-byte random source.
 *
 * base64url, so it survives being copied out of a text file and pasted into a
 * form without any character needing to be escaped or hunted for on a phone
 * keyboard. Comfortably inside bcrypt's 72-byte ceiling.
 */
function generatePassword(): string {
  return randomBytes(20).toString("base64url").slice(0, 24);
}

function isRole(value: string): value is AdminRoleValue {
  return value in ROLE_PERMISSIONS;
}

function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const role = arg("role")?.trim().toUpperCase();
  const chosen = arg("password");
  const grants = args("grant").map((g) => g.trim());

  if (!email || !name || !role) {
    console.error(
      "Usage: npx tsx scripts/create-admin.ts --email <email> --name <name> " +
        "--role <SUPER_ADMIN|EDITOR|BOOKING_STAFF> [--grant <permission>]… " +
        "[--password <password>]",
    );
    process.exit(1);
  }

  if (!isRole(role)) {
    console.error(
      `Unknown role "${role}". Use one of: ${Object.keys(ROLE_PERMISSIONS).join(", ")}`,
    );
    process.exit(1);
  }

  const unknown = grants.filter((g) => !isPermission(g));
  if (unknown.length) {
    console.error(
      `Unknown permission(s): ${unknown.join(", ")}\nKnown: ${PERMISSIONS.join(", ")}`,
    );
    process.exit(1);
  }

  /* A grant that the role already carries is dropped rather than stored: it
     would do nothing today and would quietly become real if the role's
     defaults were ever narrowed. */
  const extra = grants.filter(
    (g) => isPermission(g) && !ROLE_PERMISSIONS[role].includes(g),
  );

  const existing = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: { name, role, extraPermissions: extra, active: true, deletedAt: null },
    });

    console.log(
      `\nUpdated ${email} — ${ROLE_LABEL[role]}.\n` +
        `Password left unchanged; use /admin/team/ or --password to set a new one.\n`,
    );
  } else {
    const password = chosen ?? generatePassword();

    await prisma.adminUser.create({
      data: {
        email,
        name,
        role,
        extraPermissions: extra,
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      },
    });

    if (!chosen) {
      appendFileSync(
        CREDENTIALS_FILE,
        `${email}\n  name:     ${name}\n  role:     ${ROLE_LABEL[role]}\n` +
          `  password: ${password}\n\n`,
        "utf8",
      );
    }

    console.log(
      `\nCreated ${email} — ${ROLE_LABEL[role]}.\n` +
        (chosen
          ? "Password: the one you passed in.\n"
          : `Password written to ${CREDENTIALS_FILE} (gitignored).\n` +
            "Read it, pass it on, then delete the file.\n"),
    );
  }

  /* Printed so the caller can see what the account can actually do without
     cross-referencing a table — the whole point of the exercise is usually
     that it can do less than they feared or more than they intended. */
  const resolved = permissionsFor(role, extra);
  console.log(`  Can: ${resolved.join(", ")}`);
  console.log(
    `  Cannot: ${PERMISSIONS.filter((p) => !resolved.includes(p)).join(", ") || "—"}\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
