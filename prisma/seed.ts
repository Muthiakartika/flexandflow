/**
 * Seeds the booking catalogue.
 *
 * Everything bookable is derived from the data the site already publishes —
 * `lib/data/services.ts` for the price list, `lib/data/therapists.ts` for the
 * staff, `lib/site.ts` for the studio's contact details — so the seed cannot
 * introduce a figure the marketing pages do not carry. The one exception is
 * `EXTRA_VARIANTS` below, which is deliberately the only place a price is
 * typed by hand.
 *
 * Prices and durations go through `lib/pricing.ts`. The source rows are not
 * uniform (an `Rp` prefix on some, 30/60/90-minute sessions, tiers with no
 * duration of their own) and reading them by hand has published a wrong price
 * three times — see CLAUDE.md, "Data hazards in lib/data/services.ts".
 *
 * Safe to run repeatedly: every write is an upsert keyed on the schema's own
 * unique columns, and nothing here deletes a booking.
 *
 * Run with `npm run db:seed`. It runs under `tsx`, outside Next, so it builds
 * its own client instead of importing `lib/db.ts` — that module pulls in
 * `server-only`, which throws anywhere but a Next server build.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import ws from "ws";

import { PrismaClient } from "@/generated/prisma/client";
import { TIER_LABEL, type Tier } from "@/lib/booking/types";
import { services } from "@/lib/data/services";
import { therapists } from "@/lib/data/therapists";
import { priceAmount, tierMinutes } from "@/lib/pricing";
import { contact } from "@/lib/site";
import type { Service } from "@/types";

/* ─────────────────────────────────────────────────────────────────────────
 * Variants the price list does not carry
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * NOT FROM THE PRICE LIST — VERIFY BEFORE GO-LIVE.
 *
 * These two rows come from screenshots of the old BookingPress flow, which
 * sold 90-minute sessions that `lib/data/services.ts` has no entry for. They
 * are hand-typed, which makes them the only prices in the booking system that
 * `npm run check:prices` cannot verify against the marketing pages — the
 * script reports them as informational rather than silently blessing them.
 *
 * The owner should confirm both figures against the official price list and
 * correct them here; this array is the single place they exist.
 */
const EXTRA_VARIANTS: {
  serviceSlug: string;
  tier: Tier;
  durationMinutes: number;
  priceIdr: number;
}[] = [
  {
    serviceSlug: "sport-massage",
    tier: "MASTER",
    durationMinutes: 90,
    priceIdr: 1_000_000,
  },
  {
    serviceSlug: "lymphatic-drainage",
    tier: "MASTER",
    durationMinutes: 90,
    priceIdr: 1_000_000,
  },
];

/* ─────────────────────────────────────────────────────────────────────────
 * Catalogue shape
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The chips the old booking flow offered, in its order. It spelled two of them
 * "Assisted Streching" and "Cupping Theraphy"; those are typos, corrected here
 * on purpose — the misspellings were never part of the brand and the new UI
 * has no reason to inherit them.
 */
const CATEGORIES = [
  { slug: "trauma-healing", name: "Trauma Healing" },
  { slug: "lymphatic-massage", name: "Lymphatic Massage" },
  { slug: "assisted-stretching", name: "Assisted Stretching" },
  { slug: "sports-massage", name: "Sports Massage" },
  { slug: "cupping-therapy", name: "Cupping Therapy" },
  { slug: "pregnancy-massage", name: "Pregnancy Massage" },
] as const;

/**
 * Service slug → category slug. A service missing from here is seeded without
 * a category rather than forced into an approximate one: an uncategorised
 * service still appears under the "All" chip, while a wrong chip hides it from
 * the customer who was looking for it.
 */
const CATEGORY_OF = new Map<string, string>([
  ["trauma-healing", "trauma-healing"],
  ["lymphatic-drainage", "lymphatic-massage"],
  ["lymphatic-detox-massage-for-men", "lymphatic-massage"],
  ["assisted-stretching", "assisted-stretching"],
  ["sport-massage", "sports-massage"],
  ["cupping-therapy", "cupping-therapy"],
  ["pregnancy-massage-service", "pregnancy-massage"],
]);

/**
 * Clean-down time held after a session. Cupping runs 30 minutes, where the
 * standard 15-minute gap would cost half the booking again in unsellable time.
 */
const BUFFER_MINUTES = new Map<string, number>([["cupping-therapy", 10]]);
const DEFAULT_BUFFER_MINUTES = 15;

/** `"Master Therapist"` → `"MASTER"`, so the two files can never disagree. */
const TIER_BY_LABEL = new Map<string, Tier>(
  (Object.keys(TIER_LABEL) as Tier[]).map((tier) => [TIER_LABEL[tier], tier]),
);

/** Which slug in `lib/data/therapists.ts` is which staff member here. */
const THERAPIST_SEED: {
  slug: string;
  displayName: string;
  tier: Tier;
  sortOrder: number;
}[] = [
  {
    slug: "ginny",
    displayName: "Master Therapist - Ginny",
    tier: "MASTER",
    sortOrder: 0,
  },
  { slug: "yuni", displayName: "Yuni", tier: "STANDARD", sortOrder: 1 },
];

