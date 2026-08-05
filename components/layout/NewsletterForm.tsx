"use client";

import { useState } from "react";

import { FIELD, FOCUS } from "@/components/ui/tokens";

/**
 * Newsletter sign-up in the footer.
 *
 * UI only for now — no backend is wired up yet, per the brief, so submitting
 * just acknowledges locally. The field previously set `outline-none` with no
 * replacement, leaving it invisible to keyboard users; it now takes the site's
 * focus ring like everything else.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="flex flex-wrap gap-2">
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
          className={`${FIELD} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-[10px] bg-primary-strong px-5 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
        >
          Subscribe
        </button>
      </div>

      <p aria-live="polite" className="mt-2 font-body text-[13px] text-primary">
        {submitted ? "Thanks for subscribing." : ""}
      </p>
    </form>
  );
}
