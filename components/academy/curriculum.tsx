import {
  formatDuration,
  lessonCount,
  moduleMinutes,
  totalMinutes,
  type Discipline,
} from "@/lib/academy";

/**
 * The syllabus for one discipline, as an expandable module list.
 *
 * Native <details>, matching the FAQ accordion, so it works without
 * JavaScript and is keyboard accessible for free. Unlike the FAQ these are
 * NOT grouped with `name` — comparing two modules means having both open at
 * once, and exclusive accordions make that impossible.
 *
 * `open` on the first module: a collapsed list of five headings tells a
 * visitor nothing about depth, which is the whole reason they scrolled to the
 * curriculum. One module expanded shows the grain without dumping every
 * lesson on the page at once.
 *
 * The same syllabus backs both course types — the onsite course teaches these
 * modules with your hands being corrected, which is why the page states it
 * once here rather than twice.
 */
export function Curriculum({ discipline }: { discipline: Discipline }) {
  return (
    <div>
      {/* Bold and in ink rather than muted: this is now the only place the
          module, lesson and duration counts appear, since the section lead
          above no longer repeats them. */}
      <p className="text-sm font-bold text-ink">
        {discipline.modules.length} modules · {lessonCount(discipline)} lessons
        · {formatDuration(totalMinutes(discipline))} total
      </p>

      <div className="mt-6 divide-y divide-line border-y border-line">
        {discipline.modules.map((module) => (
          <details key={module.n} open={module.n === 1} className="group">
            {/* Padding sits on the summary so the whole band is the tap
                target, not just the text line. */}
            <summary className="flex cursor-pointer list-none items-baseline gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
              <span className="display w-8 shrink-0 text-2xl text-olive">
                {module.n}
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold sm:text-lg">
                  {module.title}
                </span>
                {/* Bold ink, matching the totals line above. The module title
                    stays a size larger, so the hierarchy still reads even
                    though both are now bold. */}
                <span className="mt-1 block text-sm font-bold text-ink">
                  {module.lessons.length} lessons ·{" "}
                  {formatDuration(moduleMinutes(module))}
                </span>
              </span>
              <span
                aria-hidden
                className="mt-1 shrink-0 text-xl leading-none text-olive transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>

            <div className="pb-6 sm:pl-12">
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                {module.summary}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.title}
                    className="flex justify-between gap-6 border-b border-line py-2 text-sm last:border-b-0"
                  >
                    <span>{lesson.title}</span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {formatDuration(lesson.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
