"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FIELD, FOCUS } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/booking/format";

import { chargeCard } from "./useBookingApi";

/**
 * The card fields, on our own page.
 *
 * The number never reaches this site's server. Xendit.js exchanges it for a
 * single-use token in the browser, and the token is all that is posted to
 * `/api/booking/<token>/payment/card/` — see the docblock in
 * `lib/payments/cards.ts`, which describes the whole flow and names the owner
 * of each step.
 *
 * Three things here are deliberate and easy to undo by accident:
 *
 * - **The card values are wiped from state the moment a token exists.** They
 *   live in React state only while they are being typed, because grouping
 *   digits as they are entered requires a controlled input; after that they are
 *   of no use to anyone and are cleared. They are never stored, never put in a
 *   URL, and never logged. They are kept only when tokenisation *failed*, so
 *   somebody who mistyped one digit is not made to retype all sixteen.
 * - **3-D Secure happens in an iframe inside the modal.** 3DS 2 was designed to
 *   be framed — the specification fixes the challenge window sizes for exactly
 *   this — so the customer finishes at their bank without leaving the studio's
 *   page. While that frame is open the modal refuses to close: a challenge
 *   abandoned halfway leaves a charge nobody can account for.
 * - **One token is charged once.** `chargedRef` is what stops a double-submit,
 *   a re-fired callback or a stray re-render from becoming a second charge; the
 *   server refuses a settled payment as well, but the browser should not be
 *   asking in the first place.
 *
 * PCI: gathering these fields on our page moves the studio from SAQ A to
 * SAQ A-EP. That is recorded in `lib/payments/cards.ts` and is a real change in
 * what the studio is answerable for, invisible in the code itself.
 */

/* Read once, as a whole static reference, so Next can inline it at build time.
   Without a publishable key nothing here can tokenise anything, so the Card
   option is left off the modal's list entirely rather than offered and then
   broken at the last step — the same fail-closed rule `cardPaymentsEnabled()`
   applies on the server. */
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_XENDIT_PUBLIC_KEY ?? "";

/** Whether the Card channel may be offered at all. Read by `PaymentModal`. */
export const CARD_PAYMENTS_AVAILABLE = PUBLISHABLE_KEY.length > 0;

/* ── Xendit.js ───────────────────────────────────────────────────────────── */

const SCRIPT_SRC = "https://js.xendit.co/v1/xendit.min.js";

/**
 * The parts of the untyped global this file actually uses, and no more.
 *
 * Written as a narrow local interface rather than reached for with `any`: the
 * fields below are the contract this component depends on, so a change in them
 * should be a type error here and not a blank modal in Bali.
 */
type XenditToken = {
  id: string;
  /** `VERIFIED`, `VERIFICATION_REQUIRED`, `FAILED`, … */
  status: string;
  /** Present once a challenge has been completed. */
  authentication_id?: string | null;
  /** The bank's challenge page, to be framed. */
  payer_authentication_url?: string | null;
  failure_reason?: string | null;
};

type XenditFailure = { error_code?: string; message?: string } | null;

type XenditCardData = {
  amount: string;
  card_number: string;
  card_exp_month: string;
  card_exp_year: string;
  card_cvn: string;
  is_multiple_use: boolean;
  should_authenticate: boolean;
  /* Required, which the sandbox said plainly: `child "card_holder_first_name"
     fails because ["card_holder_first_name" is required]`. Xendit's own hosted
     page asks for the same four, and 3-D Secure 2 wants contact details to
     decide whether a challenge is needed at all — a charge with them is more
     likely to pass without one. */
  card_holder_first_name: string;
  card_holder_last_name: string;
  card_holder_email: string;
  card_holder_phone_number: string;
};

type XenditGlobal = {
  setPublishableKey: (key: string) => void;
  card: {
    createToken: (
      data: XenditCardData,
      callback: (error: XenditFailure, token: XenditToken | null) => void,
    ) => void;
  };
};

