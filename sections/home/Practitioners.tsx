import Link from "next/link";

import TherapistCard from "@/components/cards/TherapistCard";
import { BAND, H2, LINK, WRAP } from "@/components/ui/tokens";
import { therapists } from "@/lib/data/therapists";

/**
 * "Meet My Team" — the studio's own heading, borrowed from the About page,
 * which runs the same cards under the same words.
 */
export default function Practitioners() {
  return (
    <section className="page-band-line">
      <div className={`${WRAP} ${BAND}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="page-label">Our Team</p>
            <h2 className={`mt-2 ${H2}`}>Meet My Team</h2>
          </div>
          <Link href="/about-us" className={LINK}>
            About the studio
          </Link>
        </div>

        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {therapists.map((therapist) => (
            <li key={therapist.slug}>
              <TherapistCard therapist={therapist} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
