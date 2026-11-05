"use client";

import { useId, useState } from "react";

import { FIELD, FOCUS } from "@/components/ui/tokens";

/**
 * Newsletter sign-up, in the footer and the slide menu.
 *
 * UI only for now — no backend is wired up yet, per the brief, so submitting
 * just acknowledges locally. The field previously set `outline-none` with no
 * replacement, leaving it invisible to keyboard users; it now takes the site's
 * focus ring like everything else.
 *
 * `compact` is the footer's: field and button as pills the height of the
 * booking buttons beside them, on one line, and no note under them (the
 * footer says "No spam" in the line above instead). The field's id is
 * generated, since both forms can be on one page.
 */
export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const id = useId();

  return (
    <form
      className="relative mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className={compact ? "flex gap-2" : "flex flex-wrap gap-2"}>
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          name="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className={
            compact
              ? `${FIELD} h-11 min-w-0 flex-1 rounded-full! py-0`
              : `${FIELD} min-w-0 flex-1`
          }
        />
        <button
          type="submit"
          className={`shrink-0 bg-primary-strong px-5 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS} ${
            compact ? "h-11 rounded-full" : "rounded-[10px]"
          }`}
        >
          Subscribe
        </button>
      </div>

      {compact ? null : (
        <p className="mt-2 font-body text-[13px] text-body-text/55">
          No spam. We hate it more than you do.
        </p>
      )}
      {/* Under the form on the compact one, out of the flow, so the field
          keeps the booking buttons' bottom edge. */}
      <p
        aria-live="polite"
        className={`font-body text-[13px] text-primary ${compact ? "absolute top-full left-0 mt-1" : "mt-1"}`}
      >
        {submitted ? "Thanks for subscribing." : ""}
      </p>
    </form>
  );
}
