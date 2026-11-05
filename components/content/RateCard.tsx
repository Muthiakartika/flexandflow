"use client";

import { useState } from "react";

import { FOCUS } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/pricing";
import { contact, homeServiceFeeIdr, shortHours, studioMapsUrl } from "@/lib/site";
import type { Rate } from "./ServiceHero";

/**
 * The hero's rate card: one price per tier, with a studio / villa switch
 * above them for treatments a therapist brings home. Two prices on every
 * row was a lot to read on a phone; now the card answers one question at a
 * time, and the villa side says what the difference is (the home service
 * fee). Studio-only treatments get no switch.
 *
 * The rows come in the order `ServiceArticle` sorts them: the team first,
 * Ginny's limited sessions after (DESIGN.md, copy rule).
 */
export default function RateCard({ rates, minutes }: { rates: Rate[]; minutes: number | null }) {
  const villaOffered = rates.some((rate) => rate.villa !== null);
  const [atVilla, setAtVilla] = useState(false);
  const villa = villaOffered && atVilla;

  const tab = (active: boolean) =>
    `rounded-full px-3 py-2 font-body text-[13px] leading-none transition-colors duration-300 ${FOCUS} ${
      active
        ? "bg-white font-bold text-body-text ring-1 ring-secondary/10"
        : "text-body-text/60 hover:text-body-text"
    }`;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[26px] leading-none font-bold">Rates</h2>
        {minutes ? <span className="page-label tabular-nums">{minutes} min</span> : null}
      </div>

      {villaOffered ? (
        <div role="group" aria-label="Where the session is" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-cream p-1">
          <button type="button" aria-pressed={!villa} onClick={() => setAtVilla(false)} className={tab(!villa)}>
            At the studio
          </button>
          <button type="button" aria-pressed={villa} onClick={() => setAtVilla(true)} className={tab(villa)}>
            At your villa
          </button>
        </div>
      ) : null}

      <dl className="mt-2" aria-live="polite">
        {rates.map((rate) => (
          <div
            key={rate.label}
            className="flex items-center justify-between gap-4 border-b border-secondary/10 py-3 last:border-b-0"
          >
            <dt>
              <span className="page-label block">{rate.label}</span>
              <span className="mt-1 block font-body text-[12px] leading-none text-body-text/60">
                {rate.minutes ? `${rate.minutes} min · ` : ""}
                {rate.note}
              </span>
            </dt>
            <dd className="font-body text-[17px] leading-none font-bold whitespace-nowrap tabular-nums">
              {formatIdr(villa && rate.villa !== null ? rate.villa : rate.amount)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-1 font-body text-[12px] leading-[1.4] text-body-text/60">
        {!villaOffered
          ? "Studio only."
          : villa
            ? `Includes the ${formatIdr(homeServiceFeeIdr)} home service fee. Uluwatu area.`
            : "At the studio in Ungasan."}
      </p>

      {/* When and where, beside the prices: the moment someone decides to
          book is the moment they ask both. Same address as the header, the
          footer and the LocalBusiness JSON-LD. */}
      <p className="mt-3 flex flex-col gap-1 border-t border-secondary/10 pt-3 font-body text-[12px] leading-[1.4] text-body-text/60">
        <span className="tabular-nums">Open {shortHours}</span>
        <a
          href={studioMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`self-start transition-colors duration-300 hover:text-primary ${FOCUS}`}
        >
          {contact.shortAddress} &rarr;
        </a>
      </p>
    </>
  );
}
