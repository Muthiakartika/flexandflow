/**
 * `GET /api/booking/slots?staff=&variantId=&date=` — one day's times.
 *
 * Grouped morning / afternoon / evening, the way the old BookingPress flow
 * presented them. Slots with nothing left are still returned so the UI can grey
 * them out rather than silently shortening the list, which is how a customer
 * ends up wondering whether the studio simply closes at three.
 */
import { fail, ok, serverError } from "@/lib/api/respond";
import { fieldErrors, slotsQuerySchema } from "@/lib/booking/schema";
import { slotsForDay } from "@/lib/booking/slots";
import { ANY_STAFF } from "@/lib/booking/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  /* `therapistId` is BOOKING-PLAN §4.3's name for this parameter, `staff` is
     the schema's. Both are accepted; absent means "Any Staff". */
  const parsed = slotsQuerySchema.safeParse({
    staff: params.get("staff") ?? params.get("therapistId") ?? ANY_STAFF,
    variantId: params.get("variantId") ?? "",
    date: params.get("date") ?? "",
  });

  if (!parsed.success) {
    return fail("VALIDATION", "That slot request is not valid.", {
      fields: fieldErrors(parsed.error),
    });
  }

  try {
    const groups = await slotsForDay(parsed.data);
    return ok({ date: parsed.data.date, groups });
  } catch (error) {
    console.error("[booking] GET /api/booking/slots failed", error);
    return serverError("We could not load those times. Please try again.");
  }
}
