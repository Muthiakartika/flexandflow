/**
 * The one shape every booking endpoint answers in.
 *
 * The wizard is a five-step flow where any step can fail, and it has to react
 * differently to each failure — a taken slot sends the customer back to the
 * calendar, a validation error highlights a field, a rate limit says "try
 * again shortly". If each route invented its own error body the client would
 * need a parser per endpoint, and one of them would eventually disagree.
 *
 * So: success is the payload, verbatim. Failure is always `ApiError` from
 * `lib/booking/types.ts`, with a machine-readable `code` the wizard switches
 * on and a `message` it can show as-is.
 */
import type { ApiError } from "@/lib/booking/types";

/**
 * The HTTP status each code answers with, decided once here rather than at
 * every call site — the same failure returning 400 from one route and 409
 * from another is the kind of thing nobody notices until a retry loop does.
 *
 * 409 for the three slot-related codes: nothing about the request was
 * malformed, the world simply moved underneath it.
 */
const STATUS: Record<ApiError["code"], number> = {
  VALIDATION: 400,
  SLOT_TAKEN: 409,
  SLOT_INVALID: 409,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SPAM_REJECTED: 400,
  CUTOFF_PASSED: 409,
  ALREADY_CANCELLED: 409,
  SERVER: 500,
};

/**
 * Booking data is never cacheable. A slot list that is thirty seconds stale
 * offers the customer an appointment somebody else already has, so every
 * response goes out `no-store` unless a caller deliberately says otherwise.
 */
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

export type FailOptions = {
  /** Field-level messages, normally `fieldErrors(parsed.error)`. */
  fields?: Record<string, string>;
  /**
   * Overrides the code's status. Used by the cron routes, which need a 401
   * and have no customer-facing code to express it — see the comment there.
   */
  status?: number;
  headers?: HeadersInit;
  /** Only meaningful with `SLOT_TAKEN`; see `ApiError.resume`. */
  resume?: { reference: string; manageToken: string };
};

export function fail(
  code: ApiError["code"],
  message: string,
  options: FailOptions = {},
): Response {
  const body: ApiError = { error: message, code };
  if (options.fields && Object.keys(options.fields).length > 0) {
    body.fields = options.fields;
  }
  if (options.resume) body.resume = options.resume;

  return Response.json(
    body,
    withDefaults({
      status: options.status ?? STATUS[code],
      headers: options.headers,
    }),
  );
}

/** What every route's outer `catch` returns. Details stay in the log. */
export function serverError(message = "Something went wrong. Please try again."): Response {
  return fail("SERVER", message);
}
