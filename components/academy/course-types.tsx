import Link from "next/link";
import { ButtonLink } from "@/components/academy/button";
import { SeatsBadge } from "@/components/academy/badge";
import {
  formatDuration,
  formatPrice,
  lessonCount,
  MAX_SEATS,
  openSessions,
  totalMinutes,
  type Discipline,
} from "@/lib/academy";

/**
 * Online course versus onsite course, side by side — the two course types the
 * brief names, compared on one screen.
 *
 * On the original site these were separate destinations, so answering "what
 * do I actually get for the extra money" meant opening two pages and holding
 * one in your head. Adding Value puts its delivery formats in a single band
 * for exactly this reason: a choice is only obvious when the options are
 * adjacent.
 *
 * Rendered twice rather than once. A real <table> is the right semantics and
 * the right density on a wide screen, but at 375px it could only scroll, and
 * a comparison you have to scroll sideways is not a comparison. Mobile gets
 * stacked cards carrying the identical fields. Exactly one of the two is
 * visible at any width — never both.
 */
type Row = { label: string; online: string; onsite: string };

function rows(discipline: Discipline): Row[] {
  return [
    {
      label: "Price",
      online: formatPrice(discipline.online.price),
      onsite: formatPrice(discipline.onsite.price),
    },
    {
      label: "Length",
      online: `${formatDuration(totalMinutes(discipline))} of material`,
      onsite: `${discipline.onsite.duration}, ${discipline.onsite.schedule}`,
    },
    {
      label: "How it runs",
      online: "Self-paced, lifetime access, on phone or laptop",
      onsite: "In person at the Uluwatu studio",
    },
    {
      label: "Hands corrected",
      online: "No",
      onsite: "Yes — this is the whole point",
    },
    {
      label: "Class size",
      online: "No class — work alone",
      onsite: `Maximum ${MAX_SEATS} students`,
    },
    { label: "Certificate", online: "No", onsite: "Yes" },
    {
      label: "Learning pack",
      online: "Included",
      onsite: "Included",
    },
    {
      label: "Registration",
      online: "Not needed — buy and start",
      onsite: "Required, seats are limited",
    },
  ];
}

export function CourseTypes({ discipline }: { discipline: Discipline }) {
  const data = rows(discipline);
  const open = openSessions(discipline);

  return (
    <>
      {/* Desktop: one table, scannable across. */}
      <div className="hidden lg:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            The online course and the onsite course compared on price, length,
            delivery, class size, certification and registration.
          </caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="w-44 py-5 pr-6 align-bottom">
                <span className="sr-only">Detail</span>
              </th>
              <th scope="col" className="py-5 pr-6 align-bottom">
                <span className="display block text-3xl">Online course</span>
                <span className="mt-1 block text-sm font-normal text-muted">
                  Work through it at your own pace, from anywhere.
                </span>
              </th>
              <th scope="col" className="py-5 pr-6 align-bottom">
                <span className="display block text-3xl">Onsite course</span>
                <span className="mt-1 block text-sm font-normal text-muted">
                  Two days in the room, hands corrected as you work.
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label} className="border-b border-line align-top">
                <th
                  scope="row"
                  className="py-5 pr-6 text-xs font-bold tracking-[0.14em] text-faint uppercase"
                >
                  {row.label}
                </th>
                <td className="py-5 pr-6 text-sm leading-relaxed">
                  {row.online}
                </td>
                <td className="py-5 pr-6 text-sm leading-relaxed">
                  {row.onsite}
                </td>
              </tr>
            ))}
            <tr>
              <td />
              <td className="py-8 pr-6">
                <ButtonLink
                  href={`/academy/courses/${discipline.slug}/online`}
                  variant="secondary"
                >
                  Online course details
                </ButtonLink>
              </td>
              <td className="py-8 pr-6">
                <ButtonLink href={`/academy/courses/${discipline.slug}/onsite`}>
                  Onsite course details
                </ButtonLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet: the same fields, stacked. */}
      <div className="flex flex-col gap-6 lg:hidden">
        {(["online", "onsite"] as const).map((type) => (
          <div
            key={type}
            className="rounded-surface border border-line p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="display text-3xl">
                {type === "online" ? "Online course" : "Onsite course"}
              </h3>
              {type === "onsite" && open[0] ? (
                <SeatsBadge seatsLeft={open[0].seatsLeft} />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">
              {type === "online"
                ? "Work through it at your own pace, from anywhere."
                : "Two days in the room, hands corrected as you work."}
            </p>

            <dl className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
              {data.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap justify-between gap-x-6 gap-y-1"
                >
                  <dt className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
                    {row.label}
                  </dt>
                  <dd className="max-w-[20rem] text-sm leading-relaxed sm:text-right">
                    {row[type]}
                  </dd>
                </div>
              ))}
            </dl>

            <ButtonLink
              href={`/academy/courses/${discipline.slug}/${type}`}
              variant={type === "onsite" ? "primary" : "secondary"}
              className="mt-8 flex w-full"
            >
              {type === "online" ? "Online" : "Onsite"} course details
            </ButtonLink>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Discipline card for the homepage and the course index.
 *
 * Not a single wrapping <a>. Each course type now has its own page, so the
 * card offers both — and nesting two links inside one link is invalid HTML
 * that leaves keyboard users tabbing through an outer target they cannot
 * see. The heading carries the link to the discipline hub; the two type
 * links sit below it as their own targets.
 */
export function DisciplineCard({ discipline }: { discipline: Discipline }) {
  const next = openSessions(discipline)[0];

  return (
    <div className="flex flex-col gap-4 rounded-surface border border-line p-6 transition-colors hover:border-olive">
      <h3 className="display text-3xl">
        <Link
          href={`/academy/courses/${discipline.slug}`}
          className="hover:text-olive focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive"
        >
          {discipline.title}
        </Link>
      </h3>
      <p className="text-sm leading-relaxed text-muted">{discipline.summary}</p>

      <dl className="flex flex-col gap-1 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Online</dt>
          <dd className="text-right font-bold">
            {formatDuration(totalMinutes(discipline))} ·{" "}
            {lessonCount(discipline)} lessons
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Onsite</dt>
          <dd className="text-right font-bold">
            {discipline.onsite.duration}, max {MAX_SEATS}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Next date</dt>
          <dd className="text-right font-bold">
            {next ? next.label : "Fully booked"}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <ButtonLink
          href={`/academy/courses/${discipline.slug}/online`}
          variant="secondary"
        >
          Online
        </ButtonLink>
        <ButtonLink href={`/academy/courses/${discipline.slug}/onsite`}>
          Onsite
        </ButtonLink>
      </div>
    </div>
  );
}
