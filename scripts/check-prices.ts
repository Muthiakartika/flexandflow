/**
 * Checks that the booking catalogue and the marketing pages quote the same
 * price. Run with `npm run check:prices`; it exits non-zero on any difference.
 *
 * There are now two places a price can be wrong. `lib/data/services.ts` feeds
 * the service pages and `ServiceVariant` feeds the wizard, and BOOKING-PLAN.md
 * §2.1 accepts that split because the old booking flow sold variants the price
 * list never carried. What it does not accept is the two drifting apart: this
 * repo has published a wrong price three times already (CLAUDE.md, "Data
 * hazards"), and a customer who reads Rp750,000 on the service page and is
 * charged Rp800,000 at checkout has been misled by the site, not by an edge
 * case.
 *
 * Only (tier, duration) pairs that exist on both sides are compared. Variants
 * that exist only in the database are the deliberate additions from the seed's
 * `EXTRA_VARIANTS`; they are reported so the owner can eyeball them, but they
 * cannot fail the check — there is nothing to check them against.
 *
 * Runs under `tsx`, outside Next, so it builds its own client rather than
 * importing `lib/db.ts` (which pulls in `server-only`).
 */
import "dotenv/config";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { PrismaClient } from "@/generated/prisma/client";
import { TIER_LABEL, type Tier } from "@/lib/booking/types";
import { services } from "@/lib/data/services";
import { formatIdr, priceAmount, tierMinutes } from "@/lib/pricing";

/* Node has no global WebSocket before v22, and Neon's driver needs one. */
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set — no catalogue to check.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const TIER_BY_LABEL = new Map<string, Tier>(
  (Object.keys(TIER_LABEL) as Tier[]).map((tier) => [TIER_LABEL[tier], tier]),
);

/** One row per (tier, duration) the marketing data actually resolves. */
function advertised(slug: string): Map<string, number> {
  const service = services.find((row) => row.slug === slug);
  const rates = new Map<string, number>();
  if (!service) return rates;

  for (const row of service.tiers) {
    const tier = TIER_BY_LABEL.get(row.label);
    const amount = priceAmount(row);
    const minutes = tierMinutes(service, row);
    /* Same three conditions the seed uses, so a row it could not resolve is
       not reported here as missing from the database. */
    if (tier && amount !== null && minutes !== null) {
      rates.set(key(tier, minutes), amount);
    }
  }

  return rates;
}

function key(tier: Tier, minutes: number): string {
  return `${tier}:${minutes}`;
}

function describe(tier: Tier, minutes: number): string {
  return `${TIER_LABEL[tier]} · ${minutes} min`;
}

async function main(): Promise<number> {
  const rows = await prisma.service.findMany({
    /* Only what can be charged. A deactivated variant is not on sale, so its
       price disagreeing with the site is not a difference anyone can meet. */
    include: { variants: { where: { active: true } } },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });

  if (rows.length === 0) {
    console.log("No services in the database — has it been seeded?");
    return 0;
  }

  const mismatches: string[] = [];
  const databaseOnly: string[] = [];
  const priceListOnly: string[] = [];
  let compared = 0;

  for (const service of rows) {
    if (!services.some((row) => row.slug === service.slug)) continue;

    const rates = advertised(service.slug);
    const seen = new Set<string>();

    for (const variant of service.variants) {
      const id = key(variant.tier, variant.durationMinutes);
      seen.add(id);

      const advertisedAmount = rates.get(id);
      if (advertisedAmount === undefined) {
        databaseOnly.push(
          `${service.slug} · ${describe(variant.tier, variant.durationMinutes)}` +
            ` — ${formatIdr(variant.priceIdr)}, not on the price list`,
        );
        continue;
      }

      compared += 1;
      if (variant.priceIdr !== advertisedAmount) {
        mismatches.push(
          `${service.slug} · ${describe(variant.tier, variant.durationMinutes)}` +
            ` — booking ${formatIdr(variant.priceIdr)},` +
            ` site ${formatIdr(advertisedAmount)}`,
        );
      }
    }

    /* The reverse gap matters too: a rate the site advertises with no variant
       behind it is a price a visitor cannot book. */
    for (const [id, amount] of rates) {
      if (seen.has(id)) continue;
      const [tier, minutes] = id.split(":");
      priceListOnly.push(
        `${service.slug} · ${describe(tier as Tier, Number(minutes))}` +
          ` — ${formatIdr(amount)}, not bookable`,
      );
    }
  }

  const missingFromDatabase = services
    .filter(
      (service) =>
        service.tiers.length > 0 &&
        !rows.some((row) => row.slug === service.slug),
    )
    .map((service) => service.slug);

  console.log(
    `Compared ${compared} priced variant${compared === 1 ? "" : "s"} against ` +
      `lib/data/services.ts.`,
  );

  report("Price differences", mismatches);
  report("Booking only (verify against the official price list)", databaseOnly);
  report("Advertised but not bookable", priceListOnly);
  report("Priced services with no row in the database", missingFromDatabase);

  if (mismatches.length) {
    console.error(
      `\n${mismatches.length} price${mismatches.length === 1 ? "" : "s"} ` +
        `disagree. Fix the catalogue or the service data before deploying.`,
    );
    return 1;
  }

  console.log("\nEvery shared price agrees.");
  return 0;
}

function report(title: string, lines: string[]): void {
  if (!lines.length) return;
  console.log(`\n${title}:`);
  for (const line of lines) console.log(`  - ${line}`);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
