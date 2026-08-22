"use client";

import { FOCUS } from "@/components/ui/tokens";

import { stepIndex, type StepId } from "./state";

/**
 * Every step of the flow being run, always all of them.
 *
 * A new booking has five; a reschedule has two, because the therapist and the
 * treatment were decided when the booking was made and are not being asked
 * again. Which list it is arrives as a prop rather than being read from
 * `STEPS`, so the numbering is the flow's own: a reschedule counts 01 and 02.
 *
 * It is an ordered list because that is what it is, and the current entry
 * carries `aria-current="step"`. A step already answered is a button back to
 * it; a step not yet reachable is inert text rather than a disabled button, so
 * the tab order only contains places the visitor can actually go.
 *
 * On a narrow screen the labels of the other four steps drop away and only the
 * numbers and the current label remain — see `.booking-stepper` in
 * `app/(main)/globals.css`. That switch is a real media query, not an
 * arbitrary Tailwind variant; see `CLAUDE.md` gotcha 2.
 */
export default function Stepper({
  steps,
  label,
  current,
  furthest,
  onGo,
}: {
  /** The steps this flow has, in order. */
  steps: readonly StepId[];
  /** What to call each one — a reschedule renames two of them. */
  label: (step: StepId) => string;
  current: StepId;
  /** The last step the visitor's answers justify. Anything beyond is inert. */
  furthest: StepId;
  onGo: (step: StepId) => void;
}) {
  const currentIndex = stepIndex(current, steps);
  const furthestIndex = stepIndex(furthest, steps);

  return (
    <nav aria-label="Booking steps">
      <ol className="booking-stepper">
        {steps.map((step, index) => {
          const state =
            index === currentIndex
              ? "current"
              : index < currentIndex
                ? "done"
                : "ahead";
          const reachable = index < currentIndex && index <= furthestIndex;
          const number = String(index + 1).padStart(2, "0");

          return (
            <li key={step} className="booking-step" data-state={state}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onGo(step)}
                  className={`booking-step-body ${FOCUS}`}
                >
                  <span aria-hidden className="booking-step-number">
                    {number}
                  </span>
                  <span className="booking-step-label">{label(step)}</span>
                  <span className="sr-only">, completed — go back</span>
                </button>
              ) : (
                <span
                  className="booking-step-body"
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span aria-hidden className="booking-step-number">
                    {number}
                  </span>
                  <span className="booking-step-label">{label(step)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
