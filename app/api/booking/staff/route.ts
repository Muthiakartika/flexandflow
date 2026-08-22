/**
 * `GET /api/booking/staff` — step one of the wizard.
 *
 * Active therapists with their tier label, in the order the studio wants them
 * shown. The "Any Staff" option is not returned: it is a client-side sentinel
 * (`ANY_STAFF` in `lib/booking/types.ts`), not a person, and putting it in this
 * list would eventually see it treated as one.
 */
import { ok, serverError } from "@/lib/api/respond";
import { listStaff } from "@/lib/booking/catalogue";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return ok({ staff: await listStaff() });
  } catch (error) {
    console.error("[booking] GET /api/booking/staff failed", error);
    return serverError("We could not load the therapists. Please try again.");
  }
}
