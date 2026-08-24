import Image from "next/image";
import Link from "next/link";

import { PendingLink } from "@/components/ui/PendingLink";
import { CARD, FOCUS } from "@/components/ui/tokens";
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

      {/* Two real controls rather than two lines of text. Both were links
          before — a bold one and an underlined one, sitting side by side with
          nothing to say which was the action and which was the detour. The
          booking gets the filled surface, the profile an outline, at one step
          down from the page's own buttons so a card does not outshout the
          section it sits in.

          The booking control opens the wizard with this therapist already
          chosen, so the visitor lands on the treatment rather than on a
          question their click answered. It used to open WhatsApp, which is why
          it is a `Link` and no longer a new tab.

          Both are `PendingLink`s, which put a dot beside the label while the
          navigation runs. Booking is the one that needs it: `/booking/` is
          server-rendered per request and, when the URL names a therapist, it
          queries the team before it answers at all. Until the dot existed the
          card sat there unchanged for that whole pause, which reads as a
          button that did not take the click. The profile link is prerendered
          and usually prefetched, so its dot simply never gets the chance to
          appear — `useLinkStatus` skips the pending phase entirely when the
          destination is already in hand. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <PendingLink
          href={bookingUrlFor(therapist.slug)}
          className={`inline-flex items-center justify-center rounded-[10px] bg-primary-strong px-4 py-2.5 font-body text-[13px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
        >
          Book with {therapist.name}
        </PendingLink>
        <PendingLink
          href={`/therapist/${therapist.slug}`}
          className={`group/link inline-flex items-center gap-1.5 rounded-[10px] border border-secondary/20 px-4 py-2.5 font-body text-[13px] leading-none transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`}
        >
          Full profile
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover/link:translate-x-0.5"
          >
            &rarr;
          </span>
        </PendingLink>
      </div>
    </article>
  );
}
