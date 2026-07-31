"use client";

import { useState } from "react";

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
    <div className="my-8 flex max-w-[820px] flex-col gap-[11px]">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `inline-faq-panel-${i}`;
        const buttonId = `inline-faq-button-${i}`;

        return (
          <div key={item.question}>
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-[10px] text-left font-body text-[16px] text-primary"
            >
              <span>{item.question}</span>
              <span aria-hidden className="text-[18px] leading-none">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-3"
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
