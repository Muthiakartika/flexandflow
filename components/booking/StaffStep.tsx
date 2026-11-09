"use client";

import Image from "next/image";

import { FOCUS, FOCUS_ON_OLIVE } from "@/components/ui/tokens";
import { formatDurationShort, formatIdr } from "@/lib/booking/format";
import {
  TIER_LABEL,
  TIER_NOTE,
  resolveVariant,
  treatmentTherapists,
  type StaffOption,
  type StaffSelection,
  type TreatmentOption,
} from "@/lib/booking/types";

/**
 * Step 2 — who gives the treatment chosen in step 1.
 *
 * Only the therapists who give that treatment at that length are offered, and
 * each card carries their own price for it, because the price follows the
 * therapist's tier. There is no "Any Staff" card (removed 2026-11-09, owner's
 * request): the visitor always chooses a person. `ANY_STAFF` still exists in
 * the API for older links and drafts, but nothing here offers it.
 *
 * The cards are `<button>`s in a radio group rather than clickable divs: the
 * choice is a choice, and a screen reader should hear it as one. Every option
 * stays in the tab order — with three of them a roving tabindex buys nothing
 * and costs a visitor the ability to reach the third with Tab.
 */
export default function StaffStep({
  staff,
  treatment,
  options: everyone,
  loading,
  error,
  onChoose,
}: {
  staff: StaffSelection | null;
  /** Step one's answer. The step cannot be reached without it. */
  treatment: TreatmentOption | null;
  options: StaffOption[];
  loading: boolean;
  error: string | null;
  onChoose: (staff: StaffSelection, option: StaffOption | null) => void;
}) {
  if (error) {
    return (
      <p className="font-body text-[15px] leading-[1.7] text-body-text/75">
        {error}
      </p>
    );
  }

  if (loading) {
    return (
      <p className="font-body text-[15px] text-body-text/60">
        Loading the team…
      </p>
    );
  }

  const givers = treatment ? treatmentTherapists(treatment) : [];
  const options = everyone.filter((option) => givers.includes(option.id));
  const priceFor = (selection: StaffSelection) => {
    const variant = treatment ? resolveVariant(treatment, selection) : null;
    return variant ? formatIdr(variant.priceIdr) : "";
  };

  return (
    <div className="flex flex-col gap-5">
      {treatment ? (
        <p className="font-body text-[15px] leading-[1.6] text-body-text/75">
          Booking{" "}
          <strong className="text-body-text">
            {treatment.serviceTitle} · {formatDurationShort(treatment.durationMinutes)}
          </strong>
          . Choose who you would like it with.
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Staff"
        className="booking-staff-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {options.map((option) => (
          <StaffCard
            key={option.id}
            selected={staff === option.id}
            title={option.displayName}
            subtitle={TIER_LABEL[option.tier]}
            note={TIER_NOTE[option.tier]}
            price={priceFor(option.id)}
            photo={option.photo}
            onSelect={() => onChoose(option.id, option)}
          />
        ))}
      </div>
    </div>
  );
}

function StaffCard({
  selected,
  title,
  subtitle,
  note,
  price,
  photo,
  onSelect,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  note: string;
  price: string;
  photo: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`booking-choice ${selected ? FOCUS_ON_OLIVE : FOCUS}`}
      data-selected={selected ? "true" : "false"}
    >
      <span className="booking-choice-media" data-shape="portrait">
        {photo ? (
          <Image
            src={photo}
            alt=""
            width={320}
            height={320}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center font-display text-[40px] leading-none"
          >
            {title.charAt(0)}
          </span>
        )}
      </span>

      <span className="booking-choice-body block p-5 text-left">
        <span className="booking-choice-title block font-display text-[26px] leading-[1.1] font-bold">
          {title}
        </span>
        <span className="booking-choice-meta mt-2 block font-body text-[13px] leading-[1.5]">
          {subtitle}
          <span className="block">{note}</span>
        </span>
        {price ? (
          <span className="mt-3 block font-body text-[15px] leading-none font-bold tabular-nums">
            {price}
          </span>
        ) : null}
      </span>
    </button>
  );
}
