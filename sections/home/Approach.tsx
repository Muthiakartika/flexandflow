import Image from "next/image";

import CardSlider from "@/components/content/CardSlider";
import { BAND_LINE, H2, WRAP } from "@/components/ui/tokens";

/* Each step is the studio's own way of working, as Ginny's profile, the old
   home FAQ and the sport massage page put it: a consultation first, the
   session guided by what she observes and what you tell her, and something
   to take home so the work holds. */
const steps = [
  {
    title: "Listen First",
    points: [
      "A short conversation before anything starts: what you have been doing, where you feel it, what you want from the hour.",
      "Every session opens this way, the first or the tenth.",
    ],
  },
  {
    title: "Work Where It’s Needed",
    points: [
      "Deeper massage where a muscle needs it, assisted stretching and mobility work where a joint has stiffened up.",
      "The focus and the pressure change as your body responds.",
    ],
  },
  {
    title: "Make It Hold",
    points: [
      "A tight area is released, then taken through its range, so you leave moving better rather than only feeling looser.",
      "Simple things to do on your own until the next session.",
    ],
  },
];

/**
 * What an hour actually involves, in place of the two bands that used to say
 * it twice ("One on One Private Therapy" and "What We Do"). The steps are the
 * treatment pages' numbered `CardSlider` (its styles live under `.prose-flex`,
 * hence the wrapper): a deck to swipe on a phone, three side by side from
 * 1200px. The two photos overlap, the system's depth.
 */
export default function Approach() {
  return (
    <section className={BAND_LINE} aria-labelledby="home-approach">
      <div className={`${WRAP} home-band home-split home-split-media-first`}>
        <div className="home-photo-stack">
          <Image
            src="/images/2026/08/private-therapy.jpg"
            alt="A one-to-one session in progress at the studio"
            width={2400}
            height={1920}
            sizes="(max-width: 1023px) 92vw, 40vw"
            className="aspect-[5/4] w-full rounded-[10px] object-cover"
          />
          <Image
            src="/images/2026/08/private-therapy-inset.jpg"
            alt=""
            aria-hidden
            width={800}
            height={1000}
            sizes="160px"
            className="home-photo-inset"
          />
        </div>

        <div className="min-w-0">
          <p className="page-label">How a session runs</p>
          <h2 id="home-approach" className={`mt-2 ${H2}`}>
            One Therapist, Start to Finish
          </h2>
          <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.7] text-body-text/80">
            No hand-offs and no set routine. The hour is built around what you
            tell us and what your body shows, the way Ginny built the studio.
          </p>

          <div className="prose-flex home-steps">
            <CardSlider label="How a session runs" slides={steps} />
          </div>
        </div>
      </div>
    </section>
  );
}
