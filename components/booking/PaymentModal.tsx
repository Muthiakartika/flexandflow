"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FOCUS, H3 } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/booking/format";
import {
  PAYMENT_CHANNELS,
  PAYMENT_CHANNEL_LABEL,
  PAYMENT_CHANNEL_NOTE,
  isFinished,
  isSettled,
  type PaymentChannelValue,
  type PaymentDue,
  type PaymentIntent,
  type PaymentStatusValue,
} from "@/lib/payments/types";

import CardForm, { CARD_PAYMENTS_AVAILABLE } from "./CardForm";
import QrCode from "./QrCode";
import { fetchPaymentStatus, startPayment, useEvent } from "./useBookingApi";

/**
 * Paying, without leaving the booking page.
 *
 * **This modal never decides anything.** It shows a QR code, a virtual account
 * number or a link, and then it asks our own server, every three seconds,
 * what the *server* thinks happened. A browser reporting its own payment
 * success is not evidence of a payment: anyone can call any endpoint from a
 * console. The only thing that moves a booking to paid is the gateway's
 * callback, arriving server-to-server and verified there. Everything below
 * reads that decision; nothing below makes it.
 *
 * The same fact is what makes closing this modal survivable. If the customer
 * pays and then shuts the tab, the callback still lands, the confirmation is
 * still sent, and `/appointment/confirmation/<reference>/` is still correct when
 * they open it from their email. The modal is a convenience, not the record.
 *
 * Two smaller decisions worth keeping:
 *
 * - **Polling stops when the tab is hidden** and resumes on return, and stops
 *   for good shortly after the charge expires. A booking page left open in a
 *   background tab overnight must not spend the night talking to the server.
 * - **Closing while a payment is pending asks first**, because the booking is
 *   already made and is holding a slot nobody else can take. Dismissing that
 *   by accident is how somebody loses a Saturday morning appointment.
 *
 * The card channel is the one exception to the first paragraph, and only
 * narrowly: `CardForm` collects the card here and gets a synchronous answer
 * from our own server, which has already charged it. Even then the modal is
 * reading a decision made on the server, not making one — and the gateway's
 * callback still arrives afterwards and still settles the payment if this
 * request never came back.
 */

const POLL_INTERVAL_MS = 3000;

/**
 * How long to keep asking after the charge was due to expire.
 *
 * A transfer made in the last few seconds is settled by a callback that
 * arrives a moment later, and stopping dead on the deadline would show
 * "expired" to somebody who had in fact just paid.
 */
const EXPIRY_GRACE_MS = 30_000;

/** Wallet codes as the gateway spells them, written as their owners do. */
const WALLET_LABEL: Record<string, string> = {
  GOPAY: "GoPay",
  OVO: "OVO",
  DANA: "DANA",
  SHOPEEPAY: "ShopeePay",
  LINKAJA: "LinkAja",
  ASTRAPAY: "AstraPay",
};

function walletLabel(key: string): string {
  return WALLET_LABEL[key.toUpperCase()] ?? key;
}

/** `mm:ss`. A duration, not a clock reading — no timezone is involved. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The rails this build can actually collect.
 *
 * Card is dropped when there is no publishable key in the browser: without one
 * `CardForm` cannot tokenise anything, so offering the option would take a
 * customer to a form that fails at the last step. Same rule, same reason, as
 * the whole "pay now" choice disappearing when Xendit is unconfigured.
 */
const CHANNELS = PAYMENT_CHANNELS.filter(
  (channel) => channel !== "CARD" || CARD_PAYMENTS_AVAILABLE,
);

/* `iframe` is in the list because the 3-D Secure challenge is one, and it is
   focusable without carrying a `tabindex` — leaving it out would let the trap
   wrap past the bank's own screen. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), iframe, ' +
  'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ── Small pieces ────────────────────────────────────────────────────────── */

/**
 * Copies a string and says so.
 *
 * A fourteen-digit virtual account number typed by hand into a banking app is
 * the single most likely way for this payment to go to the wrong place.
 */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={`payment-copy ${FOCUS}`}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => setCopied(true))
          /* Denied permission or an insecure origin. The number is on screen
             either way, so there is nothing to explain. */
          .catch(() => undefined);
      }}
    >
      <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
      <span className="sr-only">
        {copied ? `${label} copied` : `Copy ${label}`}
      </span>
    </button>
  );
}