declare global {
  interface Window {
    Xendit?: XenditGlobal;
  }
}

/**
 * Loads Xendit.js once, lazily.
 *
 * Module-level rather than per-component: this form is mounted and unmounted
 * every time somebody switches channel or retries after a decline, and a script
 * tag per mount would be both wasteful and racy. The promise is also what the
 * submit handler awaits, which a `<Script>` tag could not give it.
 *
 * A failure clears the promise so a second attempt can genuinely retry rather
 * than resolve the same rejection for the rest of the page's life.
 */
let loading: Promise<XenditGlobal> | null = null;

function loadXendit(): Promise<XenditGlobal> {
  if (loading) return loading;

  loading = new Promise<XenditGlobal>((resolve, reject) => {
    const failed = () => {
      loading = null;
      reject(new Error("We could not reach the card service."));
    };

    const ready = () => {
      const xendit = window.Xendit;
      if (!xendit) {
        failed();
        return;
      }
      xendit.setPublishableKey(PUBLISHABLE_KEY);
      resolve(xendit);
    };

    if (window.Xendit) {
      ready();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", ready);
      existing.addEventListener("error", failed);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", ready);
    script.addEventListener("error", failed);
    document.head.append(script);
  });

  return loading;
}

/* ── The card number itself ──────────────────────────────────────────────── */

type Brand = {
  id: string;
  /** Shown beside the field once it is known. Empty while it is not. */
  label: string;
  test: RegExp;
  min: number;
  max: number;
  /** Digits per group, which is also how the field is spaced as it is typed. */
  groups: number[];
  /** Accepted security-code lengths. */
  cvn: number[];
};

/**
 * Enough to space the field correctly and to know when it is full.
 *
 * Not a validator, and not an acceptance list: what the studio's account can
 * actually take is decided by Xendit and the issuer, not here. American Express
 * is included because its 15 digits and 4-digit code would otherwise be
 * mis-spaced and rejected by our own length check before anyone got the chance
 * to find out whether it works.
 */
const BRANDS: readonly Brand[] = [
  {
    id: "amex",
    label: "American Express",
    test: /^3[47]/,
    min: 15,
    max: 15,
    groups: [4, 6, 5],
    cvn: [4],
  },
  {
    id: "visa",
    label: "Visa",
    test: /^4/,
    min: 13,
    max: 19,
    groups: [4, 4, 4, 4, 3],
    cvn: [3],
  },
  {
    id: "mastercard",
    label: "Mastercard",
    test: /^(5[1-5]|2[2-7])/,
    min: 16,
    max: 16,
    groups: [4, 4, 4, 4],
    cvn: [3],
  },
  {
    id: "jcb",
    label: "JCB",
    test: /^35(2[89]|[3-8]\d)/,
    min: 16,
    max: 19,
    groups: [4, 4, 4, 4, 3],
    cvn: [3],
  },
];

/** What an unfinished number is treated as: spaced in fours, 13–19 long. */
const UNKNOWN: Brand = {
  id: "unknown",
  label: "",
  test: /^/,
  min: 13,
  max: 19,
  groups: [4, 4, 4, 4, 3],
  cvn: [3, 4],
};

function brandOf(digits: string): Brand {
  return BRANDS.find((brand) => brand.test.test(digits)) ?? UNKNOWN;
}

function group(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let index = 0;

  for (const size of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }

  if (index < digits.length) parts.push(digits.slice(index));
  return parts.join(" ");
}

/**
 * The check digit, run before a network call is spent.
 *
 * Every mistyped digit and every transposed pair fails this, which is most of
 * what goes wrong in a card field — catching it here means the customer is told
 * in the field rather than by their bank a second and a half later.
 */
function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = digits.charCodeAt(index) - 48;
    if (value < 0 || value > 9) return false;

    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }

    sum += value;
    double = !double;
  }

  return digits.length > 0 && sum % 10 === 0;
}

const digitsOf = (value: string) => value.replace(/\D/g, "");

