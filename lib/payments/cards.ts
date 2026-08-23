/**
 * Charging a card the customer typed on our own page.
 *
 * The card number never reaches this server. Xendit.js swaps it for a token in
 * the browser, and what arrives here is that token — useless to anyone who
 * intercepts it, single-use, and worthless without the secret key. That is what
 * keeps the form on our domain without the studio holding card data.
 *
 * 3-D Secure still belongs to the issuing bank, but it no longer means leaving
 * the page. 3DS 2 was designed to be embedded — the specification even fixes
 * the challenge window sizes so a merchant can frame it — so the bank's screen
 * appears inside the payment modal rather than replacing it.
 *
 * The flow, and each step's owner:
 *
 *   browser   Xendit.js tokenises the card
 *   browser   if the bank wants a challenge, renders `payer_authentication_url`
 *             in an iframe and waits for it to finish
 *   here      charges the token, with the authentication id when there was one
 *   here      settles the payment and confirms the booking
 *
 * PCI: collecting the fields on our page moves the studio from SAQ A to
 * SAQ A-EP. The values still go straight to Xendit and are never stored, but
 * the page that gathers them is ours now, and that is a real change in what the
 * studio is answerable for. Recorded here because it is invisible in the code.
 */
import "server-only";

import { PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  XenditError,
  readNumber,
  readRecord,
  readString,
  xenditRequest,
} from "@/lib/payments/xendit";

export type ChargeCardInput = {
  paymentId: string;
  /** Single-use token from `Xendit.card.createToken` in the browser. */
  tokenId: string;
  /** Present only when the bank asked for a challenge and it succeeded. */
  authenticationId?: string | null;
};

export type ChargeCardResult =
  | { ok: true; status: "PAID" }
  | { ok: false; code: "DECLINED" | "NOT_FOUND" | "ALREADY_SETTLED" | "ERROR"; message: string };

/**
 * Xendit's card statuses, mapped onto ours.
 *
 * `CAPTURED` is the only one that means money moved. Everything else is
 * refused, and the reason is worth passing through: "insufficient funds" and
 * "the bank declined" send a customer to different next steps.
 */
function decline(body: unknown): ChargeCardResult {
  const status = readString(body, "status") ?? "FAILED";
  const failure = readString(body, "failure_reason");

  const message =
    failure === "INSUFFICIENT_BALANCE"
      ? "That card does not have enough available balance."
      : failure === "STOLEN_CARD" || failure === "INACTIVE_OR_UNAUTHORIZED_CARD"
        ? "Your bank refused that card. Please try another one."
        : failure === "EXPIRED_CARD"
          ? "That card has expired."
          : failure === "AUTHENTICATION_FAILED"
            ? "The card verification did not complete. Please try again."
            : `Your bank declined the payment (${failure ?? status}).`;

  return { ok: false, code: "DECLINED", message };
}

/**
 * Charges a tokenised card against a pending payment.
 *
 * The amount is read from the `Payment` row, never from the request: the
 * browser holds a token and nothing else that this decision should depend on.
 */
export async function chargeCardToken(
  input: ChargeCardInput,
): Promise<ChargeCardResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      status: true,
      amountIdr: true,
      providerRef: true,
      channel: true,
    },
  });

  if (!payment || payment.channel !== "CARD") {
    return { ok: false, code: "NOT_FOUND", message: "No such card payment." };
  }

  /* A charge that already collected must not be attempted twice — a customer
     who double-submits the form would otherwise be billed twice for one
     session, and refunding that is a bank transfer somebody makes by hand. */
  if (payment.status !== PaymentStatus.PENDING) {
    return {
      ok: false,
      code: "ALREADY_SETTLED",
      message: "That payment has already been dealt with.",
    };
  }

  let body: unknown;

  try {
    body = await xenditRequest<unknown>("/credit_card_charges", {
      method: "POST",
      /* The payment's own reference: a network retry cannot become a second
         charge, because Xendit recognises the key and returns the first one. */
      idempotencyKey: payment.providerRef,
      body: {
        token_id: input.tokenId,
        external_id: payment.providerRef,
        amount: payment.amountIdr,
        currency: "IDR",
        capture: true,
        ...(input.authenticationId
          ? { authentication_id: input.authenticationId }
          : {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof XenditError
        ? `Your bank could not be reached (${error.errorCode ?? error.status}).`
        : "We could not reach the card network.";

    await prisma.payment.update({
      where: { id: payment.id },
      data: { lastError: message.slice(0, 300) },
    });

    return { ok: false, code: "ERROR", message };
  }

  const status = readString(body, "status");
  const chargeId = readString(body, "id");

  if (status !== "CAPTURED") {
    const refusal = decline(body);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerId: chargeId,
        rawPayload: body as never,
        lastError: refusal.ok ? null : refusal.message.slice(0, 300),
      },
    });

    return refusal;
  }

  /* Written here rather than left to the callback. Xendit will send one too,
     and `settlePayment` is idempotent, but the customer is watching this
     request finish — waiting on a webhook to tell them what they already know
     would be a blank modal for no reason. */
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      providerId: chargeId,
      amountPaidIdr: readNumber(body, "capture_amount") ?? payment.amountIdr,
      paidAt: new Date(),
      rawPayload: body as never,
      lastError: null,
    },
  });

  return { ok: true, status: "PAID" };
}

/**
 * A card charge's current state, for `refetchCharge`.
 *
 * Separate from the creation path because a card is the one channel whose
 * `providerId` does not exist until it has been charged: before that there is
 * a row waiting for a token and nothing at Xendit to ask about.
 */
export async function readCardCharge(providerId: string): Promise<{
  status: "PAID" | "FAILED" | "PENDING";
  amountPaidIdr: number;
  paidAt: Date | null;
  raw: unknown;
}> {
  const body = await xenditRequest<unknown>(
    `/credit_card_charges/${encodeURIComponent(providerId)}`,
    { method: "GET" },
  );

  const status = readString(body, "status");
  const captured = status === "CAPTURED";

  return {
    status: captured ? "PAID" : status === "AUTHORISED" ? "PENDING" : "FAILED",
    amountPaidIdr: captured
      ? (readNumber(body, "capture_amount") ?? readNumber(body, "amount") ?? 0)
      : 0,
    paidAt: captured ? new Date() : null,
    raw: body,
  };
}

export { readRecord };
