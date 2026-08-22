import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS, LINK } from "@/components/ui/tokens";
import { bookingUrlFor } from "@/lib/site";
import type { Therapist } from "@/lib/data/therapists";

/**
 * Practitioner card, shared by the home page and the About page's team grid.
 *
 * Sessions are priced by who performs them, so the practitioner is a real
 * decision and not a footnote: the card carries the portrait, the specialisms
 * verbatim from the profile data, and a booking link that has already made the
 * choice. That link used to open WhatsApp, because there was nowhere on this
 * site to send anyone; it now goes into the wizard with this therapist
 * selected, so the visitor lands on the treatment rather than on a question
 * they answered by clicking.
 */
export default function TherapistCard({ therapist }: { therapist: Therapist }) {
  return (
    <article className={`flex h-full flex-col ${CARD} p-4`}>
      <div className="flex items-center gap-4">
        <Image
          src={therapist.portrait}
          alt={therapist.name}
          width={300}
          height={300}
          sizes="96px"
          className="h-24 w-24 shrink-0 rounded-[10px] object-cover object-top"
        />
        <div className="min-w-0">
          <h3 className="font-display text-[26px] leading-none font-bold">
            <Link
              href={`/therapist/${therapist.slug}`}
              className={`transition-colors duration-300 hover:text-primary ${FOCUS}`}
            >
              {therapist.name}
            </Link>
          </h3>
          <p className="mt-2 font-body text-[13px] leading-snug text-body-text/65">
            {therapist.role}
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {therapist.specializedIn.split("•").map((skill) => (
          <li
            key={skill}
            className="rounded-full border border-secondary/12 px-2.5 py-1 font-body text-[12px] leading-none text-body-text/75"
          >
            {skill.trim()}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
        <Link
          href={bookingUrlFor(therapist.slug)}
          className={`font-body text-[14px] leading-none font-bold transition-colors duration-300 hover:text-primary ${FOCUS}`}
        >
          Book with {therapist.name}
        </Link>
        <Link href={`/therapist/${therapist.slug}`} className={LINK}>
          Full profile
        </Link>
      </div>
    </article>
  );
}
