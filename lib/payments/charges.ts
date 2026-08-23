/**
 * Opening a charge, and asking the gateway what became of it.
 *
 * One function per rail, because Xendit has no single "take money" endpoint —
 * QRIS, virtual accounts, e-wallets and cards are four separate products with
 * four request shapes and four status vocabularies. The job of this file is to
 * make that invisible to everything above it: callers hand over a
 * `PaymentChannelValue` and get back a `PaymentIntent`, and nothing outside
 * `lib/payments/` ever learns that a field called `external_id` exists.
 *
 * Two things are worth knowing before changing anything here.
 *
 * The amount is never read from a request body. It arrives on `CreateChargeInput`
 * from the booking the server already resolved, the same discipline
 * `lib/booking/create.ts` applies to prices — see PAYMENT-PLAN §5 rule 3.
 *
 * And `refetchCharge` deliberately writes nothing. It is what the callback
 * consults instead of believing the payload it was handed; the callback owns
 * the transition that follows. Splitting "what does the gateway say" from "what
 * do we do about it" is what keeps a replayed callback harmless.
 *
 * TODO(xendit): Xendit has been moving new integrations toward a unified
 * Payment Sessions / Payment Requests API while these per-channel endpoints and
 * the Invoice API remain in service. Before go-live, check which Xendit
 * recommends for a new merchant. If it is the newer one, the whole of this file
 * changes and nothing above it does — that is why the seam is here.
 */
import "server-only";

import { nanoid } from "nanoid";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type {
  PaymentChannelValue,
  PaymentIntent,
  PaymentStatusValue,
  VirtualAccount,
} from "@/lib/payments/types";
import {
  readArray,
  readDate,
  readNumber,
  readRecord,
  readString,
  XenditError,
  xenditRequest,
} from "@/lib/payments/xendit";

export type CreateChargeInput = {
  bookingId: string;
  /** Whole rupiah. Always taken from the booking server-side, never a request body. */
  amountIdr: number;
  channel: PaymentChannelValue;
  /** Shown on the gateway's own page and in receipts. */
  description: string;
  customer: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    phoneE164: string;
  };
  bookingReference: string;
  /** Where Xendit sends the customer back for the card path. */
  returnUrl: string;
};

/**
 * BCA, because it is the account almost every Indonesian customer and most
 * long-staying expats already bank with, and a Bali studio quoting one number
 * beats a bank picker nobody reads.
 *
 * This is a choice, not a constraint. Xendit opens virtual accounts on BNI,
 * BRI, Mandiri, Permata and others from the same endpoint; offering several is
 * a matter of asking the customer first and passing a different `bank_code`.
 */
const VA_BANK = "BCA";

/**
 * GoPay, per PAYMENT-PLAN §10.3, which names it as the one wallet to enable
 * alongside QRIS, virtual account and card.
 *
 * Also a choice. The e-wallet endpoint takes one wallet per charge, so a wallet
 * picker in the modal means passing the chosen `channel_code` down to here —
 * the `PaymentIntent.deepLinks` map is already keyed by wallet for exactly that.
 *
 * TODO(xendit): confirm the channel code for GoPay in the current e-wallet API
 * and that it is enabled on the studio's account. OVO in particular behaves
 * differently — it pushes a notification to a registered number instead of
 * returning a link — so it cannot be swapped in here without a UI change.
 */
const EWALLET_CHANNEL_CODE = "ID_GOPAY";

/** `ID_GOPAY` → `GOPAY`, which is what `PaymentIntent.deepLinks` is keyed by. */
function walletKey(channelCode: string): string {
  return channelCode.replace(/^ID_/, "");
}

/**
 * When the charge stops being payable.
 *
 * Deliberately shorter than the booking hold — `XENDIT_INVOICE_MINUTES`
 * defaults to 13 against a 15-minute `holdExpiresAt`. The gateway has to give
 * up first, otherwise somebody can complete a payment for a slot the cron has
 * already released and handed to the next customer, and the studio is left
 * refunding by hand for a session it cannot deliver. See PAYMENT-PLAN §11
 * risk 3.
 */