/**
 * Monday to Friday, mornings and afternoons, reproducing the slot grid of the
 * old booking flow — the 12:00–14:00 gap is what makes its Morning/Afternoon
 * split appear without any code knowing about lunch.
 *
 * Narrower than the "08:00 - 17:00 hrs" that `lib/site.ts` advertises and that
 * both therapist profiles repeat. The two need reconciling: either the site
 * overstates the day or the studio takes bookings from 08:00. Set the real
 * hours per therapist in the admin panel — this is only a starting grid.
 */
const WORKING_WEEKDAYS = [1, 2, 3, 4, 5];
const WORKING_BLOCKS = [
  { startMinute: 9 * 60, endMinute: 12 * 60 },
  { startMinute: 14 * 60, endMinute: 17 * 60 },
];

/* ─────────────────────────────────────────────────────────────────────────
 * Client
 * ───────────────────────────────────────────────────────────────────────── */

/* Node has no global WebSocket before v22, and Neon's driver needs one. Next's
   runtime provides it, which is why `lib/db.ts` says nothing about this. */
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — nothing to seed into.");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

/* ─────────────────────────────────────────────────────────────────────────
 * Derivation
 * ───────────────────────────────────────────────────────────────────────── */

type SeedVariant = { tier: Tier; durationMinutes: number; priceIdr: number };

