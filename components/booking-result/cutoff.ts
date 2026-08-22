/**
 * The cancellation window in words.
 *
 * `BOOKING_CANCEL_CUTOFF_HOURS` is a number the studio can change; the sentence
 * around it should not have to be rewritten when they do, and "up to 24 hours"
 * is not how anyone says a day.
 */
export function cutoffWindow(hours: number): string {
  if (hours <= 0) return "right up until it starts";

  if (hours % 24 === 0) {
    const days = hours / 24;
    return `up to ${days === 1 ? "a day" : `${days} days`} before it starts`;
  }

  return `up to ${hours === 1 ? "an hour" : `${hours} hours`} before it starts`;
}