function chargeExpiry(): Date {
  return new Date(Date.now() + env().XENDIT_INVOICE_MINUTES * 60_000);
}

/**
 * `FF-8KQ2M-V1nA7xQ2pL`.
 *
 * Our own reference, unique per attempt, and the thing that makes the callback
 * idempotent. The booking reference is on the front so a charge in the Xendit
 * dashboard can be traced back to an appointment without a database; the random
 * tail is what lets one booking have several attempts — a QRIS code left to
 * expire and then paid by virtual account is two charges and one session.
 */
function createProviderRef(bookingReference: string): string {
  return `${bookingReference}-${nanoid(12)}`;
}

/** What the customer is called on a bank statement or a hosted checkout page. */
function customerName(customer: CreateChargeInput["customer"]): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
}

/**
 * Virtual account holder names travel through bank systems that predate
 * Unicode. Anything but letters, digits and spaces is a rejected creation or a
 * mangled name on the customer's transfer screen.
 *
 * TODO(xendit): confirm the length limit per bank — 30 characters is the
 * conservative figure BCA is usually quoted at, but Xendit documents its own
 * maximum and it differs by bank.
 */
function virtualAccountName(customer: CreateChargeInput["customer"]): string {
  const cleaned = customerName(customer).replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Flex and Flow").slice(0, 30);
}

/** What one gateway call yields, before any of it reaches the database. */
type OpenedCharge = {
  providerId: string;
  qrString: string | null;
  virtualAccount: VirtualAccount | null;
  checkoutUrl: string | null;
  deepLinks: Record<string, string>;
  /** The gateway's own expiry, when it reports one. Ours is the fallback. */
  expiresAt: Date | null;
};

function unexpected(what: string): XenditError {
  return new XenditError(
    `Xendit's response carried no ${what}.`,
    502,
    "UNEXPECTED_RESPONSE",
  );
}

/**
 * QRIS. The one channel that needs no redirect at all: the response carries the
 * QR payload as a string and we draw the code ourselves, which is the entire
 * reason the modal in PAYMENT-PLAN §4 is possible.
 *
 * TODO(xendit): confirm the endpoint path (`POST /qr_codes`), the
 * `api-version` header the QR Codes API currently expects, and that the payload
 * still comes back as `qr_string`. This API has had two generations with
 * different field names (`external_id` vs `reference_id`), and picking the
 * wrong one produces a 400 rather than anything subtle.
 */
async function openQris(
  input: CreateChargeInput,
  providerRef: string,
  expiresAt: Date,
): Promise<OpenedCharge> {
  const body = await xenditRequest<unknown>("/qr_codes", {
    method: "POST",
    idempotencyKey: providerRef,
    body: {
      reference_id: providerRef,
      type: "DYNAMIC",
      currency: "IDR",
      amount: input.amountIdr,
      expires_at: expiresAt.toISOString(),
    },
  });

  const providerId = readString(body, "id");
  const qrString = readString(body, "qr_string");

  if (!providerId) throw unexpected("QR code id");
  if (!qrString) throw unexpected("QR payload string");

  return {
    providerId,
    qrString,
    virtualAccount: null,
    checkoutUrl: null,
    deepLinks: {},
    expiresAt: readDate(body, "expires_at"),
  };
}

/**
 * A closed, single-use virtual account: it accepts exactly the amount due and
 * exactly once. Open accounts take any amount, which turns every underpayment
 * into a reconciliation problem somebody has to solve by hand.
 *
 * TODO(xendit): confirm `POST /callback_virtual_accounts` and the field names
 * below (`is_closed`, `expected_amount`, `expiration_date`), and check whether
 * the account number comes back immediately on every bank — some banks
 * historically returned a `PENDING` account with the number arriving by
 * callback, which this code would reject rather than wait for.
 */
