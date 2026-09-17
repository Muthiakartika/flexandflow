import type { Metadata } from "next";
import Image from "next/image";

import TherapistCard from "@/components/cards/TherapistCard";
import PageHero from "@/components/ui/PageHero";
import { BAND, CARD, H2, WRAP } from "@/components/ui/tokens";
import { therapists } from "@/lib/data/therapists";
import { contact, workingHours } from "@/lib/site";
import BookClose from "@/sections/common/BookClose";
import PrivateTherapy from "@/sections/home/PrivateTherapy";

const description =
  "Learn more about our mission, values, and the team dedicated to helping you achieve your wellness and flexibility goals. We’re here for you.";

export const metadata: Metadata = {
  title: "About us - Flex and Flow",
  description,
  alternates: { canonical: "/about-us/" },
  openGraph: {
    title: "About us - Flex and Flow",
    description,
    url: "/about-us/",
    type: "article",
  },
};

/* Where the studio is and when it is open — the two questions the About page
   was silently sending people to the footer for. */
const facts = [
  { term: "Studio", detail: contact.address },
  {
    term: "Hours",
    detail: workingHours.map((slot) => `${slot.days} · ${slot.hours}`).join(" "),
  },
  { term: "Practitioners", detail: `${therapists.length}, one to one` },
];

export default function AboutPage() {
  return (
    <>
      <PageHero title="About us" crumbs={[{ label: "About us" }]} />

      {/* ── Specializing in ─────────────────────────────────────────────── */}
      <section className="page-band-line">
        <div className={`${WRAP} ${BAND}`}>
          <div className="grid items-center gap-[clamp(2rem,3.6vw,3.5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div>
              <p className="page-label">Specializing in</p>
              <h2 className={`mt-2 ${H2}`}>
                Personalised Bodywork &amp; Movement
              </h2>
              <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.7] text-body-text/80">
                Founded by Ginny, Flex&amp;Flow is a boutique bodywork and
                movement studio in Uluwatu, Bali, focused on personalised
                assisted stretching, therapeutic massage, and recovery work.
              </p>

              <dl className="mt-7 grid gap-px overflow-hidden rounded-[10px] border border-secondary/10 bg-secondary/10">
                {facts.map((fact) => (
                  <div key={fact.term} className="bg-white px-4 py-3.5">
                    <dt className="page-label">{fact.term}</dt>
                    <dd className="mt-1.5 font-body text-[15px] leading-[1.5]">
                      {fact.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <Image
              src="/images/2026/08/about-studio.jpg"
              alt="The Flex &amp; Flow studio in Uluwatu"
              width={2400}
              height={1920}
              sizes="(max-width: 1023px) 92vw, 42vw"
              className="aspect-[5/4] w-full rounded-[10px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* The About page shares the home page's therapy section but overrides
          its eyebrow and its body copy. The override is a prop rather than an
          edit to the component: the brief pins the *home page's* wording as
          verbatim, so the two have to be able to differ. */}
      <PrivateTherapy
        eyebrow="Solution For Body Needs"
        body="We take time to understand how your body feels and moves before we begin. Each session is adjusted based on what needs attention, with the approach shaped around your individual condition."
      />

      {/* ── Meet the Team ───────────────────────────────────────────────
          "Meet the Team" here, "Meet My Team" on the home page: the two bands
          are deliberately no longer the same words. */}
      <section className="page-band-line">
        <div className={`${WRAP} ${BAND}`}>
          <p className="page-label">Our Team</p>
          <h2 className={`mt-2 ${H2}`}>Meet the Team</h2>
          <p className="mt-3 max-w-[58ch] font-body text-[15px] leading-[1.7] text-body-text/80">
            Our team of professionals each brings their own expertise, with the
            same focus on listening, understanding your needs, and giving close
            attention to every session.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {therapists.map((therapist) => (
              <li key={therapist.slug}>
                <TherapistCard therapist={therapist} />
              </li>
            ))}
          </ul>

          {/* The scene photographs, which the old page never showed here. */}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {therapists.map((therapist) => (
              <li key={therapist.slug} className={`overflow-hidden ${CARD}`}>
                <Image
                  src={therapist.sceneImage}
                  alt={`${therapist.name} working with a client`}
                  width={1800}
                  height={1800}
                  sizes="(max-width: 640px) 92vw, 46vw"
                  className="aspect-[5/4] w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BookClose />
    </>
  );
}
