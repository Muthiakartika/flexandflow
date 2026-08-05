"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { FIELD } from "@/components/ui/tokens";

/** Service options, in the same order as the WordPress select. */
const serviceOptions = [
  "Select Services",
  "Sport Massage",
  "Lymphatic Drainage Massage",
  "Assisted Stretching",
  "Cupping Service",
  "Full Body Relaxing Massage",
];

/**
 * Contact form — presentation only. The brief defers wiring a backend, so
 * submitting shows a local confirmation instead of posting anywhere. Field
 * names match the original Contact Form 7 setup.
 *
 * Fields are labelled visibly rather than by placeholder alone: the original
 * relied on placeholders, which vanish as soon as anyone types.
 */
export default function ContactForm() {
  const [sent, setSent] = useState(false);

  const label = "page-label mb-1.5 block";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="your-name" className={label}>
            Name
          </label>
          <input
            id="your-name"
            name="your-name"
            type="text"
            required
            maxLength={400}
            autoComplete="name"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="your-email" className={label}>
            Email
          </label>
          <input
            id="your-email"
            name="your-email"
            type="email"
            required
            maxLength={400}
            autoComplete="email"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="service" className={label}>
            Service
          </label>
          <select
            id="service"
            name="How"
            defaultValue="Select Services"
            className={FIELD}
          >
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="your-message" className={label}>
          Message
        </label>
        <textarea
          id="your-message"
          name="your-message"
          maxLength={2000}
          rows={4}
          className={`${FIELD} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid">
          Send Message
        </Button>
        <p aria-live="polite" className="font-body text-[14px] text-primary">
          {sent ? "Thanks — we’ll be in touch shortly." : ""}
        </p>
      </div>
    </form>
  );
}
