import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/academy/button";
import { MetaRow } from "@/components/academy/meta";
import { BulletList } from "@/components/academy/outcomes";
import { PageIntro } from "@/components/academy/page-intro";
import { RegisterForm } from "@/components/academy/register-form";
import { Section } from "@/components/academy/section";
import {
  DISCIPLINES,
  getDiscipline,
  MAX_SEATS,
  openSessions,
} from "@/lib/academy";

export function generateStaticParams() {
  return DISCIPLINES.map((discipline) => ({ slug: discipline.slug }));
}

export async function generateMetadata(props: PageProps<"/academy/register/[slug]">) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  return {
    title: discipline ? `Register · ${discipline.title}` : "Register",
    description: discipline
      ? `Secure one of ${MAX_SEATS} seats on the two-day onsite ${discipline.title} course in Uluwatu, Bali.`
      : undefined,
  };
}

/**
 * Registration exists for onsite courses ONLY.
 *
 * There is deliberately no /register route for the online course or the
 * manual. Those have unlimited supply and are bought straight from
 * /materials/[slug]; putting a registration step in front of them would add
 * friction that protects nothing.
 */
export default async function RegisterPage(
  props: PageProps<"/academy/register/[slug]">,
) {
  const { slug } = await props.params;
  const discipline = getDiscipline(slug);
  if (!discipline) notFound();

  const open = openSessions(discipline);

  return (
    <>
      <PageIntro
        eyebrow="Onsite registration"
        title={discipline.title}
        lead={`${discipline.onsite.duration} at the Uluwatu studio, ${discipline.onsite.schedule}. Registration is needed here because seats are capped at ${MAX_SEATS}.`}
      >
        <MetaRow
          items={[
            discipline.onsite.duration,
            `Max ${MAX_SEATS} students`,
            "Certificate included",
            open.length
              ? `${open.length} date${open.length > 1 ? "s" : ""} open`
              : "Fully booked",
          ]}
        />
      </PageIntro>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr]">
          <RegisterForm discipline={discipline} />

          <div className="flex flex-col gap-8 lg:pt-2">
            <div className="flex flex-col gap-5">
              <h2 className="display text-3xl">What the fee includes</h2>
              <BulletList items={discipline.onsite.includes} />
            </div>

            <div className="flex flex-col gap-5 border-t border-line pt-8">
              <h2 className="display text-3xl">The two days</h2>
              {discipline.onsite.outline.map((day) => (
                <div key={day.day} className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold">{day.day}</h3>
                  <BulletList items={day.items} />
                </div>
              ))}
            </div>

            <div className="border-t border-line pt-8">
              <p className="text-sm leading-relaxed text-muted">
                Cannot make these dates, or not in Bali? The online course
                covers the same modules and needs no registration.
              </p>
              <ButtonLink
                href={`/academy/materials/${discipline.slug}`}
                variant="secondary"
                className="mt-4"
              >
                Take it online instead
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
