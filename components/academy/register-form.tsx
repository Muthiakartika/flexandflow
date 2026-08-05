"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, SeatsBadge } from "@/components/academy/badge";
import { Button, ButtonLink } from "@/components/academy/button";
import { Field, SelectField } from "@/components/academy/field";
import {
  CONTACT,
  formatPrice,
  MAX_SEATS,
  openSessions,
  type Discipline,
} from "@/lib/academy";

/**
 * Registration — onsite only.
 *
 * Per the brief, this form exists for exactly one reason: an onsite course
 * has six seats and they can run out. The online course and the learning
 * pack have unlimited supply, so they are bought straight from
 * /materials/[slug] with nothing to register for. Do not reuse this
 * component there; a registration step in front of an infinite product is
 * friction that buys nothing.
 *
 * The original site split this across a three-step wizard with a seat-hold
 * timer ticking in the browser. A booking is four fields and a date. It is
 * one screen now.
 *
 * ===========================================================================
 * STUB — no payment provider, and nothing is persisted. Submitting validates
 * and shows the confirmed state. The full note on wiring this up properly
 * (server-created charge, webhook-driven confirmation) is in
 * components/ebook-checkout.tsx on the `main` branch and applies unchanged.
 *
 * One addition specific to this form: a seat is a LIMITED resource, so the
 * booking has to be written server-side with a re-check that the session
 * still has room, inside a transaction. Two people on this page right now
 * both see "1 seat left" and both can submit. `seatsLeft` here is a static
 * number from the content model — it never decrements.
 * ===========================================================================
 */
const PAYMENT_METHODS = ["Bank transfer", "Virtual account", "Card"];

const EXPERIENCE_LEVELS = [
  "Complete beginner",
  "Some training, not working yet",
  "Working therapist",
  "Teaching already",
];

type Errors = Partial<
  Record<"name" | "email" | "whatsapp" | "session", string>
>;

export function RegisterForm({ discipline }: { discipline: Discipline }) {
  const open = openSessions(discipline);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [experience, setExperience] = useState("");
  const [sessionId, setSessionId] = useState(open[0]?.id ?? "");
  // Cosmetic: selecting a method changes nothing downstream. See the note above.
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const session = open.find((entry) => entry.id === sessionId);

  if (done && session) {
    return (
      <div className="rounded-surface bg-paper p-8 sm:p-10">
        <Badge>Spot secured</Badge>
        <h2 className="display mt-4 text-4xl">
          See you on {session.longLabel}.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          {discipline.title} · {discipline.onsite.duration} ·{" "}
          {discipline.onsite.schedule} · {session.venue}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Confirmation sent to <span className="font-bold">{email}</span>. We
          will message {whatsapp} on WhatsApp the week before.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/academy/courses/${discipline.slug}`}>
            Back to the course
          </ButtonLink>
          <ButtonLink href={`/academy/materials/${discipline.slug}`} variant="secondary">
            Get the manual now
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (open.length === 0) {
    return (
      <div className="rounded-surface bg-paper p-8 sm:p-10">
        <Badge tone="quiet">Fully booked</Badge>
        <h2 className="display mt-4 text-4xl">
          {discipline.shortTitle} is full for now.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Every scheduled date has sold out. Tell us you want a seat and we
          will message you first when the next quarter opens — cancellations do
          happen, and waitlisted students get them.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={CONTACT.whatsapp}>Join the waitlist</ButtonLink>
          <ButtonLink href={`/academy/materials/${discipline.slug}`} variant="secondary">
            Start with the manual
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form
      className="rounded-surface border border-line p-6 sm:p-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const next: Errors = {};
        if (name.trim().length < 2) next.name = "Please enter your full name.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          next.email = "Enter a valid email address.";
        }
        if (whatsapp.replace(/[^0-9]/g, "").length < 8) {
          next.whatsapp = "Enter a WhatsApp number we can reach you on.";
        }
        if (!session) next.session = "Choose a date.";
        setErrors(next);
        if (Object.keys(next).length === 0) setDone(true);
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="display text-3xl">Secure your spot</h2>
        <p className="display text-3xl">
          {formatPrice(discipline.onsite.price)}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {discipline.title} · {discipline.onsite.duration} · maximum{" "}
        {MAX_SEATS} students
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-bold">Choose your date</legend>
          {errors.session ? (
            <p className="text-xs font-bold text-olive">{errors.session}</p>
          ) : null}
          {open.map((entry) => (
            // `flex-wrap` plus a shrinkable basis on the text column: the
            // seats badge is whitespace-nowrap by design, so without this it
            // sets a ~266px floor on the form's min-content and the page
            // overflows at 320px.
            <label
              key={entry.id}
              className={`flex cursor-pointer flex-wrap items-start gap-x-4 gap-y-3 rounded-surface border-2 p-4 transition-colors ${
                entry.id === sessionId
                  ? "border-olive bg-paper"
                  : "border-line hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name="session"
                value={entry.id}
                checked={entry.id === sessionId}
                onChange={() => setSessionId(entry.id)}
                className="mt-1 size-5 shrink-0 accent-olive"
              />
              <span className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                <span className="font-bold">{entry.longLabel}</span>
                <span className="text-sm text-muted">
                  {entry.quarter} · {entry.venue}
                </span>
              </span>
              <SeatsBadge seatsLeft={entry.seatsLeft} />
            </label>
          ))}
        </fieldset>

        <Field
          id="register-name"
          label="Full name"
          value={name}
          error={errors.name}
          autoComplete="name"
          onChange={setName}
        />
        <Field
          id="register-email"
          label="Email"
          hint="Confirmation and joining details go here."
          type="email"
          value={email}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
          onChange={setEmail}
        />
        <Field
          id="register-whatsapp"
          label="WhatsApp"
          hint="Used only for reminders about your dates."
          value={whatsapp}
          error={errors.whatsapp}
          autoComplete="tel"
          placeholder="+62 800 0000 0000"
          onChange={setWhatsapp}
        />
        <SelectField
          id="register-experience"
          label="Where are you starting from?"
          hint="Optional — it helps the instructor plan the two days."
          value={experience}
          options={EXPERIENCE_LEVELS}
          onChange={setExperience}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-bold">Pay with</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((option) => {
              const selected = option === method;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  aria-pressed={selected}
                  // A real <button>, so it takes --radius-control like the
                  // rest. The date cards above stay on --radius-surface —
                  // they are panels you choose between, not controls.
                  className={`rounded-control border-2 bg-white px-3 py-3 text-xs font-bold transition-colors ${
                    selected
                      ? "border-olive"
                      : "border-line text-muted hover:border-ink"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button type="submit" size="lg" className="flex w-full">
          Pay &amp; secure my spot
        </Button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-faint">
        Payment is not connected yet — submitting shows the confirmed screen so
        the flow can be reviewed end to end. Seats are not actually held until
        this is wired to a server.{" "}
        <Link href="/academy/faq" className="underline underline-offset-4">
          Read the cancellation terms
        </Link>
        .
      </p>
    </form>
  );
}