async function openVirtualAccount(
  input: CreateChargeInput,
  providerRef: string,
  expiresAt: Date,
): Promise<OpenedCharge> {
  const body = await xenditRequest<unknown>("/callback_virtual_accounts", {
    method: "POST",
    idempotencyKey: providerRef,
    body: {
      external_id: providerRef,
      bank_code: VA_BANK,
      name: virtualAccountName(input.customer),
      is_closed: true,
      is_single_use: true,
      expected_amount: input.amountIdr,
      expiration_date: expiresAt.toISOString(),
    },
  });

  const providerId = readString(body, "id");
  const accountNumber = readString(body, "account_number");

  if (!providerId) throw unexpected("virtual account id");
  if (!accountNumber) throw unexpected("virtual account number");

  return {
    providerId,
    qrString: null,
    virtualAccount: {
      bank: readString(body, "bank_code") ?? VA_BANK,
      accountNumber,
    },
    checkoutUrl: null,
    deepLinks: {},
    expiresAt: readDate(body, "expiration_date"),
  };
}

/**
 * Cards go to Xendit's own hosted page, and there is no card form anywhere in
 * this repo on purpose.
 *
 * An Indonesian card almost always ends at 3-D Secure, which is a page served
 * by the issuing bank. Nobody can render that inside our modal, and nobody
 * should want to: a site that could convincingly draw a bank's OTP screen is
 * the exact thing 3-D Secure exists to prevent. Handing the customer an
 * `invoice_url` also keeps every card number off this server, so the PCI
 * surface stays at zero. PAYMENT-PLAN §4 has the long version.
 *
 * The invoice is restricted to card because the cheap rails are opened
 * directly, above — an unrestricted invoice would quietly offer QRIS on a page
 * we do not control and lose the modal.
 *
 * TODO(xendit): confirm `payment_methods: ["CREDIT_CARD"]` is still the way to
 * restrict an invoice to cards, and whether `invoice_duration` is seconds
 * (assumed here) or minutes in the current API.
 */
async function openCardInvoice(
  input: CreateChargeInput,
  providerRef: string,
  expiresAt: Date,
): Promise<OpenedCharge> {
  /* Never below a minute: a hold that has almost lapsed must not produce an
     invoice that expires between opening it and reading it. */
  const seconds = Math.max(
    60,
    Math.round((expiresAt.getTime() - Date.now()) / 1000),
  );

  const body = await xenditRequest<unknown>("/v2/invoices", {
    method: "POST",
    idempotencyKey: providerRef,
    body: {
      external_id: providerRef,
      amount: input.amountIdr,
      currency: "IDR",
      description: input.description,
      invoice_duration: seconds,
      payment_methods: ["CREDIT_CARD"],
      success_redirect_url: input.returnUrl,
      failure_redirect_url: input.returnUrl,
      /* The confirmation email is ours to send, after the callback confirms
         payment. Xendit sending its own would arrive first and say less. */
      should_send_email: false,
      ...(input.customer.email ? { payer_email: input.customer.email } : {}),
      customer: {
        given_names: input.customer.firstName,
        ...(input.customer.lastName ? { surname: input.customer.lastName } : {}),
        ...(input.customer.email ? { email: input.customer.email } : {}),
        mobile_number: input.customer.phoneE164,
      },
    },
  });

  const providerId = readString(body, "id");
  const checkoutUrl = readString(body, "invoice_url");

  if (!providerId) throw unexpected("invoice id");
  if (!checkoutUrl) throw unexpected("invoice URL");

  return {
    providerId,
    qrString: null,
    virtualAccount: null,
    checkoutUrl,
    deepLinks: {},
    expiresAt: readDate(body, "expiry_date"),
  };
}

/**
 * E-wallets, which always leave the page: approving a payment happens inside
 * the wallet app, and no amount of modal makes that untrue.
 *
 * The deep link matters more than it looks. This studio's customers book from
 * a phone (PRODUCT.md), and a QR code on the screen of the phone you would scan
 * with is useless — the deep link is what turns that dead end into one tap.
 *
 * TODO(xendit): confirm `POST /ewallets/charges`, the `actions` field names
 * below, and which of them GoPay actually returns. PAYMENT-PLAN §4 is explicit
 * that deep-link support differs per wallet and must be tested one at a time in
 * the sandbox rather than assumed.
 *
 * TODO(xendit): the e-wallet charge API takes its expiry from the wallet rather
 * than from us, so `expiresAt` on the row is our own deadline and may be longer
 * than the wallet's. Check whether a per-charge expiry field exists now; if not,
 * the row's expiry is still the one the cron enforces, which is the safe side.
 */
