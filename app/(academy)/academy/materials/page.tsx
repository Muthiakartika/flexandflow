import Link from "next/link";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";
import { ButtonLink } from "@/components/academy/button";
import {
  DISCIPLINES,
  formatDuration,
  formatPrice,
  lessonCount,
  totalMinutes,
} from "@/lib/academy";

export const metadata = {
  title: "Learning materials",
  description:
    "Buy the online course or the manual on its own for any of the three disciplines. Available to download immediately after payment — no registration needed.",
};

export default function MaterialsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Learning materials"
        title="Buy it and start today."
        lead="Every discipline is available as a self-paced online course, and as a printable manual on its own. Both are delivered the moment payment clears — there is nothing to register for, because neither can sell out."
      />

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {DISCIPLINES.map((discipline) => (
            <Link
              key={discipline.slug}
              href={`/academy/materials/${discipline.slug}`}
              className="group flex flex-col gap-4 rounded-surface border border-line p-6 transition-colors hover:border-olive focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive"
            >
              <h2 className="display text-3xl group-hover:text-olive">
                {discipline.shortTitle}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {discipline.summary}
              </p>
              <dl className="mt-auto flex flex-col gap-1 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Online course</dt>
                  <dd className="text-right font-bold">
                    {formatDuration(totalMinutes(discipline))} ·{" "}
                    {lessonCount(discipline)} lessons
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Manual</dt>
                  <dd className="text-right font-bold">
                    {discipline.ebook.pages} pages
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">From</dt>
                  <dd className="text-right font-bold">
                    {formatPrice(discipline.ebook.price)}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader
          eyebrow="Worth knowing"
          title="Buying online counts towards an onsite seat."
          lead="If you take a discipline online and later join its two-day onsite course, what you paid here comes off the fee. Starting online costs you nothing in the long run."
        >
          <ButtonLink href="/academy/schedule" className="mt-4">
            See onsite dates
          </ButtonLink>
        </SectionHeader>
      </Section>
    </>
  );
}