/** `"07 / 29"` → `{ month: "07", year: "2029" }`, or `null` if it is not one. */
function readExpiry(value: string): { month: string; year: string } | null {
  const digits = digitsOf(value);
  if (digits.length !== 4) return null;

  const month = Number(digits.slice(0, 2));
  if (month < 1 || month > 12) return null;

  /* Two digits, as printed on the card. A card reading "29" is 2029: nobody is
     paying a Bali massage studio with a card that expired in 1929. */
  const year = 2000 + Number(digits.slice(2, 4));
  const now = new Date();

  /* A card is good through the last day of its month. */
  if (year < now.getFullYear()) return null;
  if (year === now.getFullYear() && month < now.getMonth() + 1) return null;
  /* Issuers do not date cards more than about a decade out; anything further
     is a typo in the year, and it is cheaper to say so here. */
  if (year > now.getFullYear() + 20) return null;

  return { month: digits.slice(0, 2), year: String(year) };
}

/* ── The form ────────────────────────────────────────────────────────────── */

type Phase =
  | "form"
  | "tokenising"
  | "challenge"
  | "charging"
  | "declined"
  | "renewing"
  | "paid";

type FieldName = "number" | "expiry" | "cvn" | "holder" | "last";

const GENERIC = "We could not take that card. Please try again.";

/**
 * The 3DS challenge window.
 *
 * 3DS 2 defines five sizes and this is the second of them — the one meant for a
 * challenge shown inside a merchant's own page. Below 480px it goes full width
 * instead, which is the same reasoning the specification's full-screen size
 * exists for. The width is set in `globals.css`; the height is fixed here
 * because it does not change with the viewport.
 */
const CHALLENGE_HEIGHT = 400;