async function openEwallet(
  input: CreateChargeInput,
  providerRef: string,
): Promise<OpenedCharge> {
  const body = await xenditRequest<unknown>("/ewallets/charges", {
    method: "POST",
    idempotencyKey: providerRef,
    body: {
      reference_id: providerRef,
      currency: "IDR",
      amount: input.amountIdr,
      checkout_method: "ONE_TIME_PAYMENT",
      channel_code: EWALLET_CHANNEL_CODE,
      channel_properties: {
        success_redirect_url: input.returnUrl,
        failure_redirect_url: input.returnUrl,
      },
    },
  });

  const providerId = readString(body, "id");
  if (!providerId) throw unexpected("e-wallet charge id");

  const actions = readRecord(body, "actions");
  const deepLink = readString(actions, "mobile_deeplink_checkout_url");
  const checkoutUrl =
    readString(actions, "desktop_web_checkout_url") ??
    readString(actions, "mobile_web_checkout_url");

  /* With neither a link nor a deep link there is nothing to show the customer,
     and a modal that renders an empty box while the charge quietly counts down
     is worse than an error they can act on. */
  if (!deepLink && !checkoutUrl) {
    throw unexpected("e-wallet checkout link");
  }

  return {
    providerId,
    qrString: null,
    virtualAccount: null,
    checkoutUrl,
    deepLinks: deepLink ? { [walletKey(EWALLET_CHANNEL_CODE)]: deepLink } : {},
    expiresAt: null,
  };
}

function openCharge(
  input: CreateChargeInput,
  providerRef: string,
  expiresAt: Date,
): Promise<OpenedCharge> {
  switch (input.channel) {
    case "QRIS":
      return openQris(input, providerRef, expiresAt);
    case "VIRTUAL_ACCOUNT":
      return openVirtualAccount(input, providerRef, expiresAt);
    case "CARD":
      return openCardInvoice(input, providerRef, expiresAt);
    case "EWALLET":
      return openEwallet(input, providerRef);
  }
}

/** Short enough for `Payment.lastError`, and free of anything secret. */
function describe(error: unknown): string {
  if (error instanceof XenditError) {
    return `${error.errorCode ?? error.status}: ${error.message}`.slice(0, 300);
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 300);
}

/** Opens a charge, writes the `Payment` row, and returns what the modal needs. */
export async function createCharge(
  input: CreateChargeInput,
): Promise<PaymentIntent> {
  /* The amount comes from the booking, so a bad one here is our bug rather
     than an attack — but a charge for zero or for a fraction of a rupiah is
     rejected by the gateway in a way nobody can read, so refuse it here. */
  if (!Number.isInteger(input.amountIdr) || input.amountIdr <= 0) {
    throw new XenditError(
      `Refusing to open a charge for ${input.amountIdr}.`,
      0,
      "INVALID_AMOUNT",
    );
  }

  const providerRef = createProviderRef(input.bookingReference);
  const expiresAt = chargeExpiry();

  /*
   * The row is written before the gateway is called, and the order is the whole
   * point. If Xendit answers and the database write fails, a customer can pay
   * against a charge we have no record of and the callback has nothing to look
   * up. The reverse — a row whose charge never opened — costs nothing: it is
   * marked FAILED below, and the hold lapses on its own.
   */
  const payment = await prisma.payment.create({
    data: {
      bookingId: input.bookingId,
      providerRef,
      channel: input.channel,
      amountIdr: input.amountIdr,
      expiresAt,
    },
    select: { id: true },
  });

  let opened: OpenedCharge;

  try {
    opened = await openCharge(input, providerRef, expiresAt);
  } catch (error) {
    await prisma.payment
      .update({
        where: { id: payment.id },
        data: { status: "FAILED", lastError: describe(error) },
      })
      /* The original failure is the one worth raising. Losing the note about
         it is a smaller problem than replacing it with a database error. */
      .catch(() => undefined);

    throw error;
  }

  const virtualAccounts: VirtualAccount[] = opened.virtualAccount
    ? [opened.virtualAccount]
    : [];

  /* Whichever deadline comes first. Xendit sometimes rounds or clamps what we
     asked for, and the shorter of the two is the one that is actually true. */
  const effectiveExpiry =
    opened.expiresAt && opened.expiresAt < expiresAt ? opened.expiresAt : expiresAt;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerId: opened.providerId,
      qrString: opened.qrString,
      vaBank: opened.virtualAccount?.bank ?? null,
      vaNumber: opened.virtualAccount?.accountNumber ?? null,
      checkoutUrl: opened.checkoutUrl,
      expiresAt: effectiveExpiry,
    },
  });

  return {
    paymentId: payment.id,
    channel: input.channel,
    amountIdr: input.amountIdr,
    expiresAt: effectiveExpiry.toISOString(),
    qrString: opened.qrString,
    virtualAccounts,
    checkoutUrl: opened.checkoutUrl,
    deepLinks: opened.deepLinks,
  };
}

