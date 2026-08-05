import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/academy/button";
import { Curriculum } from "@/components/academy/curriculum";
import { MaterialsCheckout } from "@/components/academy/materials-checkout";
import { MetaRow } from "@/components/academy/meta";
import { BulletList } from "@/components/academy/outcomes";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";
import {
  DISCIPLINES,
  formatDuration,
  getDiscipline,
  lessonCount,
  totalMinutes,
} from "@/lib/academy";

export function generateStaticParams() {
  return DISCIPLINES.map((discipline) => ({ slug: discipline.slug }));
}

export async function generateMetadata(props: PageProps<"/academy/materials/[slug]">) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  return {
    title: discipline ? `${discipline.title} — materials` : "Materials",
    description: discipline?.summary,
  };
}

/**
 * The payment-and-download landing page the brief asks for.
 *
 * It sells two things that share a delivery mechanism: the online course and
 * the manual on its own. Both arrive by download the moment payment clears,
 * which is why they live together here and why neither has a registration
 * step — that belongs to the onsite course, where seats run out.
 */
export default async function MaterialDetailPage(
  props: PageProps<"/academy/materials/[slug]">,
) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  if (!discipline) notFound();

  return (
    <>
      <PageIntro
        eyebrow="Learning materials"
        title={discipline.title}
        lead={discipline.summary}
      >
        <MetaRow
          items={[
            `${discipline.modules.length} modules`,
            `${lessonCount(discipline)} lessons`,
            formatDuration(totalMinutes(discipline)),
            `${discipline.ebook.pages}-page manual`,
            "Instant download",
          ]}
        />
      </PageIntro>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr]">
          <MaterialsCheckout discipline={discipline} />

          <div className="flex flex-col gap-8 lg:pt-2">
            <div className="flex flex-col gap-5">
              <h2 className="display text-3xl">
                Inside the {discipline.ebook.pages}-page manual
              </h2>
              <BulletList items={discipline.ebook.contents} />
            </div>

            <div className="flex flex-col gap-5 border-t border-line pt-8">
              <h2 className="display text-3xl">The online course</h2>
              <p className="text-sm leading-relaxed text-muted">
                {discipline.online.format}
              </p>
              <p className="text-sm leading-relaxed text-muted">
                It covers the same {discipline.modules.length} modules as the
                onsite course — {formatDuration(totalMinutes(discipline))} of
                material — and the manual is included with it.
              </p>
              <ButtonLink
                href={`/academy/courses/${discipline.slug}`}
                variant="ghost"
                className="sm:w-fit"
              >
                Compare online and onsite →
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader
          eyebrow="Curriculum"
          title="What you are buying."
          lead="The full syllabus, module by module, with the length of every lesson."
        />
        <div className="mt-12">
          <Curriculum discipline={discipline} />
        </div>
      </Section>
    </>
  );
}
