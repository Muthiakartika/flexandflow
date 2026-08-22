"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  GENERIC_ERROR,
  readBookingView,
  isStaleCode,
  messageForError,
} from "@/components/booking-result/apiMessage";
import { Button } from "@/components/ui/Button";
import { FIELD, FOCUS, H3 } from "@/components/ui/tokens";
import type { BookingView } from "@/lib/booking/types";

type Stage = "idle" | "confirming" | "submitting";

/**
 * Cancelling, in two steps.
 *
 * This page is reached from a link in an email, on a phone, often one-handed.
 * A single button that cancels on the first tap is a booking lost to a
 * mis-press, and the studio only finds out when nobody arrives — so the first
 * press asks, and the second one acts.
 */
export default function CancelBooking({
  booking,
  token,
  whatsappHref,
  onCancelled,
}: {
  booking: BookingView;
  /** The HMAC from the URL; the API route is keyed by it, not by the id. */
  token: string;
  whatsappHref: string;
  onCancelled: (view: BookingView) => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const promptRef = useRef<HTMLDivElement>(null);
  const promptId = useId();
  const reasonId = useId();

  /* The prompt appears below the button that summoned it, so without this the
     keyboard and the screen reader are both left above the question they are
     being asked. */
  useEffect(() => {
    if (stage === "confirming") promptRef.current?.focus();
  }, [stage]);

  async function submit() {
    setStage("submitting");
    setError(null);

    try {
      /* Trailing slash written in. `trailingSlash: true` applies to route
         handlers as much as to pages, so without it this POST spends a 308
         before it reaches the endpoint. */
      const response = await fetch(
        `/api/booking/${encodeURIComponent(token)}/cancel/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        },
      );

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(messageForError(payload));
        setStage("confirming");
        /* The refusal means the server knows something this page does not —
           the cutoff has passed, or somebody cancelled it already. Pull the
           booking again so the state on screen stops being a lie. */
        if (isStaleCode(payload)) router.refresh();
        return;
      }

      const cancelled = readBookingView(payload);
      if (!cancelled) {
        setError(GENERIC_ERROR);
        setStage("confirming");
        return;
      }

      onCancelled(cancelled);
    } catch {
      setError(GENERIC_ERROR);
      setStage("confirming");
    }
  }

  return (
    <section>
      <h3 className={H3}>Cancel this booking</h3>
      <p className="mt-2 font-body text-[15px] leading-[1.7] text-body-text/75">
        The time is released for someone else as soon as you confirm, and it
        cannot be taken back.
      </p>

      {stage === "idle" ? (
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            setError(null);
            setStage("confirming");
          }}
        >
          Cancel this booking
        </Button>
      ) : (
        <div
          ref={promptRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={promptId}
          className={`mt-4 rounded-[10px] border border-secondary/20 p-4 ${FOCUS}`}
        >
          <p id={promptId} className="font-body text-[15px] leading-[1.6]">
            Cancel your {booking.serviceTitle} on {booking.dateLabel},{" "}
            {booking.timeLabel}?
          </p>

          <label
            htmlFor={reasonId}
            className="page-label mt-4 block"
          >
            Reason (optional)
          </label>
          <textarea
            id={reasonId}
            name="reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={stage === "submitting"}
            className={`mt-2 ${FIELD}`}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="solid"
              onClick={submit}
              disabled={stage === "submitting"}
            >
              {stage === "submitting"
                ? "Cancelling…"
                : "Yes, cancel this booking"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setError(null);
                setStage("idle");
              }}
              disabled={stage === "submitting"}
            >
              Keep my booking
            </Button>
          </div>
        </div>
      )}

      {/* Present from first render so it has something to announce into. */}
      <div aria-live="polite">
        {stage === "confirming" && !error ? (
          <p className="sr-only">
            Confirm that you want to cancel this booking.
          </p>
        ) : null}
        {stage === "submitting" ? (
          <p className="sr-only">Cancelling your booking.</p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-[10px] border border-secondary/20 p-4 font-body text-[14px] leading-[1.7]">
            {error}{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary ${FOCUS}`}
            >
              Message us on WhatsApp
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
