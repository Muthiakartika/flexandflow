"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/academy/button";
import { Field } from "@/components/academy/field";
import {
  formatDuration,
  formatPrice,
  lessonCount,
  totalMinutes,
  type Discipline,
} from "@/lib/academy";

/**
 * Buy-and-download for the two things with unlimited supply: the online
 * course and the learning pack on its own.
 *
 * Deliberately NOT a registration form. Per the brief, registration exists
 * only for onsite courses, because only they can sell out. Here the entire
 * transaction is an email address and a payment method — asking for a
 * WhatsApp number and an experience level, as the onsite form does, would be
 * collecting data that nothing downstream uses.
 *
 * ===========================================================================
 * STUB — two separate things are still missing, and they are independent.
 *
 * 1. PAYMENT. `method` below is presentation only: it highlights the chosen
 *    tile and is never read again. Submitting flips `paid` to true, so the
 *    delivered state is reachable without paying.
 *
 *    The charge has to be created on the SERVER — a client component can
 *    never be trusted to assert "this was paid". Post to a Route Handler that
 *    creates the charge with the provider's secret key, redirect to the
 *    payment URL it returns, and let the provider's webhook mark the order
 *    paid. `paid` then stops being local state and becomes a fact read from
 *    the order record.
 *
 * 2. DELIVERY. The download button has no handler — nothing to serve yet.
 *    When there is, the PDF must NOT go in /public: everything there is
 *    readable by anyone who knows the path, so the manual would be free to
 *    whoever guesses or shares the URL. Serve it from a Route Handler that
 *    looks up the order first, or from object storage behind a signed URL
 *    that expires.
 *
 * The long-form version of this note lives in components/ebook-checkout.tsx
 * on the `main` branch.
 * ===========================================================================
 */
const PAYMENT_METHODS = ["Bank transfer", "Virtual account", "Card"];

type Product = "course" | "pack";

export function MaterialsCheckout({ discipline }: { discipline: Discipline }) {
  const [product, setProduct] = useState<Product>("course");
  const [email, setEmail] = useState("");
  // Cosmetic until the gateway exists: nothing downstream reads `method`.
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [error, setError] = useState<string | undefined>();
  // Stands in for the real order record. Once the webhook exists this becomes
  // a prop, not something the browser gets to decide.
  const [paid, setPaid] = useState(false);

  const price =
    product === "course" ? discipline.online.price : discipline.ebook.price;

  if (paid) {
    return (
      <div className="rounded-surface bg-paper p-8 sm:p-10">
        <p className="eyebrow">Payment received</p>
        <h2 className="display mt-2 text-4xl">
          {product === "course"
            ? "Your course is unlocked."
            : "Your manual is ready."}
        </h2>

        {/* Dead button on purpose — see DELIVERY above. Give it an href once a
            real file exists, e.g.
              <ButtonLink href={`/api/materials/${discipline.slug}/download`}>
            with that Route Handler checking the order and streaming the PDF
            back under a Content-Disposition: attachment header. */}
        <Button type="button" size="lg" className="mt-6 flex w-full sm:w-fit">
          {product === "course"
            ? "Open the first module"
            : `Download the ${discipline.ebook.pages}-page PDF`}
        </Button>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          We have emailed the link to <span className="font-bold">{email}</span>{" "}
          as well, so you can get back to it at any time.
        </p>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-sm leading-relaxed text-muted">
            Want your hands corrected? The onsite course covers the same
            modules over two days, capped at six students — and this purchase
            counts towards the fee.
          </p>
          <ButtonLink
            href={`/academy/register/${discipline.slug}`}
            variant="secondary"
            className="mt-4"
          >
            See onsite dates
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError("Enter a valid email — this is where the material goes.");
          return;
        }
        setError(undefined);
        // Shortcut standing in for the whole server round trip described above.
        setPaid(true);
      }}
    >
      <h2 className="display text-3xl">Buy and start now</h2>
      <p className="mt-1 text-sm text-muted">
        No registration needed — these are available immediately after payment.
      </p>

      <fieldset className="mt-8 flex flex-col gap-3">
        <legend className="text-sm font-bold">What would you like?</legend>
        {(
          [
            {
              id: "course" as const,
              name: "Online course",
              meta: `${formatDuration(totalMinutes(discipline))} · ${lessonCount(discipline)} lessons · includes the manual`,
              price: discipline.online.price,
            },
            {
              id: "pack" as const,
              name: "Learning pack only",
              meta: `${discipline.ebook.pages}-page PDF manual`,
              price: discipline.ebook.price,
            },
          ]
        ).map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer flex-wrap items-start gap-x-4 gap-y-2 rounded-surface border-2 p-4 transition-colors ${
              option.id === product
                ? "border-olive bg-paper"
                : "border-line hover:border-ink"
            }`}
          >
            <input
              type="radio"
              name="product"
              value={option.id}
              checked={option.id === product}
              onChange={() => setProduct(option.id)}
              className="mt-1 size-5 shrink-0 accent-olive"
            />
            <span className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
              <span className="font-bold">{option.name}</span>
              <span className="text-sm text-muted">{option.meta}</span>
            </span>
            <span className="font-bold whitespace-nowrap">
              {formatPrice(option.price)}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-6 flex flex-col gap-5">
        <Field
          id="materials-email"
          label="Email"
          hint="We send the material here."
          type="email"
          value={email}
          error={error}
          autoComplete="email"
          placeholder="you@example.com"
          onChange={setEmail}
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
                  // A real <button>, so it takes --radius-control. The
                  // product cards above stay on --radius-surface.
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

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5">
          <span className="text-base font-bold">Total</span>
          <span className="display text-3xl">{formatPrice(price)}</span>
        </div>

        <Button type="submit" size="lg" className="flex w-full">
          Pay &amp; download
        </Button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-faint">
        Payment is not connected yet — submitting shows the post-purchase state
        so the flow can be reviewed end to end.
      </p>
    </form>
  );
}
