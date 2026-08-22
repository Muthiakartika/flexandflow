"use client";

import Image from "next/image";

import { FOCUS, FOCUS_ON_OLIVE } from "@/components/ui/tokens";
import { formatDurationShort, formatIdr } from "@/lib/booking/format";
import type { ServiceCatalogue, VariantOption } from "@/lib/booking/types";

import { ALL_CATEGORIES } from "./state";

/**
 * Step 2 — which treatment, at which length.
 *
 * The chips filter; they do not choose. A visitor who knows they want a
 * lymphatic session narrows to it, and a visitor who does not scrolls the lot.
 *
 * Every figure on the card is printed exactly as the API sent it. The
 * marketing pages derive their prices through `lib/pricing.ts` from data that
 * is not uniform, and doing arithmetic here as well is how the wizard and the
 * price list end up disagreeing — see `CLAUDE.md`, "Data hazards".
 */
export default function ServiceStep({
  catalogue,
  category,
  variantId,
  loading,
  error,
  onCategory,
  onChoose,
}: {
  catalogue: ServiceCatalogue | null;
  category: string;
  variantId: string | null;
  loading: boolean;
  error: string | null;
  onCategory: (category: string) => void;
  onChoose: (variant: VariantOption) => void;
}) {
  if (error) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/75">
        {error}
      </p>
    );
  }

  if (loading || !catalogue) {
    return (
      <p className="font-body text-[15px] text-body-text/60">
        Loading treatments…
      </p>
    );
  }

  const variants =
    category === ALL_CATEGORIES
      ? catalogue.variants
      : catalogue.variants.filter((variant) => variant.categoryId === category);

  return (
    <div className="flex flex-col gap-6">
      <div className="booking-chips" role="group" aria-label="Filter by category">
        <Chip
          active={category === ALL_CATEGORIES}
          label="All"
          onClick={() => onCategory(ALL_CATEGORIES)}
        />
        {catalogue.categories.map((option) => (
          <Chip
            key={option.id}
            active={category === option.id}
            label={option.name}
            onClick={() => onCategory(option.id)}
          />
        ))}
      </div>

      {variants.length === 0 ? (
        <p className="font-body text-[15px] text-body-text/70">
          Nothing in this category for the staff you chose.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Treatment"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {variants.map((variant) => {
            const selected = variant.id === variantId;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChoose(variant)}
                data-selected={selected ? "true" : "false"}
                className={`booking-choice ${selected ? FOCUS_ON_OLIVE : FOCUS}`}
              >
                <span className="booking-choice-media">
                  {variant.serviceImage ? (
                    <Image
                      src={variant.serviceImage}
                      alt=""
                      width={480}
                      height={300}
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>

                <span className="block p-5 text-left">
                  <span className="block font-display text-[26px] leading-[1.1] font-bold">
                    {variant.serviceTitle}
                  </span>
                  <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="booking-choice-meta font-body text-[13px] leading-none tabular-nums">
                      {formatDurationShort(variant.durationMinutes)}
                    </span>
                    <span className="font-body text-[15px] leading-none font-bold tabular-nums">
                      {formatIdr(variant.priceIdr)}
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
