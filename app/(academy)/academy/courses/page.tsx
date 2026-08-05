import { DisciplineCard } from "@/components/academy/course-types";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";
import { ButtonLink } from "@/components/academy/button";
import { DISCIPLINES, MAX_SEATS } from "@/lib/academy";

export const metadata = {
  title: "Courses",
  description:
    "Three disciplines — lymphatic drainage, assisted stretching and sports massage — each available as a self-paced online course or a two-day onsite course capped at six students.",
};

export default function CoursesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Courses"
        title="Three disciplines, two ways to take each."
        lead={`Every discipline is a complete programme with its own syllabus. Take it online at your own pace, or come to the studio for two full days in a group of no more than ${MAX_SEATS}.`}
      />

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {DISCIPLINES.map((discipline) => (
            <DisciplineCard key={discipline.slug} discipline={discipline} />
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader
          eyebrow="Not sure which"
          title="Start with what your clients keep asking for."
          lead="Lymphatic drainage is the most requested treatment on our own menu. Assisted stretching is the fastest to add if you already have a table. Sports massage is the one that pays for itself around race season. If you are still undecided, ask us — we will tell you honestly, even if it means telling you to wait a quarter."
        >
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/academy/contact">Ask us</ButtonLink>
            <ButtonLink href="/academy/schedule" variant="secondary">
              See onsite dates
            </ButtonLink>
          </div>
        </SectionHeader>
      </Section>
    </>
  );
}
