/**
 * The intake API's response shape — a narrower parallel to
 * `lib/api/respond.ts`, which is typed to booking's `ApiError` and its
 * slot-related codes (`SLOT_TAKEN`, `CUTOFF_PASSED`, …) that do not apply to
 * a form with no availability to race over.
 */
import type { ApiError } from "@/lib/intake/types";

const STATUS: Record<ApiError["code"], number> = {
  VALIDATION: 400,
  RATE_LIMITED: 429,
  SPAM_REJECTED: 400,
  SERVER: 500,
};

const NO_STORE = { "cache-control": "no-store" } as const;

function withDefaults(init: ResponseInit | undefined): ResponseInit {
  const headers = new Headers(NO_STORE);
  for (const [key, value] of new Headers(init?.headers)) {
    headers.set(key, value);
  }
  return { ...init, headers };
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, withDefaults(init));
}

export function fail(
  code: ApiError["code"],
  message: string,
  fields?: Record<string, string>,
): Response {
  const body: ApiError = { error: message, code };
  if (fields && Object.keys(fields).length > 0) body.fields = fields;

  return Response.json(body, withDefaults({ status: STATUS[code] }));
}

export function serverError(
  message = "Something went wrong. Please try again.",
): Response {
  return fail("SERVER", message);
}
