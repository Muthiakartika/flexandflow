import Image from "next/image";
import { notFound } from "next/navigation";
import { SeatsBadge } from "@/components/academy/badge";
import { ButtonLink } from "@/components/academy/button";
import { Curriculum } from "@/components/academy/curriculum";
import { Fact, MetaRow } from "@/components/academy/meta";
import { BulletList, OutcomeGrid } from "@/components/academy/outcomes";
import { Section, SectionHeader } from "@/components/academy/section";
import {
  COURSE_TYPES,
  courseTypeMeta,
  DISCIPLINES,
  formatPrice,
  getDiscipline,
  isCourseType,
  lessonCount,
  MAX_SEATS,
  openSessions,
} from "@/lib/academy";

export function generateStaticParams() {
  return DISCIPLINES.flatMap((discipline) =>
    COURSE_TYPES.map((type) => ({ slug: discipline.slug, type })),
  );
}

export async function generateMetadata(
  props: PageProps<"/academy/courses/[slug]/[type]">,
) {
  const { slug, type } = await props.params;
  const discipline = getDiscipline(slug);
  if (!discipline || !isCourseType(type)) return { title: "Course" };
  const meta = courseTypeMeta(discipline, type);
  return {
    title: `${discipline.title} — ${meta.name}`,
    description: `${meta.tagline} ${discipline.summary}`,
  };
}

/**
 * One page per discipline PER COURSE TYPE — six in total.
 *
 * The previous version put online and onsite on a single page with a
 * comparison table. That answered "which should I pick" well and "tell me
 * everything about the onsite course" badly: the detail that only applies to
 * one type had nowhere to live without cluttering the other. Splitting gives
 * each type room for its own benefits, its own inclusions and its own
 * call to action, and the comparison still exists one level up at
 * /courses/[slug].
 *
 * Both types share this template. Everything that differs comes from
 * `courseTypeMeta`, so the two pages cannot drift apart.
 */
