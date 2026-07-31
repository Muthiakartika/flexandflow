"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

/** Service options, in the same order as the WordPress select. */
const serviceOptions = [
  "Select Services",
  "Sport Massage",
  "Lymphatic Drainage Massage",
  "Assisted Stretching",
  "Cupping Service",
  "Full Body Relaxing Massage",
];

/* 1px black border, 10px radius, transparent fill; placeholders are lowercase
   in the markup and capitalised by CSS, exactly as on the original. */
const fieldClass =
  "w-full rounded-[var(--radius-1x)] border border-secondary bg-transparent " +
  "p-[var(--input-padding)] font-body text-[16px] text-body-text outline-none " +
  "placeholder:capitalize placeholder:text-body-text/60 focus:border-primary";

/**
 * Contact form — presentation only. The brief defers wiring a backend, so
 * submitting shows a local confirmation instead of posting anywhere. Field names
 * match the original Contact Form 7 setup.
 */
export default function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="your-name" className="sr-only">
            Name
          </label>
          <input
            id="your-name"
            name="your-name"
            type="text"
            required
            maxLength={400}
            autoComplete="name"
            placeholder="name"
            className={`${fieldClass} h-[50px]`}
          />
        </div>

        <div>
          <label htmlFor="your-email" className="sr-only">
            Email
          </label>
          <input
            id="your-email"
            name="your-email"
            type="email"
            required
            maxLength={400}
            autoComplete="email"
            placeholder="email"
            className={`${fieldClass} h-[50px]`}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="service" className="sr-only">
            Service
          </label>
          <select
            id="service"
            name="How"
            defaultValue="Select Services"
            className={`${fieldClass} h-[49px] border-0 py-[10px] pr-[30px] pl-[10px]`}
          >
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="sr-only">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            required
            placeholder="phone number"
            className={`${fieldClass} h-[50px]`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="your-message" className="sr-only">
          Message
        </label>
        <textarea
          id="your-message"
          name="your-message"
          maxLength={2000}
          placeholder="message here"
          className={`${fieldClass} h-[115px] resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" className="capitalize">
          Send Message
        </Button>
        <p aria-live="polite" className="text-[15px] text-primary">
          {sent ? "Thanks — we’ll be in touch shortly." : ""}
        </p>
      </div>
    </form>
  );
}
