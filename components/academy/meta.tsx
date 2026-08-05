import type { ReactNode } from "react";

/**
 * The fact strip under the hero title, and the stat band below it.
 *
 * Both are lifted from the course-landing pattern Udemy and Coursera use:
 * put the decision-making facts in one scannable line before any prose. The
 * difference here is what goes in it. Those platforms lead with an aggregate
 * rating; this academy has no reviews to aggregate, so the strip carries only
 * things it actually knows — hours, modules, level, cohort size. See the note
 * at the top of lib/academy.ts.
 */
export function MetaRow({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-3">
          {index > 0 ? (
            <span aria-hidden className="text-line-cool">
              ·
            </span>
          ) : null}
          <span className="font-bold text-ink">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Four-up band of numbers. Deliberately not a "91% of learners" style claim —
 * every figure here is a property of how the academy is run, not an outcome
 * measured on students.
 *
 * Lives on the olive band, so the label is white/85 (4.95:1) and NOT
 * --color-muted, which lands at 1.13:1 there and disappears completely.
 *
 * `flex-col-reverse` rather than a visually-hidden <dt> plus an aria-hidden
 * <p>: a <dl> needs the term before the description, but the number should
 * read first. Reversing the flex order gets both without duplicating the
 * label into a copy screen readers use and a copy everyone else sees — a
 * duplication that also hides the visible copy from contrast tooling.
 */
export function StatBar({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  return (
    // Dividers and centring only from lg. Below that the grid is two columns
    // and a vertical rule would sit mid-screen separating nothing — the
    // four-up row is the only arrangement the rules make sense in.
    //
    // The rule is an explicit border-left on each item rather than `divide-x`
    // on the parent. `divide-x` set the border COLOUR but left the width at
    // 0, so the dividers were invisible; this generates reliably and reads
    // more plainly. `first:border-l-0` drops the leading rule, and the px-6
    // pair gives the rules breathing room while keeping the outer edges flush
    // with the band's own padding.
    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col-reverse items-center gap-1 text-center lg:border-l lg:border-white/15 lg:px-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
        >
          <dt className="text-sm leading-relaxed text-white/85">
            {stat.label}
          </dt>
          <dd className="display text-5xl leading-none sm:text-6xl">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Small labelled fact used inside cards and the schedule rows. */
export function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
        {label}
      </dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
