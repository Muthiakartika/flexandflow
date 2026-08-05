import { SeatsBadge } from "@/components/academy/badge";
import { ButtonLink } from "@/components/academy/button";
import { Fact } from "@/components/academy/meta";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";
import {
  ALL_SESSIONS,
  CONTACT,
  DISCIPLINES,
  isOpen,
  MAX_SEATS,
} from "@/lib/academy";

export const metadata = {
  title: "Onsite schedule",
  description: `Upcoming two-day onsite courses in Uluwatu, Bali. Each discipline runs once a quarter, capped at ${MAX_SEATS} students.`,
};

/**
 * One table for every discipline, sorted by date.
 *
 * The original schedule grouped by discipline, which meant three lists to
 * scan and no way to answer "what is on next". Since each discipline only
 * runs once a quarter, a single date-ordered list is both shorter and more
 * useful — the discipline becomes a column rather than a heading.
 */
export default function SchedulePage() {
  return (
    <>
      <PageIntro
        eyebrow="Schedule"
        title="Every onsite date."
        lead={`Each discipline runs once per quarter, two full days, ${MAX_SEATS} seats. Seats usually go within a few weeks of a date opening — registration is only needed for these, not for the online courses.`}
      />

      <Section>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {ALL_SESSIONS.map(({ session, discipline }) => {
            const open = isOpen(session);
            return (
              <li
                key={session.id}
                className="flex flex-col gap-6 py-8 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="display text-3xl sm:text-4xl">
                      {discipline.title}
                    </h2>
                    <SeatsBadge seatsLeft={session.seatsLeft} />
                  </div>
                  <dl className="flex flex-wrap gap-x-10 gap-y-3">
                    <Fact label="Dates">{session.longLabel}</Fact>
                    <Fact label="Quarter">{session.quarter}</Fact>
                    <Fact label="Length">{discipline.onsite.duration}</Fact>
                    <Fact label="Hours">{discipline.onsite.schedule}</Fact>
                    <Fact label="Venue">{session.venue}</Fact>
                  </dl>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  {open ? (
                    <ButtonLink href={`/academy/register/${discipline.slug}`}>
                      Secure a spot
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={CONTACT.whatsapp} variant="secondary">
                      Join the waitlist
                    </ButtonLink>
                  )}
                  <ButtonLink
                    href={`/academy/courses/${discipline.slug}`}
                    variant="ghost"
                  >
                    What it covers →
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="paper">
        <SectionHeader
          eyebrow="Not in Bali"
          title="All three run online, all year."
          lead="Same syllabus, self-paced, with the manual included — and nothing to register for, because an online course cannot sell out."
        >
          <div className="mt-4 flex flex-wrap gap-3">
            {DISCIPLINES.map((discipline) => (
              <ButtonLink
                key={discipline.slug}
                href={`/academy/materials/${discipline.slug}`}
                variant="secondary"
              >
                {discipline.shortTitle}
              </ButtonLink>
            ))}
          </div>
        </SectionHeader>
      </Section>
    </>
  );
}
