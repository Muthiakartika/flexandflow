"use client";

import { useState } from "react";

import { renderInline } from "./RichText";

/**
 * FAQ accordion embedded in a service/post body ("Learn More About ..."
 * sections). Distinct from the homepage FAQ: body text, olive question
 * colour, plain rows separated by 11px gaps, plus/minus toggle.
 *
 * `variant="cards"` is the treatment-page redesign (`RichText` on its
 * scannable layout): one white card per question, numbered, with a round
 * olive toggle, the first answer open so the section reads as answers rather
 * than a wall of closed rows. Answers slide open instead of appearing; a
 * closed one stays in the page for search engines and is `inert`, so its
 * links are not in the tab order.
 */
export default function InlineFaq({
  items,
  variant = "plain",
}: {
  items: { question: string; answer: string }[];
  variant?: "plain" | "cards";
}) {
  const cards = variant === "cards";
  const [open, setOpen] = useState<number | null>(cards ? 0 : null);

  if (cards) {
    return (
      <div className="my-8 flex flex-col gap-2.5">
        {items.map((item, i) => {
          const isOpen = open === i;
          const panelId = `inline-faq-panel-${i}`;
          const buttonId = `inline-faq-button-${i}`;

          return (
            <div
              key={item.question}
              className={`rounded-[10px] border bg-white transition-colors duration-300 ${
                isOpen ? "border-primary/40" : "border-secondary/10"
              }`}
            >
              {/* A real h3 around the button, as below. */}
              <h3 className="m-0! font-body text-[15px] leading-snug font-bold sm:text-[16px]">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-center gap-3.5 rounded-[10px] px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:px-5"
                >
                  <span
                    aria-hidden
                    className="w-7 shrink-0 font-display text-[22px] leading-none text-primary tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 transition-colors duration-300 group-hover:text-primary">
                    {renderInline(item.question)}
                  </span>
                  <span
                    aria-hidden
                    className={`relative h-8 w-8 shrink-0 rounded-full border transition-[background-color,border-color,color,transform] duration-300 motion-reduce:transition-none ${
                      isOpen
                        ? "rotate-45 border-primary bg-primary text-white"
                        : "border-primary/40 text-primary group-hover:border-primary"
                    }`}
                  >
                    <span className="absolute top-1/2 left-1/2 h-[2px] w-3 -translate-x-1/2 -translate-y-1/2 bg-current" />
                    <span className="absolute top-1/2 left-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-current" />
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                inert={!isOpen}
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-5 font-body text-[15px] leading-[1.75] text-body-text/80 sm:pr-16 sm:pl-16">
                    {renderInline(item.answer)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="my-8 flex max-w-[68ch] flex-col">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `inline-faq-panel-${i}`;
        const buttonId = `inline-faq-button-${i}`;

        return (
          <div key={item.question} className="border-t border-secondary/10">
            {/* The question is a real h3 with the button inside it — the
                accordion pattern WAI-ARIA describes. Search engines and AI
                answer engines read a page's questions from its headings, and a
                bare button is not one. Sized here so the `.prose-flex` h3
                scale does not apply. */}
            <h3 className="m-0! font-body text-[15px] leading-snug font-bold">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors duration-300 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span>{renderInline(item.question)}</span>
                <span
                  aria-hidden
                  className={`relative h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-300 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  <span className="absolute top-1/2 left-0 h-[2px] w-3.5 -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-3.5 w-[2px] -translate-x-1/2 bg-current" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-4"
            >
              <p className="font-body text-[15px] leading-[1.75] text-body-text/80">
                {renderInline(item.answer)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
