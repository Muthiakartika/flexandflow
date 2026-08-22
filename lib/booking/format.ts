/**
 * How booking figures are written, in one place.
 *
 * `lib/pricing.ts` does the same job for the marketing pages, and its
 * `formatIdr` is the form the rest of the site already shows ("IDR 750,000").
 * Booking follows it rather than inventing a second money style — a visitor
 * who sees "IDR 750,000" on the service page and "Rp750,000.00" in the wizard
 * has reason to wonder whether they are the same price.
 *
 * Safe to import from client components.
 */

/** `750000` → `"IDR 750,000"`. Matches `lib/pricing.ts`. */
export function formatIdr(amount: number): string {
  return `IDR ${Math.round(amount).toLocaleString("en-US")}`;
}

/** `750000` → `"Rp750.000"`, for WhatsApp messages written in Indonesian. */
export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

/** `90` → `"1 hr 30 mins"`, the phrasing `lib/data/services.ts` already uses. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hr`;

  return rest === 0 ? hourPart : `${hourPart} ${rest} mins`;
}

/** `90` → `"90 m"`, the compact form the service cards show. */
export function formatDurationShort(minutes: number): string {
  return `${minutes} m`;
}

/** "Ginny" / "Ginny Wijaya" — whatever the customer actually gave us. */
export function fullName(
  firstName: string,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

/**
 * `+6281234567890` → `+62 812-3456-7890`, for display only.
 * Never feed this back to WAHA — it wants the unpunctuated E.164 form.
 */
export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  if (!digits.startsWith("62") || digits.length < 10) return e164;

  const national = digits.slice(2);
  const head = national.slice(0, 3);
  const middle = national.slice(3, 7);
  const tail = national.slice(7);

  return `+62 ${[head, middle, tail].filter(Boolean).join("-")}`;
}

/** `+6281234567890` → a `wa.me` link admins can tap to reply. */
export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
