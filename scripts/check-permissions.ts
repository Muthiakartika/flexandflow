/**
 * Exercises the role and permission rules against the real database.
 *
 * These are the checks that cannot be made by looking at a page: whether a
 * demotion would strand the panel, whether an editor's resolved permissions
 * are what the table says, whether a grant of something that is not a
 * permission is ignored. Every one of them is a rule the admin actions rely
 * on, and each is a way to lock the studio out of its own panel.
 *
 * Read-only apart from one account it creates and deletes by a reserved
 * address, so it is safe to run against production data.
 *
 *   npx tsx scripts/check-permissions.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated/prisma/client";
import {
  grantableFor,
  PERMISSIONS,
  permissionsFor,
  ROLE_PERMISSIONS,
  wouldStrand,
} from "../lib/admin/permissions";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

/** Never a real login: no mailbox, and the local part is not a valid address. */
const PROBE_EMAIL = "cms-permission-probe@invalid.flexandflow.test";

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

async function main(): Promise<void> {
  console.log("\nPermission table\n");

  check(
    "a super admin holds every permission",
    same(permissionsFor("SUPER_ADMIN"), PERMISSIONS),
  );

  check(
    "an editor holds only the four defaults",
    same(permissionsFor("EDITOR"), [
      "content.view",
      "content.create",
      "content.update",
      "media.upload",
    ]),
    permissionsFor("EDITOR").join(", "),
  );

  check(
    "publishing is a grant, not an editor default",
    !ROLE_PERMISSIONS.EDITOR.includes("content.publish"),
  );

  check(
    "bookings are a grant, so a content editor sees no customer data",
    !ROLE_PERMISSIONS.EDITOR.includes("booking.manage"),
  );

  check(
    "booking staff hold booking.manage and nothing else",
    same(permissionsFor("BOOKING_STAFF"), ["booking.manage"]),
    permissionsFor("BOOKING_STAFF").join(", "),
  );

  /* The separation the studio actually asked for. Asserted rather than
     assumed, because the failure is silent: widening one role's defaults by a
     line would hand the website to the front desk or the customer list to the
     copywriter, and nothing on either screen would look wrong. */
  {
    const editor = new Set<string>(permissionsFor("EDITOR"));
    const booking = new Set<string>(permissionsFor("BOOKING_STAFF"));
    const overlap = [...editor].filter((p) => booking.has(p));

    check(
      "the editor and booking roles share no permission at all",
      overlap.length === 0,
      overlap.join(", "),
    );
  }

  check(
    "booking staff cannot touch website content",
    !permissionsFor("BOOKING_STAFF").some((p) => p.startsWith("content.")) &&
      !permissionsFor("BOOKING_STAFF").some((p) => p.startsWith("media.")),
  );

  check(
    "a content editor cannot open a booking",
    !permissionsFor("EDITOR").includes("booking.manage"),
  );

  check(
    "neither role can manage admin accounts or studio settings",
    !permissionsFor("EDITOR").includes("admin.manage") &&
      !permissionsFor("EDITOR").includes("settings.manage") &&
      !permissionsFor("BOOKING_STAFF").includes("admin.manage") &&
      !permissionsFor("BOOKING_STAFF").includes("settings.manage"),
  );

  check(
    "neither role can edit or view the intake form by default",
    !permissionsFor("EDITOR").includes("intake.manage") &&
      !permissionsFor("EDITOR").includes("intake.view") &&
      !permissionsFor("BOOKING_STAFF").includes("intake.manage") &&
      !permissionsFor("BOOKING_STAFF").includes("intake.view"),
  );

  check(
    "a super admin holds intake.manage and intake.view",
    permissionsFor("SUPER_ADMIN").includes("intake.manage") &&
      permissionsFor("SUPER_ADMIN").includes("intake.view"),
  );

  check(
    "a granted permission is added",
    permissionsFor("EDITOR", ["content.publish"]).includes("content.publish"),
  );

  check(
    "an unknown grant is dropped rather than carried",
    !permissionsFor("EDITOR", ["content.everything"]).includes(
      "content.everything" as never,
    ),
  );

  check(
    "a duplicate grant does not duplicate the permission",
    permissionsFor("EDITOR", ["content.publish", "content.publish"]).filter(
      (p) => p === "content.publish",
    ).length === 1,
  );

  /* The form offers grants per role now, not one shared list — a checkbox for
     something the role already holds is one nobody can untick. */
  for (const role of ["EDITOR", "BOOKING_STAFF", "SUPER_ADMIN"] as const) {
    const offered = grantableFor(role);

    check(
      `the grants offered for ${role} are real and not already held`,
      offered.every(
        (p) => PERMISSIONS.includes(p) && !ROLE_PERMISSIONS[role].includes(p),
      ),
      offered.join(", "),
    );
  }

  check(
    "a super admin is offered no grants, holding everything already",
    grantableFor("SUPER_ADMIN").length === 0,
  );

  check(
    "booking.manage is offered to an editor — crossing the line is possible, but deliberate",
    grantableFor("EDITOR").includes("booking.manage"),
  );

  // ── The stranding guard ─────────────────────────────────────────────────
  console.log("\nStranding guard\n");

  /* The same count `lib/admin/team.ts` supplies, read here directly so the
     rule can be exercised without importing a `server-only` module. */
  const activeSupers = () =>
    prisma.adminUser.count({
      where: { role: "SUPER_ADMIN", active: true, deletedAt: null },
    });

  const before = await activeSupers();
  console.log(`  (${before} active super admin${before === 1 ? "" : "s"})`);

  const lastOne = { role: "SUPER_ADMIN", active: true, deleted: false } as const;

  check(
    "demoting the last super admin is refused",
    wouldStrand(lastOne, 1, { role: "EDITOR" }),
  );
  check(
    "deactivating the last super admin is refused",
    wouldStrand(lastOne, 1, { active: false }),
  );
  check(
    "deleting the last super admin is refused",
    wouldStrand(lastOne, 1, { deleted: true }),
  );
  check(
    "renaming the last super admin is allowed",
    !wouldStrand(lastOne, 1, {}),
  );
  check(
    "granting the last super admin something is allowed",
    !wouldStrand(lastOne, 1, { role: "SUPER_ADMIN", active: true }),
  );
  check(
    "demoting one of two super admins is allowed",
    !wouldStrand(lastOne, 2, { role: "EDITOR" }),
  );
  check(
    "demoting an editor is never a stranding",
    !wouldStrand({ role: "EDITOR", active: true, deleted: false }, 1, {
      deleted: true,
    }),
  );
  check(
    "an already-inactive super admin is not the last one",
    !wouldStrand({ role: "SUPER_ADMIN", active: false, deleted: false }, 1, {
      deleted: true,
    }),
  );

  // ── A real account, created and removed ─────────────────────────────────
  console.log("\nRound trip through the database\n");

  await prisma.adminUser.deleteMany({ where: { email: PROBE_EMAIL } });

  const probe = await prisma.adminUser.create({
    data: {
      email: PROBE_EMAIL,
      name: "Permission probe",
      /* Not a usable credential: a bcrypt hash of a value nobody holds. The
         account is deleted a few lines below either way. */
      passwordHash: "$2b$12$C6UzMDM.H6dfI/f/IKcEe.KI1bkYnkxKfKcJVYqrDSKfVYnQIbF1O",
      extraPermissions: ["content.publish", "not-a-permission"],
    },
  });

  check("a new account defaults to EDITOR", probe.role === "EDITOR");

  const resolved = permissionsFor(probe.role, probe.extraPermissions);
  check(
    "its granted permission survives the round trip",
    resolved.includes("content.publish"),
  );
  check(
    "the junk grant stored beside it is ignored",
    !resolved.includes("not-a-permission" as never),
  );
  check(
    "it still cannot manage admins or bookings",
    !resolved.includes("admin.manage") && !resolved.includes("booking.manage"),
  );

  check(
    "deleting this editor never strands the panel",
    !wouldStrand(
      { role: probe.role, active: probe.active, deleted: false },
      await activeSupers(),
      { deleted: true },
    ),
  );

  await prisma.adminUser.delete({ where: { id: probe.id } });
  check(
    "the probe account is gone",
    (await prisma.adminUser.count({ where: { email: PROBE_EMAIL } })) === 0,
  );

  check("the super admin count is unchanged", (await activeSupers()) === before);

  // ── The real accounts ───────────────────────────────────────────────────
  console.log("\nAccounts on this database\n");

  const accounts = await prisma.adminUser.findMany({
    where: { deletedAt: null },
    select: { email: true, role: true, extraPermissions: true, active: true },
    orderBy: { createdAt: "asc" },
  });

  for (const account of accounts) {
    const held = permissionsFor(account.role, account.extraPermissions);
    console.log(
      `  ${account.email} — ${account.role}${account.active ? "" : " (inactive)"}\n` +
        `        can: ${held.join(", ")}`,
    );
  }

  const editors = accounts.filter((a) => a.role === "EDITOR");
  const staff = accounts.filter((a) => a.role === "BOOKING_STAFF");

  if (editors.length) {
    check(
      "no content editor account can reach bookings",
      editors.every(
        (a) => !permissionsFor(a.role, a.extraPermissions).includes("booking.manage"),
      ),
    );
  }

  if (staff.length) {
    check(
      "no booking account can reach website content",
      staff.every((a) =>
        permissionsFor(a.role, a.extraPermissions).every(
          (p) => !p.startsWith("content.") && !p.startsWith("media."),
        ),
      ),
    );
  }

  console.log(
    failures === 0
      ? "\nAll permission checks passed.\n"
      : `\n${failures} check${failures === 1 ? "" : "s"} failed.\n`,
  );

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
