/**
 * "What you'll learn" — the bordered checklist Udemy puts directly under the
 * hero, and the single densest piece of information on a course page.
 *
 * Two columns on desktop so six items read as one block rather than a long
 * list. The tick is decorative: the semantics are already carried by the list,
 * and reading "check" before every line adds nothing.
 */
export function OutcomeGrid({ outcomes }: { outcomes: readonly string[] }) {
  return (
    <div className="rounded-surface border border-line p-8 sm:p-10">
      <h2 className="display text-3xl sm:text-4xl">What you will be able to do</h2>
      <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <li key={outcome} className="flex gap-3 text-sm leading-relaxed">
            <span aria-hidden className="mt-0.5 font-bold text-olive">
              ✓
            </span>
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Plain bulleted list used for audience and requirements. */
export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-olive" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
