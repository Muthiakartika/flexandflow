"use client";

import Image from "next/image";

import { FOCUS, FOCUS_ON_OLIVE } from "@/components/ui/tokens";
import { formatDurationShort, formatIdr } from "@/lib/booking/format";
import {
  resolveVariant,
  type CategoryOption,
  type PreselectedService,
  type StaffOption,
  type TreatmentOption,
} from "@/lib/booking/types";

import { ALL_CATEGORIES } from "./state";

/**
 * Step 1 — which treatment, at which length.
 *
 * It comes before the therapist, so a card usually cannot name one price: the
 * same 60 minutes costs more with the Master therapist than with a Therapist.
 * The card shows the range, and the staff step that follows prices each
 * person exactly. When a "Book with Ginny" link has already chosen the
 * therapist, the list is narrowed to what she gives, at her price.
 *
 * The chips filter; they do not choose. Every figure is printed as the API
 * sent it — see `CLAUDE.md`, "Data hazards", for why nothing here does sums.
 */
export default function ServiceStep({
  treatments,
  categories,
  category,
  service = null,
  lockedStaff = null,
  treatmentKey,
  loading,
  error,
  onCategory,
  onShowAll,
  onChoose,
}: {
  treatments: TreatmentOption[] | null;
  categories: CategoryOption[];
  category: string;
  /** The treatment a "Book" link named: only its lengths are shown. */
  service?: PreselectedService | null;
  /** The therapist a "Book with …" link chose: only what they give is shown. */
  lockedStaff?: StaffOption | null;
  treatmentKey: string | null;
  loading: boolean;
  error: string | null;
  onCategory: (category: string) => void;
  /** Lifts whichever link filter is on: the treatment, or the therapist. */
  onShowAll: () => void;
  onChoose: (treatment: TreatmentOption) => void;
}) {
  if (error) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/75">
        {error}
      </p>
    );
  }

  if (loading || !treatments) {
    return (
      <p className="font-body text-[15px] text-body-text/60">
        Loading treatments…
      </p>
    );
  }

  const shown = treatments.filter((treatment) => {
    if (service && treatment.serviceSlug !== service.slug) return false;
    if (lockedStaff && !resolveVariant(treatment, lockedStaff.id)) return false;
    if (!service && category !== ALL_CATEGORIES) {
      return treatment.categoryId === category;
    }
    return true;
  });

  const filterLabel = service
    ? service.title
    : lockedStaff
      ? `With ${lockedStaff.name}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      {filterLabel ? (
        <div className="booking-chips" role="group" aria-label="Treatment filter">
          <Chip active label={filterLabel} onClick={() => {}} />
          <Chip active={false} label="Show all treatments" onClick={onShowAll} />
        </div>
      ) : (
        <div className="booking-chips" role="group" aria-label="Filter by category">
          <Chip
            active={category === ALL_CATEGORIES}
            label="All"
            onClick={() => onCategory(ALL_CATEGORIES)}
          />
          {categories.map((option) => (
            <Chip
              key={option.id}
              active={category === option.id}
              label={option.name}
              onClick={() => onCategory(option.id)}
            />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="font-body text-[15px] text-body-text/70">
          Nothing to show here. Try &ldquo;Show all treatments&rdquo;.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Treatment"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((treatment) => {
            const selected = treatment.key === treatmentKey;
            return (
              <button
                key={treatment.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChoose(treatment)}
                data-selected={selected ? "true" : "false"}
                data-layout="row"
                className={`booking-choice ${selected ? FOCUS_ON_OLIVE : FOCUS}`}
              >
                <span className="booking-choice-media">
                  {treatment.serviceImage ? (
                    <Image
                      src={treatment.serviceImage}
                      alt=""
                      width={480}
                      height={300}
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>

                <span className="booking-choice-body block p-5 text-left">
                  <span className="booking-choice-title block font-display text-[26px] leading-[1.1] font-bold">
                    {treatment.serviceTitle}
                  </span>
                  <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="booking-choice-meta font-body text-[13px] leading-none tabular-nums">
                      {formatDurationShort(treatment.durationMinutes)}
                    </span>
                    <span className="font-body text-[15px] leading-none font-bold tabular-nums">
                      {priceLabel(treatment, lockedStaff)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** One price when it is settled, otherwise the range across tiers. */
function priceLabel(
  treatment: TreatmentOption,
  lockedStaff: StaffOption | null,
): string {
  if (lockedStaff) {
    const variant = resolveVariant(treatment, lockedStaff.id);
    if (variant) return formatIdr(variant.priceIdr);
  }
  const prices = treatment.variants.map((variant) => variant.priceIdr);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? formatIdr(low) : `${formatIdr(low)} – ${formatIdr(high)}`;
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      className={`booking-chip ${active ? FOCUS_ON_OLIVE : FOCUS}`}
    >
      {label}
    </button>
  );
}