export default async function CourseTypePage(
  props: PageProps<"/academy/courses/[slug]/[type]">,
) {
  const { slug, type } = await props.params;
  const discipline = getDiscipline(slug);
  if (!discipline || !isCourseType(type)) notFound();

  const meta = courseTypeMeta(discipline, type);
  const otherMeta = courseTypeMeta(discipline, meta.other);
  const open = openSessions(discipline);
  const onsite = type === "onsite";

  return (
    <>
      {/* --------------------------------------------------------- Hero */}
      <section className="border-b border-line bg-paper">
        {/* Band tokens, matching Section — see app/globals.css. */}
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-band sm:px-8 sm:py-band-wide lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <p className="eyebrow">{meta.name}</p>
            <h1 className="display text-5xl sm:text-6xl lg:text-7xl">
              {discipline.title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              {meta.tagline}
            </p>

            <MetaRow
              items={[
                `${discipline.modules.length} modules`,
                `${lessonCount(discipline)} lessons`,
                meta.commitment,
                discipline.level,
                meta.certificate ? "Certificate" : "No certificate",
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

          {/* Sticky panel: price, availability, the single next action. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-surface border border-line bg-white p-6 sm:p-8">
              <p className="eyebrow">{meta.name}</p>
              <p className="display mt-2 text-4xl">
                {formatPrice(meta.price)}
              </p>

              <dl className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
                <Fact label="Commitment">{meta.commitment}</Fact>
                <Fact label="Class size">{meta.cohort}</Fact>
                <Fact label="Certificate">
                  {meta.certificate ? "Yes, on completion" : "Not certified"}
                </Fact>
                <Fact label="Registration">
                  {meta.needsRegistration
                    ? "Required — seats are limited"
                    : "None — buy and start"}
                </Fact>
              </dl>

              {onsite ? (
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
                  <SeatsBadge seatsLeft={open[0]?.seatsLeft ?? 0} />
                  <span className="text-sm text-muted">
                    {open[0] ? (
                      <>
                        Next:{" "}
                        <span className="font-bold text-ink">
                          {open[0].label}
                        </span>
                      </>
                    ) : (
                      "Every listed date is taken."
                    )}
                  </span>
                </div>
              ) : null}

              <ButtonLink
                href={onsite && !meta.available ? "/academy/schedule" : meta.href}
                size="lg"
                className="mt-6 flex w-full"
              >
                {meta.action}
              </ButtonLink>

              <ul className="mt-6 flex flex-col gap-3">
                {meta.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed">
                    <span aria-hidden className="mt-0.5 font-bold text-olive">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-t border-line pt-6">
                <p className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
                  Prefer the other way?
                </p>
                <ButtonLink
                  href={`/academy/courses/${discipline.slug}/${meta.other}`}
                  variant="ghost"
                  className="mt-2"
                >
                  {otherMeta.name} · {formatPrice(otherMeta.price)} →
                </ButtonLink>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------ What you learn */}
      <Section>
        <OutcomeGrid outcomes={discipline.outcomes} />
      </Section>

      {/* --------------------------------------------------- Why this way */}
      <Section tone="paper">
        <SectionHeader
          eyebrow="Benefits"
          title={
            onsite
              ? "Why two days in the room is worth it."
              : "Why starting online works."
          }
          lead={
            onsite
              ? "Everything below is something a video cannot do for you."
              : "Everything below is something a fixed two-day date cannot do for you."
          }
        />
        <ul className="mt-12 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {meta.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3 text-sm leading-relaxed">
              <span aria-hidden className="mt-0.5 font-bold text-olive">
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* The "Why this discipline" band ("What it does for your practice")
          used to sit here, between Benefits and Curriculum. Removing it left
          two paper bands touching, so every tone from here down is shifted by
          one to keep the white/paper alternation intact. If it is ever
          restored, shift them all back — the content is still in the model as
          `whyItMatters` and `addsToPractice`. */}

      {/* ---------------------------------------------------- Curriculum */}
      <Section>
        <SectionHeader
          eyebrow="Curriculum"
          title="What it covers."
          // The counts used to open this sentence too, but Curriculum states
          // them itself directly below — the same three figures twice, a line
          // apart. The lead now carries only what Curriculum does not say.
          lead={`Identical in both course types — ${onsite ? "the two days work through it with your hands corrected" : "you work through it at your own pace"}.`}
        />
        <div className="mt-12">
          <Curriculum discipline={discipline} />
        </div>
      </Section>

      {/* ------------------------------------------------ Type specifics */}
      {/* White, as requested. Curriculum above is also white, so this is the
          one seam on the page where the tone change does not do the
          separating — hence the top rule. Both branches must carry the same
          tone and border: they occupy one slot and only ever one renders. */}
      {onsite ? (
        <Section className="border-t border-line">
          <SectionHeader
            eyebrow="The two days"
            title="Hour by hour."
            // `lead` takes a ReactNode, so the two facts that decide whether
            // someone can attend — when it runs, and how few seats there are
            // — are set in ink and bold. Only the venue stays muted, since it
            // is the same address on every page.
            lead={
              <>
                <strong className="font-bold text-ink">
                  {discipline.onsite.duration}, {discipline.onsite.schedule}
                </strong>
                , at the Uluwatu studio.{" "}
                <strong className="font-bold text-ink">
                  Maximum {MAX_SEATS} students.
                </strong>
              </>
            }
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
      ) : (
        <Section className="border-t border-line">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <SectionHeader
                eyebrow="How it is delivered"
                title="What you actually get."
                lead={discipline.online.format}
              />
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="display text-4xl sm:text-5xl">
                The {discipline.ebook.pages}-page manual
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Included with the course, and the thing most students say they
                still use every week.
              </p>
              <BulletList items={discipline.ebook.contents} />
            </div>
          </div>
        </Section>
      )}

      {/* -------------------------------------------------- Before you start */}
      {/* "Who it is for" sat in the left half of this band. With it gone a
          two-column grid would leave one lopsided half-empty row, so this
          uses the site's editorial heading-left / content-right pattern
          instead. `discipline.audience` is still in the model. */}
      {/* Paper, and the CTA below flips to white to keep the run alternating.
          Making "The two days" white above cost the page its even/odd parity,
          so the two closing bands absorb the shift — that leaves exactly one
          same-tone seam on the page (Curriculum/The two days) instead of
          three white bands running together. */}
      <Section tone="paper">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            eyebrow="Before you start"
            title="What you need to start."
          />
          <div className="flex flex-col gap-6 lg:pt-4">
            <BulletList items={discipline.requirements} />
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------------- CTA */}
      {/* White, so it contrasts with the paper band above. The footer that
          follows is paper, so this seam is a tone change too. */}
      <Section size="lg">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="display max-w-3xl text-5xl sm:text-6xl">
            {onsite
              ? open[0]
                ? `Next intake: ${open[0].longLabel}.`
                : "The next intake opens soon."
              : "Start it this afternoon."}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {onsite
              ? `${MAX_SEATS} seats, one instructor, two days — and the online course is included in the fee.`
              : "Nothing to register for, nothing to wait for, and what you pay comes off the onsite fee if you join a course later."}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink
              href={onsite && !meta.available ? "/academy/schedule" : meta.href}
              size="lg"
            >
              {meta.action}
            </ButtonLink>
            <ButtonLink
              href={`/academy/courses/${discipline.slug}`}
              variant="secondary"
              size="lg"
            >
              Compare with {otherMeta.name.toLowerCase()}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
