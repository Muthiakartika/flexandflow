/**
 * Booking reference codes — the short string a customer reads out on the phone
 * or quotes in a WhatsApp reply.
 *
 * Not the primary key, and not derived from it: `cuid()` is 25 characters of
 * mixed case, which nobody can dictate. This is deliberately short and
 * unambiguous instead.
 */
import { customAlphabet } from "nanoid";

/**
 * Crockford-ish: no `I`, `L`, `O`, `U`, `0`, `1`. Every remaining character
 * survives being read aloud, written down, and typed back in.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

const generate = customAlphabet(ALPHABET, 5);

/** `FF-8KQ2M`. 30^5 ≈ 24 million — collisions are handled by a unique index. */
export function createReference(): string {
  return `FF-${generate()}`;
}

const REFERENCE = /^FF-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/;

/** Accepts what a human typed: lowercase, missing dash, stray spaces. */
export function normaliseReference(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/[\s_]/g, "");
  const withDash = cleaned.startsWith("FF-")
    ? cleaned
    : cleaned.startsWith("FF")
      ? `FF-${cleaned.slice(2)}`
      : cleaned;

  return REFERENCE.test(withDash) ? withDash : null;
}
