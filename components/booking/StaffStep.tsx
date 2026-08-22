"use client";

import Image from "next/image";

import { FOCUS, FOCUS_ON_OLIVE } from "@/components/ui/tokens";
import {
  ANY_STAFF,
  TIER_LABEL,
  TIER_NOTE,
  type StaffOption,
  type StaffSelection,
} from "@/lib/booking/types";

/**
 * Step 1 — who the session is with.
 *
 * "Any Staff" leads, because it is the answer for a visitor who has no opinion
 * and it is the one that leaves the most times open. The two therapists follow
 * in the order the API returns them.
 *
 * The cards are `<button>`s in a radio group rather than clickable divs: the
 * choice is a choice, and a screen reader should hear it as one. Every option
 * stays in the tab order — with three of them a roving tabindex buys nothing
 * and costs a visitor the ability to reach the third with Tab.
 */
export default function StaffStep({
  staff,
  options,
  loading,
  error,
  onChoose,
}: {
  staff: StaffSelection | null;
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

  return (
    <div
      role="radiogroup"
      aria-label="Staff"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <StaffCard
        selected={staff === ANY_STAFF}
        title="Any Staff"
        subtitle="First available"
        note="Whoever is free at the time you choose"
        photo={null}
        onSelect={() => onChoose(ANY_STAFF, null)}
      />

      {options.map((option) => (
        <StaffCard
          key={option.id}
          selected={staff === option.id}
          title={option.displayName}
          subtitle={TIER_LABEL[option.tier]}
          note={TIER_NOTE[option.tier]}
          photo={option.photo}
          onSelect={() => onChoose(option.id, option)}
        />
      ))}
    </div>
  );
}

function StaffCard({
  selected,
  title,
  subtitle,
  note,
  photo,
  onSelect,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  note: string;
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
            Any
          </span>
        )}
      </span>

      <span className="block p-5 text-left">
        <span className="block font-display text-[26px] leading-[1.1] font-bold">
          {title}
        </span>
        <span className="booking-choice-meta mt-2 block font-body text-[13px] leading-[1.5]">
          {subtitle}
          <span className="block">{note}</span>
        </span>
      </span>
    </button>
  );
}
