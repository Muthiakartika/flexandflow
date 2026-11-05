import Image from "next/image";
import Link from "next/link";

import { therapists } from "@/lib/data/therapists";

/**
 * The studio's practitioners, under the photo in the right margin beside a
 * pilot article: a round portrait, the name, the role as their own profile
 * page states it, and a link to that page. Facts only, so it never puts
 * anyone on a treatment they do not do.
 */
export default function RailTeam() {
  return (
    <nav className="rail-team" aria-label="The team">
      <p className="page-label">The team</p>
      <ul>
        {therapists.map((person) => (
          <li key={person.slug}>
            <Link href={`/therapist/${person.slug}`} className="group">
              <span className="rail-team-face">
                <Image src={person.portrait} alt="" width={160} height={200} sizes="44px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="rail-team-name">{person.name}</span>
                <span className="rail-team-role">{person.teamRole}</span>
              </span>
              <span aria-hidden className="rail-team-arrow">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