type Refetched = {
  status: PaymentStatusValue;
  amountPaidIdr: number;
  paidAt: Date | null;
  raw: unknown;
};

/**
 * A charge that exists in our database but was never opened at the gateway, or
 * whose status word we do not recognise.
 *
 * Both answer "no money has arrived", which is the only safe reading of "we do
 * not know". The hold sweep cancels it in due course; nothing here promotes an
 * unfamiliar status to PAID.
 */
function notPaid(raw: unknown): Refetched {
  return { status: "PENDING", amountPaidIdr: 0, paidAt: null, raw };
}

/** Whole rupiah, never negative, and only when money actually settled. */
function settledAmount(status: PaymentStatusValue, amount: number | null): number {
  if (status !== "PAID" && status !== "PARTIALLY_REFUNDED") return 0;
  if (amount === null || amount < 0) return 0;
  return Math.round(amount);
}

/** Invoice vocabulary. `null` for anything not on this list — see `notPaid`. */
function mapInvoiceStatus(status: string | null): PaymentStatusValue | null {
  switch (status) {
    case "PENDING":
      return "PENDING";
    /* SETTLED is PAID plus the money having reached the merchant balance. The
       customer is done either way, and the booking should not wait on Xendit's
       settlement cycle. */
    case "PAID":
    case "SETTLED":
      return "PAID";
    case "EXPIRED":
      return "EXPIRED";
    case "FAILED":
      return "FAILED";
    default:
      return null;
  }
}

/** E-wallet charge vocabulary, which shares no words with the invoice one. */
function mapEwalletStatus(status: string | null): PaymentStatusValue | null {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "SUCCEEDED":
      return "PAID";
    /* VOIDED is a charge cancelled before it was captured. It is not a refund —
       no money moved — so it belongs with the failures. */
    case "FAILED":
    case "VOIDED":
      return "FAILED";
    case "REFUNDED":
      return "REFUNDED";
    default:
      return null;
  }
}

async function refetchInvoice(providerId: string): Promise<Refetched> {
  const body = await xenditRequest<unknown>(
    `/v2/invoices/${encodeURIComponent(providerId)}`,
  );

  const status = mapInvoiceStatus(readString(body, "status"));
  if (!status) return notPaid(body);

  return {
    status,
    amountPaidIdr: settledAmount(status, readNumber(body, "paid_amount")),
    paidAt: readDate(body, "paid_at"),
    raw: body,
  };
}

async function refetchEwallet(providerId: string): Promise<Refetched> {
  const body = await xenditRequest<unknown>(
    `/ewallets/charges/${encodeURIComponent(providerId)}`,
  );

  const status = mapEwalletStatus(readString(body, "status"));
  if (!status) return notPaid(body);

  return {
    status,
    amountPaidIdr: settledAmount(
      status,
      readNumber(body, "capture_amount") ?? readNumber(body, "charge_amount"),
    ),
    /* TODO(xendit): confirm whether the charge carries a dedicated paid
       timestamp. `updated` is the moment it last changed, which for a succeeded
       charge is the moment it succeeded — close enough for a receipt, wrong if
       anything else touches the charge afterwards. */
    paidAt: readDate(body, "updated"),
    raw: body,
  };
}

