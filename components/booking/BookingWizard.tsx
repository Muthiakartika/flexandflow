"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { H2 } from "@/components/ui/tokens";
import { studioMonthKey } from "@/lib/booking/time";
import type { StaffOption, StaffSelection } from "@/lib/booking/types";

import DateTimeStep from "./DateTimeStep";
import PaymentModal from "./PaymentModal";
import DetailsStep, { validateDetails } from "./DetailsStep";
import {
  RescheduleBanner,
  RescheduleBlocked,
  RescheduleConfirm,
  blockedReason,
  managePath,
} from "./Reschedule";
import ServiceStep from "./ServiceStep";
import StaffStep from "./StaffStep";
import Stepper from "./Stepper";
import SummaryStep from "./SummaryStep";
import {
  BookingApiError,
  createBooking,
  manageTokenOf,
  type CreateBookingBody,
  fetchAvailability,
  fetchBooking,
  fetchServices,
  fetchSlots,
  fetchStaff,
  rescheduleBooking,
  useEvent,
  useResource,
} from "./useBookingApi";
import {
  RESCHEDULE_STEPS,
  STEPS,
  canVisit,
  clearDraft,
  furthestStep,
  initialState,
  isStepComplete,
  loadDraft,
  parseStep,
  reducer,
  saveDraft,
  staffParam,
  stepIndex,
  stepLabel,
  type StepId,
} from "./state";

/* The one failure with a recovery rather than a message: someone else took the
   time between the list loading and Confirm being pressed. */
const SLOT_LOST_NOTICE =
  "That time was taken while you were confirming it. Here are the times still " +
  "open on that day.";

/* Closing the payment modal does not undo anything: the booking is saved and
   the slot is held. Said plainly, with a way back to the same charge. */
const PAYMENT_DISMISSED_NOTICE =
  "Your booking is saved and your time is held, but it has not been paid for " +
  "yet. You can pick up where you left off below.";

/**
 * The five-step wizard — and, from a manage link, the two-step one.
 *
 * Three things drive everything below:
 *
 * 1. **The step lives in the URL.** `?step=service` is the single source of
 *    truth for which panel is showing, so the browser's Back button walks the
 *    wizard instead of leaving the page halfway through — which is what it did
 *    on the WordPress flow, and what visitors expect it to do.
 * 2. **The draft lives in `sessionStorage`.** A refresh, a tab restore or a
 *    misfired gesture should not empty a form somebody has just filled in.
 *    The draft is dropped the moment a booking succeeds so a second visit
 *    starts clean.
 * 3. **The server decides.** Availability, prices and validity all come back
 *    from the API; nothing here recomputes them. `SLOT_TAKEN` is the one
 *    failure with a specific answer — someone else took the time between the
 *    slot list loading and Confirm being pressed — so it sends the visitor
 *    back to the day with the list refetched rather than showing a dead end.
 *
 * **Paying now.** When the gateway is configured, the summary step asks how
 * they would like to pay. `AT_STUDIO` behaves exactly as it always has —
 * booked, confirmed, off to the confirmation page. `ONLINE` saves the booking
 * in the same request and gets a charge back with it, and then the wizard
 * *stops*: it does not navigate, and its Back and Confirm buttons are removed,
 * because the booking now exists and there is nothing left here to change. The
 * modal takes over, and what it is waiting for is the server's word that the
 * money arrived — not the browser's. See `PaymentModal`.
 *
 * **Reschedule mode.** `/booking/?reschedule=<manageToken>` is where the manage
 * page's "Choose a new time" leads. The booking behind that token is fetched
 * once on arrival and the flow shrinks to the two steps that are still open
 * questions: a new time, and confirming the move. The therapist and the
 * treatment are not asked again — it is the same session — and the two ids the
 * availability and slot endpoints are keyed by come from the booking rather
 * than from steps 1 and 2. Confirm posts to the booking's own reschedule
 * endpoint, never to `POST /api/booking/`, so the reference, the price and the
 * therapist all survive the move.
 */