function WalletLinks({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links);
  if (entries.length === 0) return null;

  return (
    <div className="grid gap-2">
      <p className="page-label">Open your wallet app</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([wallet, href]) => (
          <a
            key={wallet}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`payment-wallet ${FOCUS}`}
          >
            {walletLabel(wallet)}
          </a>
        ))}
      </div>
      <p className="payment-hint font-body text-[13px] leading-[1.6]">
        Approve the payment in the app, then come back to this page.
      </p>
    </div>
  );
}

/* ── The modal ───────────────────────────────────────────────────────────── */

export default function PaymentModal({
  token,
  reference,
  due,
  intent: opened,
  cardHolder,
  onPaid,
  onClose,
}: {
  /** The booking's manage token; every payment call is keyed by it. */
  token: string;
  /** Where to send the customer once the server says the money arrived. */
  reference: string;
  /**
   * What the booking owes and how long its slot is held. Known before any rail
   * is chosen, which is what lets this modal open on the chooser.
   */
  due: PaymentDue;
  /**
   * The charge, once there is one. Null on arrival: opening the modal used to
   * raise a QRIS code whether or not the customer wanted QRIS, and picking
   * anything else left that row behind unpaid in the studio's payment table.
   */
  intent: PaymentIntent | null;
  /**
   * Who the booking is for. Passed straight through to the card form, which
   * prefills the name and sends the contact details Xendit requires with a
   * card — the customer has already typed all of this and should not be asked
   * for it twice.
   */
  cardHolder: {
    firstName: string;
    lastName: string;
    email: string;
    phoneE164: string;
  };
  onPaid: (reference: string) => void;
  /** Dismissed without paying. The booking still exists and still holds. */
  onClose: () => void;
}) {
  const [intent, setIntent] = useState<PaymentIntent | null>(opened);
  const [status, setStatus] = useState<PaymentStatusValue>("PENDING");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [confirmingClose, setConfirmingClose] = useState(false);
  /**
   * Raised by `CardForm` while a card is being tokenised, challenged by the
   * bank, or charged.
   *
   * Nothing may dismiss the modal for as long as it is true — not Escape, not
   * a click on the backdrop, not the close button. A 3-D Secure challenge
   * interrupted halfway is a charge in limbo: the bank has been asked, our
   * server has not been told the answer, and the customer is left looking at a
   * booking page with no idea whether they have paid.
   */
  const [cardLocked, setCardLocked] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const settledRef = useRef(false);

  /* Before a rail is picked there is no charge to expire, so the countdown is
     the hold's — which is the real deadline anyway: the charge is deliberately
     the shorter of the two (PAYMENT-PLAN.md, `XENDIT_INVOICE_MINUTES`). */
  const hasCharge = intent !== null;
  const expiresAt = Date.parse(intent?.expiresAt ?? due.holdExpiresAt);
  const remaining = expiresAt - now;
  const expired = status === "EXPIRED" || remaining <= 0;
  const finished = isFinished(status);
  const pending = !finished && !expired;

  /* ── Polling ─────────────────────────────────────────────────────────── */

  /* Both callers write their handlers inline, so they are new functions on
     every render — and this component re-renders once a second for the
     countdown. Pinned, or the interval below would be torn down and restarted
     every tick, which is to say the poll would run once a second. */
  const paid = useEvent(onPaid);

  const poll = useCallback(async () => {
    try {
      const view = await fetchPaymentStatus(token);
      setStatus(view.status);
      setError(null);

      /* The server's answer, not ours. Reaching the confirmation page is the
         only thing this decides, and it decides it from what was written down
         by the gateway's callback. */
      if (isSettled(view.status) && !settledRef.current) {
        settledRef.current = true;
        paid(view.bookingReference || reference);
      }
    } catch {
      /* A dropped request is not news: the next tick asks again, and the
         customer's payment is unaffected by our ability to see it. */
    }
  }, [token, reference, paid]);

  useEffect(() => {
    const track = () => setVisible(document.visibilityState === "visible");
    track();
    document.addEventListener("visibilitychange", track);
    return () => document.removeEventListener("visibilitychange", track);
  }, []);

  useEffect(() => {
    /* Stopped before a rail has been picked — there is no charge to ask about,
       and the endpoint rightly answers 404 for a booking with no payment. Also
       once the answer can no longer change, once the charge is well past its
       deadline, and whenever nobody is looking at the page. */
    if (!hasCharge || finished || !visible) return;
    if (Date.now() > expiresAt + EXPIRY_GRACE_MS) return;

    /* Scheduled rather than looped on an interval, and the first check is a
       zero-delay timer rather than a call in the effect body: each request is
       only queued once the last one has answered, so a slow connection
       produces one outstanding request instead of a growing pile of them. */
    let live = true;
    let timer = 0;

    const tick = async () => {
      await poll();
      if (!live) return;
      /* The deadline is checked here rather than in the dependency list: a
         charge that has run out is one nothing more will happen on, and this
         is what stops the loop instead of leaving it running on a tab
         somebody left open. */
      if (Date.now() > expiresAt + EXPIRY_GRACE_MS) return;
      timer = window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    timer = window.setTimeout(() => void tick(), 0);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [hasCharge, finished, visible, expiresAt, poll]);

  /* One tick a second, for the countdown only — and it stops itself: the tick
     is what eventually makes `expired` true, which is what tears this down.
     A booking page left open in a background tab does not tick forever. */
  useEffect(() => {
    if (finished || expired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [finished, expired]);

  /* ── Focus and keys ──────────────────────────────────────────────────── */

  useEffect(() => {
    const restoreTo = document.activeElement;
    dialogRef.current?.focus();

    /* The page behind must not scroll under the dialog — on a phone that is
       how a modal ends up with its buttons somewhere off the screen. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  }, []);

  const close = useEvent(onClose);

  const requestClose = useCallback(() => {
    /* A card in the middle of being authorised cannot be walked away from —
       see `cardLocked`. Deliberately silent: the card panel already says to
       keep the window open, and a second message racing the bank's own screen
       would only add noise. */
    if (cardLocked) return;

    /* Nothing more is going to happen on this charge, so there is nothing to
       warn about. While it is still payable, ask: the booking is already made
       and is holding a slot nobody else can take. */
    if (pending) setConfirmingClose(true);
    else close();
  }, [cardLocked, pending, close]);

  /**
   * Escape and the focus trap, listened for on the document rather than on the
   * dialog.
   *
   * Focus does leave the dialog on its own: a button that disables itself
   * while a request is in flight hands focus back to `<body>`, and a handler
   * bound to the dialog would then never see another key. Catching keys at the
   * document lets this pull focus back in instead of quietly stopping.
   */
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && root.contains(active);

      if (!inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [requestClose]);

  /* ── Actions ─────────────────────────────────────────────────────────── */

  /**
   * Opens a fresh charge on a rail.
   *
   * Used to switch mid-flow, to start again after one expired, and — with
   * `force` — to replace a card charge the bank refused, which cannot be paid a
   * second time. Re-picking the rail already showing is otherwise a no-op:
   * opening a duplicate charge for somebody who tapped the same button twice
   * would leave two rows and one of them unpaid.
   *
   * The amount is never sent: the server charges what the booking says it costs.
   */
  async function openCharge(
    channel: PaymentChannelValue,
    options: { force?: boolean; quiet?: boolean } = {},
  ): Promise<boolean> {
    if (busy) return false;
    if (!options.force && channel === intent?.channel && !expired && !finished) {
      return false;
    }

    /* `quiet` keeps the card form mounted while its replacement charge is
       opened, so it can show its own line rather than have the whole body
       blink to "Opening…" and back. */
    if (!options.quiet) setBusy(true);
    setError(null);

    try {
      const next = await startPayment(token, channel);
      setIntent(next);
      /* The new charge carries its own deadline; the second-by-second tick
         above keeps `now` current, so there is nothing else to reset. */
      setStatus("PENDING");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not open that payment method. Please try another one.",
      );
      return false;
    } finally {
      if (!options.quiet) setBusy(false);
    }
  }

  /**
   * The card was settled by the request `CardForm` just made.
   *
   * Guarded by the same `settledRef` the poll uses, so whichever of the two
   * learns it first is the only one that navigates.
   */
  const cardPaid = useEvent(() => {
    setStatus("PAID");
    if (settledRef.current) return;
    settledRef.current = true;
    paid(reference);
  });

  /**
   * A refused card, replaced with a charge that can be paid.
   *
   * The old row is spent — Xendit's token is single-use and the server refuses
   * a payment that is no longer `PENDING` — so a second attempt needs a second
   * charge. It is opened only on an explicit press, and only after asking the
   * server whether the first attempt in fact succeeded: a reply that never
   * arrived is not the same as a payment that never happened, and opening a
   * fresh charge over the top of one that worked is how somebody pays twice.
   */
  const renewCard = useEvent(async (): Promise<boolean> => {
    try {
      const view = await fetchPaymentStatus(token);
      if (isSettled(view.status)) {
        setStatus(view.status);
        if (!settledRef.current) {
          settledRef.current = true;
          paid(view.bookingReference || reference);
        }
        return false;
      }
    } catch {
      /* Unreachable server. Opening a charge below will fail in the same way
         and say so properly, so there is nothing useful to add here. */
    }

    return openCharge("CARD", { force: true, quiet: true });
  });

  async function checkAgain() {
    setChecking(true);
    await poll();
    setChecking(false);
  }

  /* ── Announcements ───────────────────────────────────────────────────── */

  /* Coarse on purpose. A screen reader that reads a countdown every second
     reads nothing else, so the live region changes once a minute and then
     once more as the last minute starts. */
  const minutesLeft = Math.max(0, Math.ceil(remaining / 60000));
  const announcement = expired
    ? "The time to pay has run out."
    : minutesLeft <= 1
      ? "Less than a minute left to pay."
      : `${minutesLeft} minutes left to pay.`;

  /* ── Panels ──────────────────────────────────────────────────────────── */

  const amount = formatIdr(intent?.amountIdr ?? due.amountIdr);

  /* Present on every state that is not settled. Polling covers the ordinary
     case, but a customer on hotel wi-fi who has just paid wants to be able to
     ask, and asking costs one read of our own database. */
  const checkButton = (
    <Button type="button" onClick={() => void checkAgain()} disabled={checking}>
      {checking ? "Checking…" : "I've paid — check again"}
    </Button>
  );

  function instrument(charge: PaymentIntent) {
    if (charge.channel === "QRIS" && charge.qrString) {
      return (
        <div className="payment-rails">
          <div className="payment-rail-qr grid justify-items-center gap-3">
            <QrCode
              value={charge.qrString}
              label="QRIS code for this booking"
              className="payment-qr"
            />
            <p className="payment-hint text-center font-body text-[13px] leading-[1.6]">
              Scan with any Indonesian banking or e-wallet app.
            </p>
          </div>

          {/* On a phone the code is on the same screen the camera would have
              to point at, so the wallet links come first there. The order is
              swapped in `globals.css`, not with a breakpoint variant. */}
          <div className="payment-rail-wallets grid gap-3">
            <WalletLinks links={charge.deepLinks} />
            <p className="payment-hint font-body text-[13px] leading-[1.6]">
              Booking on the same phone you would scan with?{" "}
              <button
                type="button"
                className={`payment-inline-link ${FOCUS}`}
                onClick={() => void openCharge("VIRTUAL_ACCOUNT")}
                disabled={busy}
              >
                Pay by bank transfer instead
              </button>
              .
            </p>
          </div>
        </div>
      );
    }

    if (charge.channel === "VIRTUAL_ACCOUNT" && charge.virtualAccounts.length > 0) {
      return (
        <div className="grid gap-3">
          {charge.virtualAccounts.map((account) => (
            <div key={`${account.bank}-${account.accountNumber}`} className="payment-account">
              <p className="page-label">{account.bank}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="payment-number">{account.accountNumber}</p>
                <CopyButton
                  value={account.accountNumber}
                  label={`${account.bank} account number`}
                />
              </div>
            </div>
          ))}

          <div className="payment-account">
            <p className="page-label">Amount</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="payment-number">{amount}</p>
              <CopyButton value={String(charge.amountIdr)} label="amount" />
            </div>
          </div>

          <p className="payment-hint font-body text-[13px] leading-[1.6]">
            Transfer the exact amount from any Indonesian bank. It usually shows
            here within a minute.
          </p>
        </div>
      );
    }

    /* E-wallet, and the card fallback.
     *
     * Cards are collected in this modal now — see `cardPanel` below. What is
     * left here is the gateway's own hosted page, which is what a card charge
     * still falls back to if this build has no publishable key. The bank's own
     * 3-D Secure screen is framed either way: it belongs to the issuer, and a
     * site that could redraw a bank's OTP page would defeat the point of one. */
    return (
      <div className="grid gap-4">
        {charge.channel === "EWALLET" ? (
          <WalletLinks links={charge.deepLinks} />
        ) : null}

        {charge.checkoutUrl ? (
          <div className="grid gap-2">
            <a
              href={charge.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`payment-checkout ${FOCUS}`}
            >
              Continue to pay {amount}
            </a>
            <p className="payment-hint font-body text-[13px] leading-[1.6]">
              This opens in a new tab. Leave this one where it is — it updates
              on its own once the payment goes through.
            </p>
          </div>
        ) : Object.keys(charge.deepLinks).length > 0 ? (
          /* A wallet link and nothing else, which is what GoPay returns: its
             only action is a deep link into the app. The links above are the
             whole instrument, so saying nothing more here is right — the
             failure line below would contradict a control that works.

             It is a phone link, though, and this studio's customers book from
             phones and laptops alike, so a laptop gets told plainly rather than
             left tapping something that will not open. */
          <p className="payment-hint font-body text-[13px] leading-[1.6]">
            On a computer? This opens on your phone. Pay by QRIS or bank
            transfer instead — both are above.
          </p>
        ) : (
          <p className="font-body text-[14px] leading-[1.7]">
            This payment method could not be opened. Choose another one above.
          </p>
        )}
      </div>
    );
  }

  /**
   * The card fields, in this modal, for as long as this charge can be paid.
   *
   * Keyed by the payment id so a replacement charge hands the form a clean
   * slate — empty fields, no stale token, no leftover message — without the
   * form having to reset itself.
   */
  function cardPanel(charge: PaymentIntent) {
    return (
      <CardForm
        key={charge.paymentId}
        token={token}
        cardHolder={cardHolder}
        amountIdr={charge.amountIdr}
        onLockChange={setCardLocked}
        onPaid={cardPaid}
        onRenew={renewCard}
      />
    );
  }

  const cardInline = intent?.channel === "CARD" && CARD_PAYMENTS_AVAILABLE;

  function body() {
    if (isSettled(status)) {
      return (
        <p className="font-body text-[15px] leading-[1.7]">
          Payment received. Opening your confirmation…
        </p>
      );
    }

    /*
     * Nothing chosen yet, which is how this modal now opens.
     *
     * There is no charge, so there is nothing to show, nothing to poll and no
     * countdown but the hold's — the buttons above are the whole screen. The
     * previous version raised a QRIS code on arrival to have something to put
     * here, and every customer who wanted a card ended up with two payment
     * rows, one of them dead.
     */
    if (!intent) {
      return (
        <div className="grid gap-3">
          <p className="font-body text-[15px] leading-[1.7]">
            Choose how you would like to pay {amount}.
          </p>
          <p className="payment-hint font-body text-[13px] leading-[1.6]">
            Your time is held while you decide. Nothing is charged until you
            pay.
          </p>
        </div>
      );
    }

    /* Ahead of the failure branch on purpose: a declined card leaves the charge
       `FAILED`, and the customer's next move is to try a different card in the
       form they are already looking at. `CardForm` shows the bank's own reason
       and offers a fresh charge; sending them back to the channel list to
       re-pick "Card" would be a longer road to the same place. */
    if (cardInline && !expired) {
      return (
        <div className="grid gap-4">
          {cardPanel(intent)}

          {pending ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-[14px] leading-[1.6]" aria-hidden="true">
                <span className="payment-hint">Time left to pay </span>
                <span className="payment-countdown tabular-nums">
                  {formatCountdown(remaining)}
                </span>
              </p>

              {checkButton}
            </div>
          ) : null}
        </div>
      );
    }

    if (status === "FAILED") {
      return (
        <div className="grid gap-4">
          <p className="font-body text-[15px] leading-[1.7]">
            That payment did not go through, and nothing has been charged.
            Choose a method above to try again — your time is still held.
          </p>
          <div>{checkButton}</div>
        </div>
      );
    }

    if (expired) {
      return (
        <div className="grid gap-4">
          <p className="font-body text-[15px] leading-[1.7]">
            The time to pay ran out. Choose a method above to start again — your
            booking is still here, and your time is held for a short while
            longer.
          </p>
          <div>{checkButton}</div>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {instrument(intent)}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Hidden from assistive technology in full: a value that changes
              every second is noise there, and the live region above says the
              same thing once a minute instead. */}
          <p className="font-body text-[14px] leading-[1.6]" aria-hidden="true">
            <span className="payment-hint">Time left to pay </span>
            <span className="payment-countdown tabular-nums">
              {formatCountdown(remaining)}
            </span>
          </p>

          {checkButton}
        </div>
      </div>
    );
  }

  return (
    <div
      className="payment-scrim"
      /* `mousedown` rather than `click`: a drag that starts inside the dialog
         and ends on the backdrop is not a request to close it. */
      onMouseDown={requestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="payment-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="payment-dialog-head">
          <div className="grid gap-1">
            <h2 id={titleId} className={H3}>
              Pay for your booking
            </h2>
            <p className="font-body text-[15px] leading-[1.6]">
              {amount} · reference {reference}
            </p>
          </div>

          <button
            type="button"
            onClick={requestClose}
            /* Disabled rather than merely ignored while the bank has the
               payment: a control that does nothing when pressed reads as a
               broken page, and a disabled one reads as "not yet". */
            disabled={cardLocked}
            className={`payment-close ${FOCUS}`}
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="payment-dialog-body">
          {/* Present from the first render so it has somewhere to announce
              into, and coarse enough not to talk over everything else. */}
          <p aria-live="polite" className="sr-only">
            {pending ? announcement : ""}
          </p>

          <div className="payment-channels" role="group" aria-label="Payment method">
            {CHANNELS.map((channel) => (
              <button
                key={channel}
                type="button"
                className={`payment-channel ${FOCUS}`}
                data-selected={channel === intent?.channel}
                /* Locked out mid-authorisation for the same reason the close
                   button is: switching rail there would abandon a charge the
                   bank is still deciding on. */
                disabled={busy || cardLocked}
                onClick={() => void openCharge(channel)}
              >
                <span className="font-body text-[15px] leading-none">
                  {PAYMENT_CHANNEL_LABEL[channel]}
                </span>
                <span className="payment-channel-note font-body text-[12px] leading-[1.4]">
                  {PAYMENT_CHANNEL_NOTE[channel]}
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <p role="status" className="payment-notice font-body text-[14px] leading-[1.6]">
              {error}
            </p>
          ) : null}

          {busy ? (
            <p className="font-body text-[15px] leading-[1.7]">Opening…</p>
          ) : (
            body()
          )}
        </div>

        <div className="payment-dialog-foot">
          {confirmingClose ? (
            <div className="grid gap-3">
              <p className="font-body text-[14px] leading-[1.6]">
                Your booking is made and your time is held, but it is not paid
                yet. Close this and you will need to pay from the link we send
                you.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => setConfirmingClose(false)}>
                  Keep paying
                </Button>
                <Button type="button" variant="solid" onClick={close}>
                  Close anyway
                </Button>
              </div>
            </div>
          ) : (
            <div className="payment-dialog-foot-row">
              <Button type="button" onClick={requestClose} disabled={cardLocked}>
                Close
              </Button>
              {/* Whose payment page this is, said plainly.
                  A form asking for a card number on a small studio's website
                  has to answer "who is actually taking this?", and naming the
                  processor is the honest answer — it is Xendit that holds the
                  card and Xendit that is regulated to. Text, not a logo: the
                  mark is not ours to redraw, and a wrong one would undermine
                  the reassurance it is there to give. */}
              <p className="payment-attribution font-body">
                Payments processed by{" "}
                <a
                  href="https://www.xendit.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={FOCUS}
                >
                  Xendit
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