/** Rows the marketing data resolves to a tier, a price and a length. */
function variantsOf(service: Service, unresolved: string[]): SeedVariant[] {
  return service.tiers.flatMap((row) => {
    const tier = TIER_BY_LABEL.get(row.label);
    const priceIdr = priceAmount(row);
    const durationMinutes = tierMinutes(service, row);

    if (tier && priceIdr !== null && durationMinutes !== null) {
      return [{ tier, durationMinutes, priceIdr }];
    }

    /* Anything unresolvable is left out and reported rather than guessed: a
       tier with no duration anywhere cannot be turned into a slot, and an
       invented length is exactly how a wrong price reaches a customer. */
    unresolved.push(
      `${service.slug} · ${row.label} — ` +
        [
          tier ? null : "unknown tier label",
          priceIdr === null ? "no readable price" : null,
          durationMinutes === null ? "no duration on the tier or service" : null,
        ]
          .filter(Boolean)
          .join(", "),
    );
    return [];
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * Seed
 * ───────────────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const before = {
    categories: await prisma.serviceCategory.count(),
    services: await prisma.service.count(),
    variants: await prisma.serviceVariant.count(),
    therapists: await prisma.therapist.count(),
  };

  // ── Categories ────────────────────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: index },
      create: { slug: category.slug, name: category.name, sortOrder: index },
    });
    categoryIds.set(category.slug, row.id);
  }

  // ── Services & variants ───────────────────────────────────────────────
  const unresolved: string[] = [];
  const extrasBySlug = new Map<string, SeedVariant[]>();
  for (const extra of EXTRA_VARIANTS) {
    const held = extrasBySlug.get(extra.serviceSlug) ?? [];
    held.push(extra);
    extrasBySlug.set(extra.serviceSlug, held);
  }

  /* `facial-massage` and `full-body-massage` carry `tiers: []` — the source
     site publishes no rates for either — so they fall out here and stay off
     the booking menu until the owner sets a price. */
  const priced = services.flatMap((service) => {
    const variants = variantsOf(service, unresolved);
    return variants.length ? [{ service, variants }] : [];
  });

  const serviceIds = new Map<string, string>();
  const tiersOffered = new Map<string, Set<Tier>>();
  let variantCount = 0;

  for (const [index, { service, variants }] of priced.entries()) {
    const categorySlug = CATEGORY_OF.get(service.slug);
    const fields = {
      title: service.title,
      excerpt: service.excerpt,
      image: service.image,
      bufferMinutes: BUFFER_MINUTES.get(service.slug) ?? DEFAULT_BUFFER_MINUTES,
      sortOrder: index,
      categoryId: categorySlug ? (categoryIds.get(categorySlug) ?? null) : null,
    };

    const row = await prisma.service.upsert({
      where: { slug: service.slug },
      update: fields,
      create: { slug: service.slug, ...fields },
    });
    serviceIds.set(service.slug, row.id);

    const all = [...variants, ...(extrasBySlug.get(service.slug) ?? [])];
    tiersOffered.set(service.slug, new Set(all.map((variant) => variant.tier)));

    for (const variant of all) {
      await prisma.serviceVariant.upsert({
        where: {
          serviceId_tier_durationMinutes: {
            serviceId: row.id,
            tier: variant.tier,
            durationMinutes: variant.durationMinutes,
          },
        },
        update: { priceIdr: variant.priceIdr },
        create: {
          serviceId: row.id,
          tier: variant.tier,
          durationMinutes: variant.durationMinutes,
          priceIdr: variant.priceIdr,
        },
      });
      variantCount += 1;
    }
  }

  const orphanExtras = EXTRA_VARIANTS.filter(
    (extra) => !serviceIds.has(extra.serviceSlug),
  );

  // ── Therapists ────────────────────────────────────────────────────────
  const therapistIds = new Map<string, string>();
  for (const seed of THERAPIST_SEED) {
    const profile = therapists.find((row) => row.slug === seed.slug);
    if (!profile) {
      throw new Error(
        `No profile for "${seed.slug}" in lib/data/therapists.ts — the seed ` +
          `and the site would disagree about who works here.`,
      );
    }

    /* The studio's shared inbox and WhatsApp number, because that is all the
       site publishes. Give each therapist their own address and number in the
       admin panel — until then every "new booking" notice lands in one place
       and neither therapist is reachable individually. */
    const fields = {
      name: profile.name,
      displayName: seed.displayName,
      tier: seed.tier,
      email: contact.email,
      phoneE164: contact.phone,
      photo: profile.portrait,
      sortOrder: seed.sortOrder,
      active: true,
    };

    const row = await prisma.therapist.upsert({
      where: { slug: seed.slug },
      update: fields,
      create: { slug: seed.slug, ...fields },
    });
    therapistIds.set(seed.slug, row.id);
  }

  // ── Who offers what ───────────────────────────────────────────────────
  /* A therapist can only work a service that has a variant at their tier —
     the Standard column is the whole of what Yuni can charge, so a service
     priced for Master only is not hers to give. */
  let linkCount = 0;
  for (const seed of THERAPIST_SEED) {
    const therapistId = therapistIds.get(seed.slug);
    if (!therapistId) continue;

    for (const [slug, serviceId] of serviceIds) {
      if (!tiersOffered.get(slug)?.has(seed.tier)) continue;

      await prisma.serviceOnTherapist.upsert({
        where: { therapistId_serviceId: { therapistId, serviceId } },
        update: {},
        create: { therapistId, serviceId },
      });
      linkCount += 1;
    }
  }

  // ── Working hours ─────────────────────────────────────────────────────
  /* `WorkingHour` has no natural key, so re-seeding cannot upsert it. It is
     filled in only where a therapist has no schedule at all, which keeps a
     re-run from stamping over hours the owner has since edited. */
  const schedules: string[] = [];
  for (const [slug, therapistId] of therapistIds) {
    const existing = await prisma.workingHour.count({ where: { therapistId } });
    if (existing > 0) {
      schedules.push(`${slug}: kept ${existing} existing rows`);
      continue;
    }

    await prisma.workingHour.createMany({
      data: WORKING_WEEKDAYS.flatMap((weekday) =>
        WORKING_BLOCKS.map((block) => ({ therapistId, weekday, ...block })),
      ),
    });
    schedules.push(
      `${slug}: ${WORKING_WEEKDAYS.length * WORKING_BLOCKS.length} rows created`,
    );
  }

  // ── Admin user ────────────────────────────────────────────────────────
  /* Read straight from the environment: these two are seed-only and so are not
     in `lib/env.ts`, which the seed could not import anyway. There is no
     default password on purpose — a shipped one is a public one. */
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  let admin = "skipped — set ADMIN_EMAIL and ADMIN_PASSWORD to create one";

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const name = process.env.ADMIN_NAME?.trim() || "Flex & Flow";

    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      /* The environment is the source of truth for this login, so a re-run
         resets the password to whatever ADMIN_PASSWORD now says. */
      update: { passwordHash, name, active: true },
      create: { email: adminEmail, passwordHash, name },
    });
    admin = adminEmail;
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const after = {
    categories: await prisma.serviceCategory.count(),
    services: await prisma.service.count(),
    variants: await prisma.serviceVariant.count(),
    therapists: await prisma.therapist.count(),
  };

  const line = (label: string, written: number, key: keyof typeof before) =>
    `  ${label.padEnd(12)} ${String(written).padStart(3)} written, ` +
    `${after[key] - before[key]} new`;

  console.log("Booking catalogue seeded.");
  console.log(line("categories", CATEGORIES.length, "categories"));
  console.log(line("services", priced.length, "services"));
  console.log(
    line("variants", variantCount, "variants") +
      ` (${EXTRA_VARIANTS.length - orphanExtras.length} from EXTRA_VARIANTS)`,
  );
  console.log(line("therapists", THERAPIST_SEED.length, "therapists"));
  console.log(`  ${"links".padEnd(12)} ${String(linkCount).padStart(3)} written`);
  for (const schedule of schedules) console.log(`  hours        ${schedule}`);
  console.log(`  admin        ${admin}`);

  if (unresolved.length) {
    console.log("\nNot bookable — no price or no duration in the source data:");
    for (const note of unresolved) console.log(`  - ${note}`);
  }

  if (orphanExtras.length) {
    console.log("\nEXTRA_VARIANTS pointing at a service that was not seeded:");
    for (const extra of orphanExtras) console.log(`  - ${extra.serviceSlug}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
