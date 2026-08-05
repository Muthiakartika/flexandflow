import type { Faq } from "@/lib/academy";

/**
 * Component 6 of 10 — Accordion.
 *
 * Native <details>/<summary>, so it works without JavaScript, is keyboard
 * accessible for free, and ships no client bundle. `name` groups the items
 * so opening one closes the others.
 */
export function Accordion({
  items,
  name = "faq",
  className = "",
}: {
  items: Faq[];
  name?: string;
  className?: string;
}) {
  return (
    <div className={`divide-y divide-line ${className}`}>
      {items.map((item) => (
        <details key={item.question} name={name} className="group">
          {/* Padding sits on the summary, not the details, so the whole band is
              the tap target rather than just the 24px text line. */}
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
            <span className="text-base font-bold sm:text-lg">
              {item.question}
            </span>
            <span
              aria-hidden
              className="mt-1 shrink-0 text-xl leading-none text-olive transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="-mt-2 max-w-3xl pr-10 pb-5 text-sm leading-relaxed text-muted">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
