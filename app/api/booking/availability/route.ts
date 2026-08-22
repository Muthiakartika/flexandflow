/**
 * `GET /api/booking/availability?staff=&variantId=&month=` — which days in the
 * month are worth clicking.
 *
 * The calendar needs an answer for every day at once, so this is deliberately
 * coarse: open, closed, full, or out of range. The slot list for a single day
 * comes from `/api/booking/slots`, and only once the customer has picked one.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { availabilityQuerySchema, fieldErrors } from "@/lib/booking/schema";
import { monthAvailability } from "@/lib/booking/slots";
import { ANY_STAFF } from "@/lib/booking/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  /* `therapistId` is BOOKING-PLAN §4.3's name for this parameter, `staff` is
     the schema's. Both are accepted; absent means "Any Staff". */
  const parsed = availabilityQuerySchema.safeParse({
    staff: params.get("staff") ?? params.get("therapistId") ?? ANY_STAFF,
    variantId: params.get("variantId") ?? "",
    month: params.get("month") ?? "",
  });

  if (!parsed.success) {
    return fail("VALIDATION", "That availability request is not valid.", {
      fields: fieldErrors(parsed.error),
    });
  }

  try {
    return ok(await monthAvailability(parsed.data));
  } catch (error) {
    console.error("[booking] GET /api/booking/availability failed", error);
    return serverError("We could not load the calendar. Please try again.");
  }
}
