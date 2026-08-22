/**
 * Reads the booking catalogue out of the database.
 *
 * The catalogue lives in Postgres rather than in `lib/data/services.ts`
 * because the two are not the same list — the old booking flow sold
 * 90-minute variants the price list has never carried (BOOKING-PLAN.md §2.1).
 * This module is the only place the wizard, the API routes and the admin
 * panel learn what is bookable, so a price shown to a customer always comes
 * from the row that will be charged.
 *
 * Nothing here trusts the tier as a separate choice: the tier belongs to the
 * therapist (§2.2), so picking staff is what narrows the price list.
 */
import "server-only";

import {
  ANY_STAFF,
  type CategoryOption,
  type ServiceCatalogue,
  type StaffOption,
  type StaffSelection,
  type Tier,
  type VariantOption,
} from "@/lib/booking/types";
import { prisma } from "@/lib/db";

/**
 * Structural shapes rather than the generated payload types: they say exactly
 * which columns the mapping depends on, and the Prisma rows satisfy them by
 * having more.
 */
type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  bufferMinutes: number;
  categoryId: string | null;
  category: CategoryRow | null;
};

type VariantRow = {
  id: string;
  tier: Tier;
  durationMinutes: number;
  priceIdr: number;
};

type TherapistLinkRow = {
  therapist: { id: string; tier: Tier; active: boolean };
};

export async function listStaff(): Promise<StaffOption[]> {
  const rows = await prisma.therapist.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayName: row.displayName,
    tier: row.tier,
    photo: row.photo,
    email: row.email,
  }));
}

export async function listCatalogue(
  staff: StaffSelection,
): Promise<ServiceCatalogue> {
  const services = await prisma.service.findMany({
    where: {
      active: true,
      variants: { some: { active: true } },
      therapists: {
        some:
          staff === ANY_STAFF
            ? { therapist: { active: true } }
            : { therapistId: staff, therapist: { active: true } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      category: true,
      variants: { where: { active: true } },
      therapists: { include: { therapist: true } },
    },
  });

  const variants = services.flatMap((service) =>
    variantsFor(service, service.variants, service.therapists, staff),
  );

  return { categories: categoriesOf(variants, services), variants };
}

export async function getVariant(
  variantId: string,
): Promise<VariantOption | null> {
  const variant = await prisma.serviceVariant.findUnique({
    where: { id: variantId },
    include: {
      service: {
        include: {
          category: true,
          therapists: { include: { therapist: true } },
        },
      },
    },
  });

  if (!variant) return null;

  /* Retired variants still resolve. A booking made last month has to render
     on the confirmation and manage pages after the owner has pulled its price
     from the catalogue. What tells a caller whether it is still sellable is
     `therapistIds` — active therapists only — not the lookup succeeding. */
  return toOption(
    variant.service,
    variant,
    deliverers(variant.service.therapists, variant.tier, ANY_STAFF),
  );
}

/**
 * The therapists who can actually give this variant: active, linked to the
 * service, and on the variant's own tier. A MASTER price is not something a
 * STANDARD therapist can honour, so listing them here would let the slot step
 * offer an appointment nobody can keep.
 */
function deliverers(
  links: TherapistLinkRow[],
  tier: Tier,
  staff: StaffSelection,
): string[] {
  return links
    .filter(
      (link) =>
        link.therapist.active &&
        link.therapist.tier === tier &&
        (staff === ANY_STAFF || link.therapist.id === staff),
    )
    .map((link) => link.therapist.id);
}

function variantsFor(
  service: ServiceRow,
  rows: VariantRow[],
  links: TherapistLinkRow[],
  staff: StaffSelection,
): VariantOption[] {
  const options = rows.flatMap((row) => {
    const therapistIds = deliverers(links, row.tier, staff);
    /* Drops rows nobody on shift can deliver — with a specific therapist
       chosen this is what filters the list to their tier, and under "Any
       Staff" it keeps an unstaffed tier from setting the headline price. */
    return therapistIds.length ? [toOption(service, row, therapistIds)] : [];
  });

  return cheapestPerDuration(options).sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  );
}

/**
 * One line per session length. Under "Any Staff" a 60-minute massage exists at
 * both tiers and the wizard shows the lower figure — the same promise the old
 * flow made, and the therapist is assigned at submit. With a therapist already
 * chosen there is only ever one row per length, so this is a no-op.
 */
function cheapestPerDuration(options: VariantOption[]): VariantOption[] {
  const byDuration = new Map<number, VariantOption>();

  for (const option of options) {
    const held = byDuration.get(option.durationMinutes);
    /* Ties resolve on tier so a reseed cannot silently reorder the wizard. */
    const better =
      !held ||
      option.priceIdr < held.priceIdr ||
      (option.priceIdr === held.priceIdr && option.tier < held.tier);

    if (better) byDuration.set(option.durationMinutes, option);
  }

  return [...byDuration.values()];
}

/**
 * Only the categories something in this catalogue belongs to. The chip row is
 * a filter, and a chip that filters to an empty grid reads as a broken page.
 */
function categoriesOf(
  variants: VariantOption[],
  services: ServiceRow[],
): CategoryOption[] {
  const used = new Set(
    variants.flatMap((variant) =>
      variant.categoryId === null ? [] : [variant.categoryId],
    ),
  );

  const seen = new Map<string, CategoryRow>();
  for (const service of services) {
    if (!service.category || !used.has(service.category.id)) continue;
    seen.set(service.category.id, service.category);
  }

  /* Chip order is the owner's, set on the category, not an accident of which
     service happens to sort first. */
  return [...seen.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(({ id, slug, name }) => ({ id, slug, name }));
}

function toOption(
  service: ServiceRow,
  variant: VariantRow,
  therapistIds: string[],
): VariantOption {
  return {
    id: variant.id,
    serviceId: service.id,
    serviceSlug: service.slug,
    serviceTitle: service.title,
    serviceImage: service.image,
    categoryId: service.categoryId,
    categorySlug: service.category?.slug ?? null,
    tier: variant.tier,
    durationMinutes: variant.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    priceIdr: variant.priceIdr,
    therapistIds,
  };
}
