import Image from "next/image";
import Link from "next/link";

import { therapists } from "@/lib/data/therapists";
import { formatIdr } from "@/lib/pricing";
import { siteConfig } from "@/lib/site";

const ginny = therapists.find((t) => t.slug === "ginny");

/**
 * Who treats you, at the top of a pilot treatment page's price section
 * (`ServiceArticle` places it under the price heading): the team and Ginny
 * as two cards, each with its starting price.
 *
 * The order and the weight are deliberate. Ginny is the name the studio is
 * known by, but she cannot take every booking, which is why her sessions
 * cost more; so the team comes first, outlined in olive and marked the
 * easiest to book, and Ginny is the limited step up (DESIGN.md, copy rule).
 * Each card's round avatar overlaps its top edge, the system's depth.
 */
export default function TierChooser({
  team,
  master,
  minutes,
  homeService,
}: {
  /** The lowest price with one of the team, and with Ginny. */
  team: number;
  master: number;
  minutes: number | null;
  homeService: boolean;
}) {
  const where = homeService ? "studio or villa" : "at the studio";
  const meta = minutes ? `${minutes} min · ${where}` : where;

  return (
    <div className="tier-chooser">
      <section className="tier-card tier-card-team">
        <span className="tier-avatar">
          <Image src={siteConfig.logo} alt="" width={112} height={112} sizes="56px" />
        </span>
        <p className="tier-pill">Easiest to book</p>
        <h3>Our therapists</h3>
        <p className="tier-role">The Flex &amp; Flow team</p>
        <p className="tier-from">
          <span>From</span>
          {formatIdr(team)}
        </p>
        <p className="tier-meta">{meta}</p>
        <p className="tier-copy">
          The most open slots, and the same listen-first approach the studio was built on.
        </p>
      </section>

      <section className="tier-card">
        {ginny ? (
          <span className="tier-avatar">
            <Image
              src={ginny.portrait}
              alt=""
              width={320}
              height={400}
              sizes="56px"
              className="tier-avatar-face"
            />
          </span>
        ) : null}
        <p className="tier-pill tier-pill-quiet">Limited sessions</p>
        <h3>Ginny</h3>
        <p className="tier-role">Founder · master therapist</p>
        <p className="tier-from">
          <span>From</span>
          {formatIdr(master)}
        </p>
        <p className="tier-meta">{meta}</p>
        <p className="tier-copy">
          A background in nursing and professional fitness training. Her diary fills first, so
          book well ahead.{" "}
          <Link href="/therapist/ginny">Meet Ginny &rarr;</Link>
        </p>
      </section>
    </div>
  );
}