export default function CardForm({
  token,
  amountIdr,
  cardHolder,
  onLockChange,
  onPaid,
  onRenew,
}: {
  /** The booking's manage token. Every payment call is keyed by it. */
  token: string;
  /**
   * Who the booking is for, used to prefill the name and to supply the contact
   * details Xendit wants with a card.
   *
   * Prefilled rather than assumed: the name on the card is often not the name
   * on the booking — a partner's card, a company card — so the fields are
   * editable. The email and phone are the booking's and are not asked for
   * twice; they identify the payer to the bank, not the cardholder.
   */
  cardHolder: {
    firstName: string;
    lastName: string;
    email: string;
    phoneE164: string;
  };
  /** Shown on the button. Never sent — the server charges what it recorded. */
  amountIdr: number;
  /**
   * Held open while a token, a challenge or a charge is in flight. The modal
   * stops answering Escape and backdrop clicks for as long as this is true.
   */
  onLockChange: (locked: boolean) => void;
  /** The server said `PAID`. The modal takes it from here. */
  onPaid: () => void;
  /**
   * Opens a fresh card charge, because the spent one cannot be paid twice.
   * Resolves false when it could not — including when the previous attempt
   * turns out to have succeeded after all.
   */
  onRenew: () => Promise<boolean>;
}) {
  /* Prefilled from the booking, editable because the name on the card is often
     not the name on the booking — a partner's card, a company card. */
  const [holderFirst, setHolderFirst] = useState(cardHolder.firstName);
  const [holderLast, setHolderLast] = useState(cardHolder.lastName);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvn, setCvn] = useState("");

  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [notice, setNotice] = useState<string | null>(null);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  const ids = useId();
  const field = (name: FieldName) => `${ids}-${name}`;
  const errorId = (name: FieldName) => `${ids}-${name}-error`;

  /* A single-use token, charged once. The callback below can fire more than
     once — that is how the 3DS handshake reports back — and a second charge is
     money somebody has to refund by hand. */
  const chargedRef = useRef<string | null>(null);

  /* Xendit's callback outlives this component if the customer switches channel
     mid-challenge, and a setState afterwards is at best noise. */
  const liveRef = useRef(true);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  const digits = digitsOf(number);
  const brand = brandOf(digits);
  const locked =
    phase === "tokenising" || phase === "challenge" || phase === "charging";
  const done = phase === "paid";

  /* The script is fetched when this mounts, which is the moment the customer
     picked Card — not on the booking page, where most people never get here. */
  useEffect(() => {
    void loadXendit().catch(() => {
      if (liveRef.current) {
        setNotice(
          "The card form could not be loaded. Please choose another payment " +
            "method above.",
        );
      }
    });
  }, []);

  useEffect(() => {
    onLockChange(locked);
  }, [locked, onLockChange]);

  /* Released on the way out as well: a component that unmounts while locked
     would otherwise leave the modal permanently unclosable. */
  useEffect(() => {
    return () => onLockChange(false);
  }, [onLockChange]);

  /**
   * The card values, gone.
   *
   * Called the moment a token exists, which is the moment they stop being
   * needed. Everything after this point works from the token.
   */
  const forget = useCallback(() => {
    setNumber("");
    setExpiry("");
    setCvn("");
  }, []);

  /* ── Validation ──────────────────────────────────────────────────────── */

  function validate(): {
    ok: boolean;
    errors: Partial<Record<FieldName, string>>;
    card?: { number: string; month: string; year: string; cvn: string };
  } {
    const found: Partial<Record<FieldName, string>> = {};

    /* Xendit refuses a token without it, so catching it here saves a round trip
       and shows the complaint beside the field rather than as a raw API string
       under the button. */
    if (holderFirst.trim().length === 0) {
      found.holder = "Enter the first name printed on the card.";
    }

    if (digits.length === 0) {
      found.number = "Enter the long number across the front of your card.";
    } else if (digits.length < brand.min || digits.length > brand.max) {
      found.number = "That number is not the right length.";
    } else if (!luhn(digits)) {
      found.number = "Please check that number — a digit looks wrong.";
    }

    const dates = readExpiry(expiry);
    if (!dates) {
      found.expiry = expiry.trim()
        ? "That expiry date is not one this card could have."
        : "Enter the expiry date, as month and year.";
    }

    const code = digitsOf(cvn);
    if (!brand.cvn.includes(code.length)) {
      found.cvn =
        brand.cvn.length === 1 && brand.cvn[0] === 4
          ? "The 4-digit code is on the front of your card."
          : "Enter the 3-digit code from the back of your card.";
    }

    setErrors(found);

    if (Object.keys(found).length > 0 || !dates) {
      return { ok: false, errors: found };
    }

    return {
      ok: true,
      errors: found,
      card: { number: digits, month: dates.month, year: dates.year, cvn: code },
    };
  }

  /* ── Charging ────────────────────────────────────────────────────────── */

  const charge = useCallback(
    async (tokenId: string, authenticationId: string | null) => {
      if (chargedRef.current === tokenId) return;
      chargedRef.current = tokenId;

      setPhase("charging");
      setChallengeUrl(null);
      setNotice(null);

      try {
        await chargeCard(token, tokenId, authenticationId);
        if (!liveRef.current) return;
        setPhase("paid");
        onPaid();
      } catch (cause) {
        if (!liveRef.current) return;
        /* Shown exactly as it arrives. A decline comes back from the server
           already written for the customer — "That card does not have enough
           available balance" — and rewording it here would only make it
           vaguer. */
        setNotice(cause instanceof Error ? cause.message : GENERIC);
        setPhase("declined");
      }
    },
    [token, onPaid],
  );

  /**
   * Xendit's callback, which fires once for an ordinary card and twice for one
   * the bank wants to challenge: once asking for the challenge, once with its
   * outcome.
   */
  const handleToken = useCallback(
    (error: XenditFailure, result: XenditToken | null) => {
      if (!liveRef.current) return;

      if (error || !result) {
        /* The card values are deliberately kept here: they never left the
           browser except to Xendit, and a mistyped digit should not cost
           somebody the whole number again. */
        setPhase("form");
        setNotice(error?.message ?? GENERIC);
        return;
      }

      if (result.status === "VERIFICATION_REQUIRED") {
        /* TODO(xendit): confirm that Xendit.js re-invokes *this* callback once
           the framed challenge finishes, rather than expecting the page to
           listen for a `message` event from the frame or to poll the token.
           This is the single assumption the whole embedded flow rests on: if it
           is wrong, the challenge completes at the bank and this modal sits
           there saying "your bank is checking" forever. */
        const url = result.payer_authentication_url;
        forget();

        if (!url) {
          setPhase("form");
          setNotice(
            "Your bank asked to check this payment, but did not say how. " +
              "Please try another payment method above.",
          );
          return;
        }

        setChallengeUrl(url);
        setNotice(null);
        setPhase("challenge");
        return;
      }

      if (result.status === "VERIFIED") {
        forget();
        /* TODO(xendit): confirm the completed challenge's id arrives as
           `authentication_id` on the token itself. `lib/payments/cards.ts`
           passes it straight through as `authentication_id` on the charge, and
           a card that was challenged but charged without it is one the bank can
           later disown — the liability shift is the whole point of doing 3DS. */
        void charge(result.id, result.authentication_id ?? null);
        return;
      }

      /* FAILED, and anything else Xendit may add later. Treated as a refusal
         rather than guessed at: charging a token whose status we do not
         recognise is the one mistake here that costs real money.
         TODO(xendit): confirm the full status list — `IN_REVIEW` in particular
         may be a state that later becomes VERIFIED rather than a refusal. */
      setPhase("form");
      setNotice(
        result.failure_reason
          ? `Your bank refused that card (${result.failure_reason}).`
          : "Your bank refused that card. Please try another one.",
      );
    },
    [charge, forget],
  );

  async function submit() {
    if (locked || done) return;

    const checked = validate();

    if (!checked.ok || !checked.card) {
      /* Focus follows the first complaint. Three fields on one row is exactly
         the shape where a message appears somewhere off a phone's viewport and
         the customer presses the button again. */
      const first = (["number", "expiry", "cvn"] as const).find(
        (name) => checked.errors[name],
      );
      if (first) document.getElementById(field(first))?.focus();
      return;
    }

    setNotice(null);
    setPhase("tokenising");

    let xendit: XenditGlobal;

    try {
      xendit = await loadXendit();
    } catch {
      if (!liveRef.current) return;
      setPhase("form");
      setNotice(
        "We could not reach the card service. Please try again, or choose " +
          "another payment method above.",
      );
      return;
    }

    if (!liveRef.current) return;

    /* TODO(xendit): confirm `amount` is expected as a string of whole rupiah.
       Xendit's own samples pass a string, but the API elsewhere in this
       codebase takes integers, and a mismatch here would surface as a 3DS
       challenge for the wrong figure rather than as an error.
       TODO(xendit): confirm no `currency` field is needed on an IDR-only
       account. It is documented for multi-currency merchants; sending an
       unexpected field is worse than omitting a defaulted one. */
    xendit.card.createToken(
      {
        amount: String(amountIdr),
        card_number: checked.card.number,
        card_exp_month: checked.card.month,
        card_exp_year: checked.card.year,
        card_cvn: checked.card.cvn,
        is_multiple_use: false,
        should_authenticate: true,
        card_holder_first_name: holderFirst.trim(),
        /* Xendit wants both halves. When somebody gave only one name — which
           our own booking form allows — repeating it is better than sending an
           empty string the API rejects outright. */
        card_holder_last_name: holderLast.trim() || holderFirst.trim(),
        card_holder_email: cardHolder.email,
        card_holder_phone_number: cardHolder.phoneE164,
      },
      handleToken,
    );
  }

  /** Abandons a challenge deliberately. Nothing has been charged at this point. */
  function cancelChallenge() {
    setChallengeUrl(null);
    setPhase("form");
    setNotice(
      "The check was cancelled and nothing was charged. You can enter a card " +
        "again, or choose another payment method above.",
    );
  }

  /** After a refusal: the spent charge cannot be paid, so a new one is opened. */
  async function tryAnother() {
    setPhase("renewing");
    setNotice(null);

    const opened = await onRenew();
    if (!liveRef.current) return;

    /* On success the modal hands this component a new charge and it remounts
       with empty fields; only a failure lands back here. */
    if (!opened) {
      setPhase("declined");
      setNotice(
        "We could not start another payment. Please choose a payment method " +
          "above, or use the link in your confirmation message.",
      );
    }
  }

  /* ── Fields ──────────────────────────────────────────────────────────── */

  const label = "page-label mb-1.5 block";
  const inputClass = (name: FieldName) =>
    `${FIELD}${errors[name] ? " booking-field-invalid" : ""}`;

  function onNumberChange(value: string) {
    const raw = digitsOf(value);
    const next = brandOf(raw);
    setNumber(group(raw.slice(0, next.max), next.groups));
    if (errors.number) setErrors((prior) => ({ ...prior, number: undefined }));
  }

  function onExpiryChange(value: string) {
    let raw = digitsOf(value).slice(0, 4);
    /* A lone "7" can only be July, so it is written as one — otherwise the
       next keystroke reads as "72" and the field fights the customer. */
    if (raw.length === 1 && raw > "1") raw = `0${raw}`;
    setExpiry(raw.length > 2 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw);
    if (errors.expiry) setErrors((prior) => ({ ...prior, expiry: undefined }));
  }

  function onCvnChange(value: string) {
    setCvn(digitsOf(value).slice(0, Math.max(...brand.cvn)));
    if (errors.cvn) setErrors((prior) => ({ ...prior, cvn: undefined }));
  }

  /* ── Panels ──────────────────────────────────────────────────────────── */

  if (phase === "challenge" && challengeUrl) {
    return (
      <div className="grid gap-3">
        <div className="grid gap-1">
          <p className="page-label">Your bank is checking this payment</p>
          <p className="font-body text-[15px] leading-[1.7]" role="status">
            Finish the check below. Your bank may send you a code by text.
          </p>
        </div>

        {/* No `sandbox` attribute on purpose: this is the issuing bank's own
            authentication page and it needs scripts, form posts and its own
            storage. A sandbox missing any one of those breaks the challenge
            silently, which looks to the customer like a bank that is down. */}
        {/* TODO(xendit): confirm the frame does not need a particular `name`.
            Some 3DS implementations post the ACS form into a frame they find by
            name; if Xendit's does, this needs whatever name it looks for. */}
        <div className="card-3ds-shell">
          <iframe
            src={challengeUrl}
            title="Card verification from your bank"
            height={CHALLENGE_HEIGHT}
            className="card-3ds-frame"
          />
        </div>

        <p className="payment-hint font-body text-[13px] leading-[1.6]">
          Please keep this window open until the check finishes.
        </p>

        <div>
          <button
            type="button"
            className={`payment-inline-link ${FOCUS}`}
            onClick={cancelChallenge}
          >
            Cancel this check
          </button>
        </div>
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <p className="font-body text-[15px] leading-[1.7]" role="status">
        Payment received. Opening your confirmation…
      </p>
    );
  }

  if (phase === "charging" || phase === "tokenising" || phase === "renewing") {
    return (
      <div className="grid gap-2">
        <p className="font-body text-[15px] leading-[1.7]" role="status">
          {phase === "tokenising"
            ? "Checking your card…"
            : phase === "charging"
              ? "Taking the payment…"
              : "Starting a new payment…"}
        </p>
        <p className="payment-hint font-body text-[13px] leading-[1.6]">
          Please keep this window open.
        </p>
      </div>
    );
  }

  if (phase === "declined") {
    return (
      <div className="grid gap-4">
        <p
          role="status"
          className="payment-notice font-body text-[15px] leading-[1.7]"
        >
          {notice ?? GENERIC}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="solid" onClick={() => void tryAnother()}>
            Try another card
          </Button>
        </div>

        <p className="payment-hint font-body text-[13px] leading-[1.6]">
          Or choose another payment method above — your time is still held.
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      /* Left on so password managers can fill these. A manager that fills a
         card correctly is both a usability and an accessibility win, and the
         values go to Xendit either way. */
      autoComplete="on"
    >
      <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={field("holder")} className={label}>
            First name on card
          </label>
          <input
            id={field("holder")}
            name="ccname-given"
            type="text"
            autoComplete="cc-given-name"
            maxLength={60}
            value={holderFirst}
            onChange={(event) => setHolderFirst(event.target.value)}
            aria-invalid={errors.holder ? true : undefined}
            aria-describedby={errors.holder ? errorId("holder") : undefined}
            className={FIELD}
          />
          {errors.holder ? (
            <p
              id={errorId("holder")}
              className="mt-1.5 font-body text-[13px] leading-[1.5] font-bold text-primary-strong"
            >
              {errors.holder}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={field("last")} className={label}>
            Last name on card
          </label>
          <input
            id={field("last")}
            name="ccname-family"
            type="text"
            autoComplete="cc-family-name"
            maxLength={60}
            value={holderLast}
            onChange={(event) => setHolderLast(event.target.value)}
            className={FIELD}
          />
        </div>
      </div>

        <label htmlFor={field("number")} className={label}>
          Card number{brand.label ? ` · ${brand.label}` : ""}
        </label>
        <input
          id={field("number")}
          name="cardnumber"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={group("0".repeat(brand.max), brand.groups).length}
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          aria-invalid={errors.number ? true : undefined}
          aria-describedby={errors.number ? errorId("number") : undefined}
          className={`${inputClass("number")} tabular-nums tracking-[0.04em]`}
        />
        {errors.number ? (
          <p
            id={errorId("number")}
            className="mt-1.5 font-body text-[13px] leading-[1.5] font-bold text-primary-strong"
          >
            {errors.number}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={field("expiry")} className={label}>
            Expires
          </label>
          <input
            id={field("expiry")}
            name="cc-exp"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            maxLength={7}
            value={expiry}
            onChange={(event) => onExpiryChange(event.target.value)}
            aria-invalid={errors.expiry ? true : undefined}
            aria-describedby={errors.expiry ? errorId("expiry") : undefined}
            className={`${inputClass("expiry")} tabular-nums`}
          />
          {errors.expiry ? (
            <p
              id={errorId("expiry")}
              className="mt-1.5 font-body text-[13px] leading-[1.5] font-bold text-primary-strong"
            >
              {errors.expiry}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={field("cvn")} className={label}>
            Security code
          </label>
          <input
            id={field("cvn")}
            name="cvc"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={Math.max(...brand.cvn)}
            value={cvn}
            onChange={(event) => onCvnChange(event.target.value)}
            aria-invalid={errors.cvn ? true : undefined}
            aria-describedby={errors.cvn ? errorId("cvn") : undefined}
            className={`${inputClass("cvn")} tabular-nums`}
          />
          {errors.cvn ? (
            <p
              id={errorId("cvn")}
              className="mt-1.5 font-body text-[13px] leading-[1.5] font-bold text-primary-strong"
            >
              {errors.cvn}
            </p>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="payment-notice font-body text-[14px] leading-[1.6]"
        >
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="solid">
          Pay {formatIdr(amountIdr)}
        </Button>
      </div>

      {/* Said once, where it is decided. It is also exactly true: the fields
          above are read by Xendit's script and exchanged for a token in this
          browser, and only the token is sent to the studio. */}
      {/* Named, not "our payment provider". Somebody deciding whether to type
          a card number into a small studio's website is asking who is really
          taking it, and a name they can look up answers that where a vague
          phrase does not. */}
      <p className="payment-hint font-body text-[13px] leading-[1.6]">
        Your card details go straight to Xendit, our payment processor. They
        never reach this site. Your bank may ask you to confirm the payment —
        that happens here, in this window.
      </p>
    </form>
  );
}
