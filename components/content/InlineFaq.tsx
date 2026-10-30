"use client";

import { useState } from "react";

import { renderInline } from "./RichText";

/**
 * FAQ accordion embedded in a service/post body ("Learn More About ..."
 * sections). Distinct from the homepage FAQ: body text, olive question
 * colour, plain rows separated by 11px gaps, plus/minus toggle.
 */
export default function InlineFaq({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

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