export default function BookingWizard({
  cancelCutoffHours,
  preselectedStaff = null,
  paymentsEnabled = false,
}: {
  cancelCutoffHours: number;
  /** Resolved on the server from `?staff=<slug>`; null on an ordinary visit. */
  preselectedStaff?: StaffOption | null;
  /**
   * Whether paying online can be offered. Decided on the server, because a
   * client component reading `process.env` reads what the build baked in — and
   * **defaulting to false**, so a page that never passes it cannot put a
   * visitor in front of a payment that would fail.
   */
  paymentsEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* The manage token, when this is a reschedule. Read from the URL rather than
     from state so the step in the query string is parsed against the right
     list of steps on the very first render, before the booking has arrived. */
  const urlToken = searchParams.get("reschedule") || null;

  /* A "Book with Ginny" link answered step one before the visitor arrived, so
     the wizard opens on the treatment. The therapist is resolved by the page,
     on the server, and arrives as a prop — a reschedule ignores it, because
     there the therapist is not a question at all. */
  const preselected = urlToken ? null : preselectedStaff;

  /* Past the staff step from the very first render when a link already named
     the therapist, so that step never paints and then disappears. */
  const openingStep: StepId = urlToken
    ? RESCHEDULE_STEPS[0]
    : preselected
      ? "service"
      : STEPS[0];

  const [state, dispatch] = useReducer(
    reducer,
    openingStep,
    /* The month the calendar opens on is the studio's current month, read
       through the timezone helper — the browser may well be somewhere else. */
    (step) => initialState(step, studioMonthKey(new Date()), preselected),
  );

  /* A token the manage endpoint has already refused is not one to wait on
     again: the Back button can return to the broken link, and the answer is not
     going to change within this visit. */
  const token = urlToken === state.rescheduleFailed ? null : urlToken;
  const steps: readonly StepId[] = token ? RESCHEDULE_STEPS : STEPS;
  /* A URL that names no step opens where this visit opens, which is not always
     the first step: `?staff=ginny` starts on the treatment. Defaulting to
     `STEPS[0]` here instead would let the clamping effect below drag the
     wizard straight back to the question the link had already answered. */
  const stepParam = searchParams.get("step");
  const urlStep = stepParam ? parseStep(stepParam, steps) : openingStep;

  const moving = state.reschedule;
  const restored = useRef(false);

  /* Restoring in an effect rather than in the reducer's initialiser: this
     component is server-rendered too, and reading `sessionStorage` during that
     render would either throw or hydrate into different markup. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const draft = loadDraft(token);
    /* No draft: the opening state already carries whatever the link chose. */
    if (!draft) return;

    if (preselected && draft.staff !== preselected.id) {
      /* A half-finished booking in this tab chose somebody else. The link is
         the more recent statement of intent, so it wins — and because a
         different therapist means a different tier, the treatment and time the
         draft was holding cannot survive the swap. `chooseStaff` is what clears
         them; the details the visitor already typed are kept. */
      dispatch({ type: "restore", draft: { ...draft, step: "service" } });
      dispatch({
        type: "chooseStaff",
        staff: preselected.id,
        option: preselected,
      });
      return;
    }

    dispatch({ type: "restore", draft: { ...draft, step: urlStep } });
  }, [urlStep, token, preselected]);

  useEffect(() => {
    if (restored.current) saveDraft(state);
  }, [state]);

  // ── Navigation ─────────────────────────────────────────────────────────

  /* A reschedule carries its token through every step, or the next navigation
     would land on an empty new booking. */
  const hrefFor = useCallback(
    (step: StepId) =>
      token
        ? `/booking/?reschedule=${encodeURIComponent(token)}&step=${step}`
        : `/booking/?step=${step}`,
    [token],
  );

  const goTo = useCallback(
    (step: StepId) => {
      router.push(hrefFor(step), { scroll: false });
    },
    [router, hrefFor],
  );

  /* The URL is authoritative, but it can name a step the answers do not
     support — a pasted link, or Back after clearing an earlier choice. Clamp
     with `replace` so the impossible step does not stay in the history. */
  useEffect(() => {
    if (!restored.current) return;
    /* Which steps exist is not settled until the booking behind the token has
       answered, and clamping against the wrong list would rewrite the URL to a
       step this flow does not have. */
    if (token !== null && moving === null) return;

    const limit = furthestStep(state);
    if (stepIndex(urlStep, steps) > stepIndex(limit, steps)) {
      router.replace(hrefFor(limit), { scroll: false });
      return;
    }
    if (urlStep !== state.step) dispatch({ type: "goto", step: urlStep });
  }, [urlStep, steps, state, token, moving, router, hrefFor]);

  const currentIndex = stepIndex(state.step, steps);
  const nextStep = steps[currentIndex + 1];
  const previousStep = steps[currentIndex - 1];

  // ── The booking being moved ────────────────────────────────────────────

  const existing = useResource(token ? `booking:${token}` : null, (signal) =>
    fetchBooking(token ?? "", signal),
  );

  /* Seeded once per token. The reducer holds the booking from here on, so a
     re-render — or the request settling again after a Back — cannot overwrite
     a day and time the visitor has since chosen. */
  const seeded = useRef<string | null>(null);

  useEffect(() => {
    if (token === null || seeded.current === token) return;

    if (existing.data) {
      seeded.current = token;
      dispatch({
        type: "startReschedule",
        token,
        booking: existing.data,
        /* Open the calendar on the month the session is in today: whoever is
           moving it is usually moving it by a day or two. */
        month: studioMonthKey(new Date(existing.data.startAt)),
        blocked: blockedReason(existing.data, cancelCutoffHours),
      });
      return;
    }

    if (existing.error) {
      /* An expired, edited or forged token. The visitor still came here to
         book something, so this becomes an ordinary new booking with a line
         saying what happened, and the dead parameter leaves the URL so a
         refresh does not retry it. */
      seeded.current = token;
      dispatch({
        type: "rescheduleUnavailable",
        token,
        notice:
          "We could not open that reschedule link — it may have expired, or " +
          "the booking may already have been changed. You can make a new " +
          "booking here, or message us on WhatsApp to move the existing one.",
        draft: loadDraft(),
      });
      router.replace("/booking/?step=staff", { scroll: false });
    }
  }, [token, existing.data, existing.error, cancelCutoffHours, router]);

  // ── Data ───────────────────────────────────────────────────────────────

  /* Neither list is a question in a reschedule, so neither is requested. */
  const staff = useResource(moving ? null : "staff", (signal) =>
    fetchStaff(signal),
  );

  const catalogueKey =
    moving || state.staff === null ? null : `services:${state.staff}`;
  const catalogue = useResource(catalogueKey, (signal) =>
    fetchServices(staffParam(state.staff), signal),
  );

  /* Availability and slots are asked for by therapist and variant. A new
     booking answers both in steps 1 and 2; a reschedule takes them from the
     booking, which is the only place they can honestly come from — a service
     slug names neither the duration nor the tier, and guessing the variant
     would offer times for a session the customer did not buy. */
  const apiStaff: StaffSelection | null = moving
    ? moving.booking.therapistId
    : state.staff;
  const apiVariantId = moving
    ? moving.booking.variantId
    : (state.variant?.id ?? null);
  const askable =
    apiStaff !== null && apiVariantId !== null && !moving?.blocked;

  const availabilityKey = askable
    ? `availability:${apiStaff}:${apiVariantId}:${state.month}:${state.slotsToken}`
    : null;
  const availability = useResource(availabilityKey, (signal) =>
    fetchAvailability(
      staffParam(apiStaff),
      apiVariantId ?? "",
      state.month,
      signal,
    ),
  );

  const slotsKey =
    askable && state.date !== null
      ? `slots:${apiStaff}:${apiVariantId}:${state.date}:${state.slotsToken}`
      : null;
  const slots = useResource(slotsKey, (signal) =>
    fetchSlots(
      staffParam(apiStaff),
      apiVariantId ?? "",
      state.date ?? "",
      signal,
    ),
  );

  // ── Advancing ──────────────────────────────────────────────────────────

  /* Blur validates the whole draft — `customerSchema` is the only definition
     of valid — but only the field just left keeps its message. Otherwise
     leaving the first name would light up a phone error nobody has had a
     chance to answer yet. */
  const blurField = useEvent((field: string) => {
    const found = validateDetails(state.details);
    const errors = { ...state.errors };
    if (found[field]) errors[field] = found[field];
    else delete errors[field];
    dispatch({ type: "setErrors", errors });
  });

  const advance = useEvent(() => {
    if (state.step === "details") {
      const errors = validateDetails(state.details);
      if (Object.keys(errors).length > 0) {
        dispatch({ type: "setErrors", errors });
        return;
      }
    }
    if (nextStep) goTo(nextStep);
  });

  /** The move. Only the new start is sent; everything else is the server's. */
  const submitReschedule = async () => {
    if (!moving || moving.blocked || !state.slot) return;

    dispatch({ type: "submitStart" });

    try {
      const booking = await rescheduleBooking(moving.token, state.slot.startAt);
      clearDraft(moving.token);
      router.push(`/booking/confirmation/${booking.reference}/`);
    } catch (cause) {
      if (!(cause instanceof BookingApiError)) {
        dispatch({
          type: "submitFailed",
          notice:
            cause instanceof Error
              ? cause.message
              : "We could not move that booking. Please try again.",
        });
        return;
      }

      /* `SLOT_INVALID` is what the reschedule endpoint answers when the time
         it was handed is no longer a bookable one, which in practice is the
         same event as `SLOT_TAKEN`: refetch the day and let them choose again. */
      if (cause.code === "SLOT_TAKEN" || cause.code === "SLOT_INVALID") {
        dispatch({ type: "slotLost", notice: SLOT_LOST_NOTICE });
        goTo("datetime");
        return;
      }

      /* The two the visitor cannot recover from by trying again. */
      if (cause.code === "CUTOFF_PASSED" || cause.code === "ALREADY_CANCELLED") {
        dispatch({ type: "rescheduleBlocked", message: cause.message });
        return;
      }

      dispatch({ type: "submitFailed", notice: cause.message });
    }
  };

  const submitNew = async () => {
    if (!state.variant || !state.slot || state.staff === null) return;

    const errors = validateDetails(state.details);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "setErrors", errors });
      goTo("details");
      return;
    }

    /* Only offer to pay online when the page said the gateway is configured.
       A stale draft could still be carrying `ONLINE` from a visit made while
       it was, and posting that would open a charge nobody can complete. */
    const online = paymentsEnabled && state.paymentMethod === "ONLINE";

    const payload: CreateBookingBody = {
      staff: state.staff,
      variantId: state.variant.id,
      startAt: state.slot.startAt,
      customer: {
        firstName: state.details.firstName.trim(),
        lastName: state.details.lastName.trim() || null,
        email: state.details.email.trim() || null,
        phoneE164: state.details.phoneE164,
        note: state.details.note.trim() || null,
      },
      paymentMethod: online ? "ONLINE" : "AT_STUDIO",
      website: state.details.website,
    };

    dispatch({ type: "submitStart" });

    try {
      const created = await createBooking(payload);
      /* The booking exists either way, so the half-filled form must not: a
         restored draft here is how somebody books the same session twice. */
      clearDraft();

      if (created.payment) {
        /* Pay-now. Nothing is confirmed until the gateway's callback says so,
           so the wizard stays where it is and the modal takes over — see
           `PaymentModal`, which reads that decision rather than making it. */
        dispatch({
          type: "paymentOpened",
          token: manageTokenOf(created.booking),
          reference: created.reference,
          due: created.payment,
        });
        return;
      }

      router.push(`/booking/confirmation/${created.reference}/`);
    } catch (cause) {
      if (cause instanceof BookingApiError && cause.code === "SLOT_TAKEN") {
        /* Usually a stranger got there first. Sometimes the clash is the
           visitor's own unpaid hold — they opened a payment, closed the modal,
           and started over — and then the server sends back what is needed to
           finish that one. Telling them the time is gone would be false: it is
           being held for them, by them. */
        dispatch({
          type: "slotLost",
          notice: cause.resume
            ? cause.message
            : "That time was taken while you were filling in your details. " +
              "Here are the times still open on that day.",
          resume: cause.resume,
        });
        goTo("datetime");
        return;
      }

      if (cause instanceof BookingApiError && cause.code === "VALIDATION") {
        /* The API keys its field errors by the path it validated, so the
           customer's own fields arrive as `customer.firstName`. */
        const fields: Record<string, string> = {};
        for (const [path, message] of Object.entries(cause.fields)) {
          fields[path.replace(/^customer\./, "")] = message;
        }
        dispatch({ type: "submitFailed", notice: cause.message, errors: fields });
        goTo("details");
        return;
      }

      dispatch({
        type: "submitFailed",
        notice:
          cause instanceof Error
            ? cause.message
            : "We could not save that booking. Please try again.",
      });
    }
  };

  /*
   * Put the visitor back in front of a hold they already own.
   *
   * Nothing is requested here. The modal is the thing that opens charges, and
   * every check that matters lives in `POST …/payment`, which it calls once a
   * rail is picked: that route refuses anything but a live `AWAITING_PAYMENT`
   * hold, so a lapsed one cannot be resumed into a slot somebody else now has.
   * Opening a charge from this button instead would raise one on whichever
   * rail happened to be first — the thing this flow was just rid of.
   */
  const resumeHeld = useEvent(() => {
    const held = state.resume;
    if (!held) return;

    dispatch({
      type: "paymentOpened",
      token: held.manageToken,
      reference: held.reference,
      /* Straight from the hold, which has carried both figures since it was
         made. No charge is opened: resuming lands on the same chooser a new
         booking does, so somebody coming back is not handed the rail they
         happened to be looking at when they left. */
      due: { amountIdr: held.amountIdr, holdExpiresAt: held.holdExpiresAt },
    });
  });

  const submit = useEvent(() =>
    moving ? submitReschedule() : submitNew(),
  );

  // ── Render ─────────────────────────────────────────────────────────────

  /* The booking has not arrived yet. A failed request does not stop here — it
     turns this into a new booking, above, and re-renders without the token. */
  if (token && !moving) {
    return (
      <p className="font-body text-[15px] text-body-text/60">
        Loading your booking…
      </p>
    );
  }

  if (moving?.blocked) {
    return (
      <div className="flex flex-col gap-[clamp(1.5rem,3vw,2.25rem)]">
        <RescheduleBanner booking={moving.booking} canPick={false} />
        <RescheduleBlocked booking={moving.booking} message={moving.blocked} />
      </div>
    );
  }

  const canAdvance =
    state.step === "summary" ? false : isStepComplete(state, state.step);

  const heading = stepLabel(state.step, moving !== null);

  const payingOnline = paymentsEnabled && state.paymentMethod === "ONLINE";

  const confirmLabel = moving
    ? state.submitting
      ? "Moving…"
      : "Confirm new time"
    : state.submitting
      ? payingOnline
        ? "Opening payment…"
        : "Confirming…"
      : payingOnline
        ? "Continue to payment"
        : "Confirm booking";

  return (
    <div className="flex flex-col gap-[clamp(1.5rem,3vw,2.25rem)]">
      {moving ? (
        <RescheduleBanner booking={moving.booking} canPick />
      ) : null}

      <Stepper
        steps={steps}
        label={(step) => stepLabel(step, moving !== null)}
        current={state.step}
        furthest={furthestStep(state)}
        onGo={(step) => {
          if (canVisit(state, step)) goTo(step);
        }}
      />

      {/* Announces the step change without moving focus, so a keyboard user
          is told where they are without being thrown to the top of the page. */}
      <p aria-live="polite" className="sr-only">
        {`Step ${currentIndex + 1} of ${steps.length}: ${heading}`}
      </p>

      <div>
        <h2 className={H2}>{heading}</h2>

        <div className="mt-5">
          {state.notice ? (
            <div
              role="status"
              className="mb-5 rounded-[10px] border border-primary/35 bg-white px-4 py-3"
            >
              <p className="font-body text-[14px] leading-[1.6]">
                {state.notice}
              </p>

              {/* The charge is still open, so this puts the same one back
                  rather than starting a second one for the same booking. */}
              {state.payment && !state.payment.open ? (
                <Button
                  type="button"
                  variant="solid"
                  className="mt-3"
                  onClick={() => dispatch({ type: "paymentReopened" })}
                >
                  Show payment again
                </Button>
              ) : null}

              {/* Their own hold, from a payment they walked away from. This
                  opens a new charge against that same booking — see
                  `resumeHeld` — so nobody ends up with two. */}
              {state.resume && !state.payment ? (
                <Button
                  type="button"
                  variant="solid"
                  className="mt-3"
                  onClick={resumeHeld}
                >
                  Continue that payment
                </Button>
              ) : null}
            </div>
          ) : null}

          {state.step === "staff" ? (
            <StaffStep
              staff={state.staff}
              options={staff.data ?? []}
              loading={staff.loading}
              error={staff.error}
              onChoose={(selection, option) =>
                dispatch({ type: "chooseStaff", staff: selection, option })
              }
            />
          ) : null}

          {state.step === "service" ? (
            <ServiceStep
              catalogue={catalogue.data}
              category={state.category}
              variantId={state.variant?.id ?? null}
              loading={catalogue.loading}
              error={catalogue.error}
              onCategory={(category) =>
                dispatch({ type: "chooseCategory", category })
              }
              onChoose={(variant) => dispatch({ type: "chooseVariant", variant })}
            />
          ) : null}

          {state.step === "datetime" ? (
            <DateTimeStep
              month={state.month}
              availability={availability.data}
              availabilityLoading={availability.loading}
              availabilityError={availability.error}
              date={state.date}
              groups={slots.data}
              slotsLoading={slots.loading}
              slotsError={slots.error}
              slot={state.slot}
              onMonth={(month) => dispatch({ type: "chooseMonth", month })}
              onDate={(date) => dispatch({ type: "chooseDate", date })}
              onSlot={(slot) => dispatch({ type: "chooseSlot", slot })}
            />
          ) : null}

          {state.step === "details" ? (
            <DetailsStep
              details={state.details}
              errors={state.errors}
              onField={(field, value) =>
                dispatch({ type: "setDetail", field, value })
              }
              onPhone={(country, national, e164) =>
                dispatch({ type: "setPhone", country, national, e164 })
              }
              onBlurField={blurField}
            />
          ) : null}

          {state.step === "summary" && moving && state.slot ? (
            <RescheduleConfirm
              booking={moving.booking}
              slot={state.slot}
              cancelCutoffHours={cancelCutoffHours}
            />
          ) : null}

          {state.step === "summary" &&
          !moving &&
          state.variant &&
          state.slot &&
          state.staff ? (
            <SummaryStep
              staff={state.staff}
              staffOption={state.staffOption}
              variant={state.variant}
              slot={state.slot}
              details={state.details}
              cancelCutoffHours={cancelCutoffHours}
              paymentsEnabled={paymentsEnabled}
              paymentMethod={state.paymentMethod}
              onPaymentMethod={(method) =>
                dispatch({ type: "choosePaymentMethod", method })
              }
              disabled={state.submitting}
            />
          ) : null}
        </div>

        {/* Once a booking has been saved and is waiting to be paid for, the
            wizard's own controls go away entirely — not disabled, removed.
            Stepping back would be editing a booking that already exists, and
            Confirm would make a second one. Paying is the only thing left to
            do, and it lives in the modal or in the notice above. */}
        {state.payment ? null : (
        <div className="booking-actions mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-secondary/10 pt-5">
          {previousStep ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(previousStep)}
            >
              Back
            </Button>
          ) : moving ? (
            /* The first step of a reschedule has nowhere back inside the
               wizard, so it goes back where the visitor came from. */
            <ButtonLink href={managePath(moving.booking)} variant="outline">
              Back to your booking
            </ButtonLink>
          ) : (
            <span />
          )}

          {state.step === "summary" ? (
            <Button
              type="button"
              variant="solid"
              onClick={() => void submit()}
              disabled={state.submitting}
            >
              {confirmLabel}
            </Button>
          ) : (
            <Button
              type="button"
              variant="solid"
              onClick={advance}
              disabled={!canAdvance}
            >
              Continue
            </Button>
          )}
        </div>
        )}
      </div>

      {state.payment?.open ? (
        <PaymentModal
          token={state.payment.token}
          reference={state.payment.reference}
          due={state.payment.due}
          intent={state.payment.intent}
          /* The details the visitor typed two steps ago. Xendit needs a name
             and contact details with a card, and asking again for something
             already on the booking is how a payment form loses people. */
          cardHolder={{
            firstName: state.details.firstName,
            lastName: state.details.lastName,
            email: state.details.email,
            phoneE164: state.details.phoneE164,
          }}
          onPaid={(reference) =>
            router.push(`/booking/confirmation/${reference}/`)
          }
          onClose={() =>
            dispatch({
              type: "paymentDismissed",
              notice: PAYMENT_DISMISSED_NOTICE,
            })
          }
        />
      ) : null}
    </div>
  );
}
