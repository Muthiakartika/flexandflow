"use client";

import { useState } from "react";

/**
 * Newsletter sign-up. Measured off the original: a 52px transparent pill with a
 * 1px rule, and the Subscribe button pinned flush to its right edge at the same
 * height (the field reserves 128px of right padding for it).
 *
 * UI only for now — no backend is wired up yet, per the brief, so submitting
 * just acknowledges locally.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="relative">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="h-[52px] w-full rounded-[30px] border border-secondary bg-transparent pr-[128px] pl-5 font-body text-[16px] text-body-text outline-none placeholder:text-subtle"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 rounded-[50px] border-[3px] border-primary bg-white px-[33px] font-body text-[16px] text-primary transition-colors duration-300 hover:bg-primary hover:text-white"
        >
          Subscribe
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {submitted ? "Thanks for subscribing." : ""}
      </p>
    </form>
  );
}
