/**
 * Intake submission reference codes — the short string a client's confirmation
 * refers to and the admin panel lists by. Same shape as
 * `lib/booking/reference.ts`, a different prefix.
 */
import { customAlphabet } from "nanoid";

/** Crockford-ish: no `I`, `L`, `O`, `U`, `0`, `1`. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

const generate = customAlphabet(ALPHABET, 5);

/** `IN-8KQ2M`. */
export function createIntakeReference(): string {
  return `IN-${generate()}`;
}
