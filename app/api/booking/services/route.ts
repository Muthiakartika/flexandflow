/**
 * `GET /api/booking/services?staff=` — step two of the wizard.
 *
 * The catalogue filtered to what the chosen therapist can actually deliver, at
 * the price band their tier sets. Ginny and Yuni do not carry the same list and
 * do not charge the same, so a service step that ignored the staff choice would
 * offer sessions that cannot be booked at prices that do not exist.
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { listCatalogue } from "@/lib/booking/catalogue";
import { fieldErrors, staffSchema } from "@/lib/booking/schema";
import { ANY_STAFF } from "@/lib/booking/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  /* `therapistId` is the name BOOKING-PLAN §4.3 gives this parameter and
     `staff` is the name `lib/booking/schema.ts` gives it. Both are accepted so
     the two documents cannot be in conflict. Absent means no preference, which
     is exactly what "Any Staff" is. */
  const parsed = staffSchema.safeParse(
    params.get("staff") ?? params.get("therapistId") ?? ANY_STAFF,
  );

  if (!parsed.success) {
    return fail("VALIDATION", "That is not a valid therapist.", {
      fields: fieldErrors(parsed.error),
    });
  }

  try {
    return ok(await listCatalogue(parsed.data));
  } catch (error) {
    console.error("[booking] GET /api/booking/services failed", error);
    return serverError("We could not load the services. Please try again.");
  }
}
