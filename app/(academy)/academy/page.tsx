import Image from "next/image";
import Link from "next/link";
import { Accordion } from "@/components/academy/accordion";
import { ButtonLink } from "@/components/academy/button";
import { DisciplineCard } from "@/components/academy/course-types";
import { MetaRow, StatBar } from "@/components/academy/meta";
import { Section, SectionHeader } from "@/components/academy/section";
import { TestimonialCarousel } from "@/components/academy/testimonial-carousel";
import {
  ALL_SESSIONS,
  DISCIPLINES,
  FAQS,
  INSTRUCTOR,
  MAX_SEATS,
  TESTIMONIALS,
} from "@/lib/academy";

/**
 * Academy home.
 *
 * The brief is a small catalogue: three disciplines, each taught two ways.
 * So the homepage does one job — say what the academy is, show the three
 * disciplines with enough metadata to choose between them, and get out of
 * the way. Everything that used to be duplicated here (per-discipline
 * outlines, session tables, testimonials repeated per course) now lives on
 * the course page where the decision is actually made.
 */
export default function HomePage() {
  const nextUp = ALL_SESSIONS.filter((entry) => entry.session.seatsLeft > 0)[0];

  return (
    <>
      {/* --------------------------------------------------------- Hero */}
      <section className="border-b border-line bg-paper">
        {/* Same band tokens as Section, so the hero's bottom padding pairs
            with the next band's top padding at the same rhythm as every other
            seam. See the rhythm notes in app/globals.css. */}
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-band sm:px-8 sm:py-band-wide lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="eyebrow">Flex &amp; Flow Academy</p>
            <h1 className="display text-5xl sm:text-6xl lg:text-7xl">
              Learn the treatment properly, from someone watching your hands.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              Three disciplines, taught in Uluwatu. Take one online at your own
              pace, or come for two days and have your technique corrected in a
              room of no more than {MAX_SEATS} people.
            </p>

            <MetaRow
              items={[
                `${DISCIPLINES.length} disciplines`,
                "Online or onsite",
                "2 full days onsite",
                `Max ${MAX_SEATS} students`,
                "Once a quarter",
              ]}
            />

            <div className="mt-2 flex flex-wrap gap-3">
              <ButtonLink href="/academy/courses" size="lg">
                Browse the courses
              </ButtonLink>
              <ButtonLink href="/academy/schedule" variant="secondary" size="lg">
                See onsite dates
              </ButtonLink>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-surface lg:aspect-[4/4.4]">
            <Image
              src="/photos/hands-on.jpg"
              alt="Instructor correcting a student's hands during a lesson"
              fill
              sizes="(max-width: 1024px) 100vw, 520px"
              preload
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Disciplines */}
      <Section>
        <SectionHeader
          eyebrow="Courses"
          title="Three disciplines."
          lead="Each one is a complete programme with its own syllabus, and each is available both as a self-paced online course and as a two-day onsite course."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {DISCIPLINES.map((discipline) => (
            <DisciplineCard key={discipline.slug} discipline={discipline} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------- Stat band */}
      <Section tone="olive">
        <StatBar
          stats={[
            { value: `${MAX_SEATS}`, label: "Students per onsite course, maximum" },
            { value: "2", label: "Full training day's, per onsite course" },
            { value: "4", label: "Intakes a year — one per quarter" },
            { value: "12", label: "Years the instructor has been in practice" },
          ]}
        />
      </Section>

      {/* ------------------------------------------------- How it works */}
      <Section tone="paper">
        <SectionHeader
          eyebrow="How it works"
          title="Two ways to take any of them."
          lead="The syllabus is the same either way. What changes is whether someone is standing next to you when you get it wrong."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-surface bg-white p-8">
            <h3 className="display text-3xl">Online course</h3>
            <p className="text-sm leading-relaxed text-muted">
              Self-paced digital material with lifetime access, including the
              full manual. Buy it and start immediately — there is nothing to
              register for, because nothing can sell out.
            </p>
            <ButtonLink
              href="/academy/materials"
              variant="secondary"
              className="mt-2 sm:w-fit"
            >
              Browse the materials
            </ButtonLink>
          </div>
          <div className="flex flex-col gap-4 rounded-surface bg-white p-8">
            <h3 className="display text-3xl">Onsite course</h3>
            <p className="text-sm leading-relaxed text-muted">
              Two full days at the Uluwatu studio, practising on real bodies
              with your hands corrected as you work. Capped at {MAX_SEATS}{" "}
              students, once a quarter per discipline — so this one needs
              registration.
            </p>
            <ButtonLink href="/academy/schedule" className="mt-2 sm:w-fit">
              See the dates
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------- Instructor */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-surface">
            <Image
              src={INSTRUCTOR.photo}
              alt={`${INSTRUCTOR.name}, ${INSTRUCTOR.role}`}
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Who teaches"
              title={`Every onsite course is taught by ${INSTRUCTOR.name}.`}
              lead={INSTRUCTOR.bio}
            />
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {INSTRUCTOR.credentials.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span aria-hidden className="font-bold text-olive">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------- Testimonials */}
      <Section tone="olive">
        <SectionHeader
          eyebrow="From students"
          title="What people say afterwards."
          tone="light"
          align="center"
        />
        <div className="mt-12">
          <TestimonialCarousel items={TESTIMONIALS} />
        </div>
      </Section>

      {/* ----------------------------------------------------------- FAQ */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            eyebrow="FAQ"
            title="Questions we get asked most."
            lead="If your question is not here, message us on WhatsApp — we answer it ourselves."
          >
            <ButtonLink href="/academy/faq" variant="ghost" className="mt-2">
              Read all questions →
            </ButtonLink>
          </SectionHeader>
          <Accordion items={FAQS.slice(0, 5)} />
        </div>
      </Section>

      {/* ----------------------------------------------------------- CTA */}
      <Section tone="paper" size="lg">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="display max-w-3xl text-5xl sm:text-6xl">
            {nextUp
              ? `Next up: ${nextUp.discipline.shortTitle}, ${nextUp.session.longLabel}.`
              : "The next intake opens soon."}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {MAX_SEATS} seats, one instructor, two days. If you would rather
            start from home, every discipline is available online today.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/academy/schedule" size="lg">
              See all dates
            </ButtonLink>
            <Link
              href="/academy/materials"
              // Styled as a button, so it takes the button radius too.
              className="inline-flex items-center rounded-control px-8 py-4 text-base font-bold text-ink underline-offset-4 hover:text-olive hover:underline"
            >
              Start online instead
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
