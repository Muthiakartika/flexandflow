"use client";

import { useState } from "react";

export type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
  /** Index open on first render; the original starts fully collapsed. */
  defaultOpen?: number | null;
  className?: string;
};

/**
 * FAQ accordion: pale rounded rows with the question in the display face and a
 * `+` that rotates into a `×` when open, matching the theme.
 */
export default function Accordion({
  items,
  defaultOpen = null,
  className = "",
}: AccordionProps) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;

        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-[var(--radius-1x)] bg-white/60"
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-display text-[26px] leading-[1.26] text-primary transition-colors duration-300 hover:text-link-hover"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className={`relative h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  <span className="absolute top-1/2 left-0 h-[2px] w-4 -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-4 w-[2px] -translate-x-1/2 bg-current" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-6 pb-5"
            >
              <p className="text-[16px] leading-[1.625] text-body-text">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