/**
 * The transaction ledger, queried by our own reference.
 *
 * This exists because a virtual account is not a payment. `GET
 * /callback_virtual_accounts/{id}` describes the *account* — its bank, its
 * number, whether it is still open — and says nothing about whether anybody
 * transferred into it. Xendit reports that arrival by callback, and the
 * callback body is precisely what PAYMENT-PLAN §5 forbids us from trusting.
 * The ledger is the one place a virtual account payment can be confirmed
 * without believing the message that announced it.
 *
 * TODO(xendit): confirm the Transactions API — the path, that `reference_id`
 * filters on the `external_id` we sent, and the status words below. This is the
 * single least certain call in the file, and it is the one the virtual account
 * path depends on entirely. If it does not filter the way this assumes, the
 * alternative is to take the payment id out of the callback body and re-fetch
 * *that* over the API, which is still a re-fetch and still sound.
 */
async function refetchByLedger(providerRef: string): Promise<Refetched> {
  const body = await xenditRequest<unknown>(
    `/transactions?reference_id=${encodeURIComponent(providerRef)}&types=PAYMENT&limit=10`,
  );

  const entries = readArray(body, "data") ?? [];

  for (const entry of entries) {
    const status = readString(entry, "status");

    if (status === "SUCCESS") {
      return {
        status: "PAID",
        amountPaidIdr: settledAmount("PAID", readNumber(entry, "amount")),
        paidAt: readDate(entry, "settlement_timestamp") ?? readDate(entry, "created"),
        raw: body,
      };
    }

    if (status === "REVERSED") {
      return { status: "REFUNDED", amountPaidIdr: 0, paidAt: null, raw: body };
    }
  }

  /* An empty ledger is the normal answer while a customer is still walking to
     their banking app. It is not evidence of failure, and must not be read as
     one — expiry is the cron's job, on our own `expiresAt`. */
  return notPaid(body);
}

/**
 * QRIS payments hang off the QR code rather than replacing its status: the code
 * stays ACTIVE and the payments arrive against it.
 *
 * TODO(xendit): confirm `GET /qr_codes/{id}/payments` and its response shape.
 * The ledger fallback below covers the case where that path has moved, which
 * is likely enough to be worth the six lines.
 */
async function refetchQris(
  providerId: string,
  providerRef: string,
): Promise<Refetched> {
  let body: unknown;

  try {
    body = await xenditRequest<unknown>(
      `/qr_codes/${encodeURIComponent(providerId)}/payments`,
    );
  } catch (error) {
    if (error instanceof XenditError && error.status === 404) {
      return refetchByLedger(providerRef);
    }
    throw error;
  }

  const entries = readArray(body, "data") ?? (Array.isArray(body) ? body : []);

  for (const entry of entries) {
    if (readString(entry, "status") === "SUCCEEDED") {
      return {
        status: "PAID",
        amountPaidIdr: settledAmount("PAID", readNumber(entry, "amount")),
        paidAt: readDate(entry, "created"),
        raw: body,
      };
    }
  }

  return notPaid(body);
}

/**
 * Re-reads a charge from Xendit and returns the mapped status.
 * This is what the callback trusts — never the callback body.
 */
export async function refetchCharge(paymentId: string): Promise<{
  status: PaymentStatusValue;
  amountPaidIdr: number;
  paidAt: Date | null;
  raw: unknown;
} | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { channel: true, providerId: true, providerRef: true },
  });

  if (!payment) return null;

  switch (payment.channel) {
    /* The virtual account path needs no `providerId`: the ledger is queried by
       our own reference, which every row has from the moment it is created. */
    case "VIRTUAL_ACCOUNT":
      return refetchByLedger(payment.providerRef);

    case "QRIS":
      return payment.providerId
        ? refetchQris(payment.providerId, payment.providerRef)
        : notPaid(null);

    case "CARD":
      return payment.providerId
        ? refetchInvoice(payment.providerId)
        : notPaid(null);

    case "EWALLET":
      return payment.providerId
        ? refetchEwallet(payment.providerId)
        : notPaid(null);
  }
}
