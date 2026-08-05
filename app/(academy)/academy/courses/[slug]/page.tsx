import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/academy/button";
import { CourseTypes } from "@/components/academy/course-types";
import { Curriculum } from "@/components/academy/curriculum";
import { EnrolCard } from "@/components/academy/enrol-card";
import { MetaRow } from "@/components/academy/meta";
import { BulletList, OutcomeGrid } from "@/components/academy/outcomes";
import { Section, SectionHeader } from "@/components/academy/section";
import {
  DISCIPLINES,
  formatDuration,
  getDiscipline,
  lessonCount,
  MAX_SEATS,
  totalMinutes,
} from "@/lib/academy";

export function generateStaticParams() {
  return DISCIPLINES.map((discipline) => ({ slug: discipline.slug }));
}

export async function generateMetadata(props: PageProps<"/academy/courses/[slug]">) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  return {
    title: discipline ? discipline.title : "Course",
    description: discipline?.summary,
  };
}

/**
 * One page per discipline, carrying BOTH course types.
 *
 * The original site had a course page and a separate workshop page per
 * discipline, so the question "what do I get for the extra money" needed two
 * tabs. Everything about one subject is now on one page: the facts, what you
 * will be able to do, the two ways to take it side by side, the syllabus, and
 * who it is for.
 */
export default async function CoursePage(props: PageProps<"/academy/courses/[slug]">) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  if (!discipline) notFound();

  const others = DISCIPLINES.filter((d) => d.slug !== discipline.slug);

  return (
    <>
      {/* --------------------------------------------------------- Hero */}
      <section className="border-b border-line bg-paper">
        {/* Band tokens, matching Section — see app/globals.css. */}
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-band sm:px-8 sm:py-band-wide lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <p className="eyebrow">Course</p>
            <h1 className="display text-5xl sm:text-6xl lg:text-7xl">
              {discipline.title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              {discipline.summary}
            </p>

            <MetaRow
              items={[
                `${discipline.modules.length} modules`,
                `${lessonCount(discipline)} lessons`,
                formatDuration(totalMinutes(discipline)),
                discipline.level,
                `Max ${MAX_SEATS} onsite`,
              ]}
            />

            <div className="relative mt-2 aspect-[16/10] w-full overflow-hidden rounded-surface">
              <Image
                src={discipline.photo}
                alt={discipline.photoAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 640px"
                preload
                className="object-cover"
              />
            </div>

            <p className="max-w-2xl text-base leading-relaxed text-muted">
              {discipline.intro}
            </p>
          </div>

          <EnrolCard discipline={discipline} />
        </div>
      </section>

      {/* ------------------------------------------------ What you learn */}
      <Section>
        <OutcomeGrid outcomes={discipline.outcomes} />
      </Section>

      {/* -------------------------------------------------- Course types */}
      <Section tone="paper">
        <SectionHeader
          eyebrow="Two ways to take it"
          title="Online or onsite."
          lead="Same syllabus either way. The difference is whether someone corrects your hands while you work — and whether you get a certificate at the end."
        />
        <div className="mt-12">
          <CourseTypes discipline={discipline} />
        </div>
      </Section>

      {/* ---------------------------------------------------- Curriculum */}
      <Section>
        <SectionHeader
          eyebrow="Curriculum"
          title="What it covers."
          lead="In the order you would actually meet it with a client in front of you."
        />
        <div className="mt-12">
          <Curriculum discipline={discipline} />
        </div>
      </Section>

      {/* ------------------------------------------------- The two days */}
      <Section tone="paper">
        <SectionHeader
          eyebrow="The onsite course"
          title="How the two days run."
          lead={`${discipline.onsite.duration}, ${discipline.onsite.schedule}, at the Uluwatu studio.`}
        />
        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {discipline.onsite.outline.map((day) => (
            <div key={day.day} className="flex flex-col gap-5">
              <h3 className="display text-3xl">{day.day}</h3>
              <BulletList items={day.items} />
            </div>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------- Before you start */}
      {/* "Who it is for" filled the left half here. Only a column was removed,
          not a whole band, so the white/paper alternation on this page is
          unchanged. `discipline.audience` is still in the model. */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            eyebrow="Before you start"
            title="What you need to start."
          />
          <div className="flex flex-col gap-6 lg:pt-4">
            <BulletList items={discipline.requirements} />
            <div className="mt-2 flex flex-wrap gap-3">
              <ButtonLink href={`/academy/register/${discipline.slug}`}>
                Secure a spot
              </ButtonLink>
              <ButtonLink
                href={`/academy/materials/${discipline.slug}`}
                variant="secondary"
              >
                Start online
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------- Other disciplines */}
      <Section tone="paper">
        <SectionHeader eyebrow="Also available" title="The other two." />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {others.map((other) => (
            <div
              key={other.slug}
              className="flex flex-col gap-4 rounded-surface bg-white p-8"
            >
              <h3 className="display text-3xl">{other.title}</h3>
              <p className="text-sm leading-relaxed text-muted">
                {other.summary}
              </p>
              <ButtonLink
                href={`/academy/courses/${other.slug}`}
                variant="ghost"
                className="mt-auto sm:w-fit"
              >
                Look at {other.shortTitle} →
              </ButtonLink>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
