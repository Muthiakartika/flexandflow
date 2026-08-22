"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BookingView,
  CreateBookingInput,
  MonthAvailability,
  ServiceCatalogue,
  SlotGroup,
  StaffOption,
  StaffSelection,
} from "@/lib/booking/types";
import { isApiError } from "@/lib/booking/types";
import type { IsoDate } from "@/lib/booking/time";

/**
 * Everything the wizard asks the server, in one typed place.
 *
 * Two things here are not incidental. `ApiError` is unwrapped into a real
 * `Error` subclass carrying `code` and `fields`, so a caller can react to
 * `SLOT_TAKEN` rather than print a sentence at the visitor; and every URL is
 * written with a trailing slash, because `trailingSlash: true` makes that the
 * canonical form — without it each call spends a 308 on the way in, and a POST
 * that is redirected is a POST that can be replayed.
 */
export class BookingApiError extends Error {
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(message: string, code: string, fields?: Record<string, string>) {
    super(message);
    this.name = "BookingApiError";
    this.code = code;
    this.fields = fields ?? {};
  }
}

const GENERIC =
  "Something went wrong on our side. Please try again in a moment.";

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* An HTML error page or an empty body — handled as a server error below. */
  }

  if (!response.ok) {
    if (isApiError(body)) {
      throw new BookingApiError(body.error, body.code, body.fields);
    }
    throw new BookingApiError(GENERIC, "SERVER");
  }

  return body as T;
}

const query = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

/**
 * Several endpoints wrap their payload in a named key — `{ staff }`,
 * `{ groups }`, `{ booking }` — so a later addition to the response does not
 * change the shape of what is already there. The two that return their object
 * whole (`services`, `availability`) already have a name for every field and
 * had nothing to wrap. Unwrapping happens here so no component has to know
 * which is which.
 */
export function fetchStaff(signal?: AbortSignal): Promise<StaffOption[]> {
  return request<{ staff: StaffOption[] }>("/api/booking/staff/", {
    signal,
  }).then((body) => body.staff);
}

export function fetchServices(
  staff: StaffSelection,
  signal?: AbortSignal,
): Promise<ServiceCatalogue> {
  return request<ServiceCatalogue>(
    `/api/booking/services/?${query({ staff })}`,
    { signal },
  );
}

export function fetchAvailability(
  staff: StaffSelection,
  variantId: string,
  month: string,
  signal?: AbortSignal,
): Promise<MonthAvailability> {
  return request<MonthAvailability>(
    `/api/booking/availability/?${query({ staff, variantId, month })}`,
    { signal },
  );
}

export function fetchSlots(
  staff: StaffSelection,
  variantId: string,
  date: IsoDate,
  signal?: AbortSignal,
): Promise<SlotGroup[]> {
  return request<{ date: IsoDate; groups: SlotGroup[] }>(
    `/api/booking/slots/?${query({ staff, variantId, date })}`,
    { signal },
  ).then((body) => body.groups);
}

/**
 * `BookingView` plus the two ids `GET /api/booking/[token]/` adds — the mirror
 * of `BookingViewWithIds` in `lib/booking/view.ts`, which is `server-only` and
 * so cannot be imported here. Nothing else on the site returns this shape; the
 * reschedule wizard needs it because open times are asked for by variant and
 * therapist, and a booking's service slug does not name either.
 */
export type BookingDetail = BookingView & {
  therapistId: string;
  variantId: string;
};

/** The booking behind a manage token. Rejects with `NOT_FOUND` for a bad one. */
export function fetchBooking(
  token: string,
  signal?: AbortSignal,
): Promise<BookingDetail> {
  return request<{ booking: BookingDetail }>(
    `/api/booking/${encodeURIComponent(token)}/`,
    { signal },
  ).then((body) => body.booking);
}

export function createBooking(input: CreateBookingInput): Promise<BookingView> {
  return request<{ booking: BookingView; reference: string }>("/api/booking/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((body) => body.booking);
}

/**
 * Moves an existing booking to a new time.
 *
 * Deliberately not `POST /api/booking/` with the old details: this is the same
 * booking, keeping its reference, its price and its therapist, and only the
 * start instant is sent. The server re-resolves the slot and refuses anything
 * it does not recognise, so the times offered here are checked again there.
 */
export function rescheduleBooking(
  token: string,
  startAt: string,
): Promise<BookingView> {
  return request<{ booking: BookingView }>(
    `/api/booking/${encodeURIComponent(token)}/reschedule/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt }),
    },
  ).then((body) => body.booking);
}

export type Resource<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

/**
 * One request, tied to a key.
 *
 * The wizard refetches whenever the staff, the service, the month or the day
 * changes, and a visitor clicking through months faster than the network
 * answers would otherwise see the older month's reply land last. The answer is
 * therefore stored *with* the key it belongs to, and read back only when that
 * key is still the current one: a superseded reply cannot paint, and the state
 * of a key that has not answered yet is derived rather than assigned, so no
 * request costs an extra render before it starts.
 */
export function useResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
): Resource<T> {
  const [answer, setAnswer] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  } | null>(null);

  /* `load` is written inline at every call site, so it is a new function on
     every render; the key is what decides when to refetch. Copied into a ref
     from an effect declared before the fetching one, so the fetch always sees
     the current closure without the key having to describe it. */
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;

    const controller = new AbortController();
    let live = true;

    loadRef
      .current(controller.signal)
      .then((data) => {
        if (live) setAnswer({ key, data, error: null });
      })
      .catch((cause: unknown) => {
        if (!live || controller.signal.aborted) return;
        setAnswer({
          key,
          data: null,
          error: cause instanceof Error ? cause.message : GENERIC,
        });
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [key]);

  const settled = answer !== null && answer.key === key;

  return {
    data: settled ? answer.data : null,
    error: settled ? answer.error : null,
    loading: key !== null && !settled,
  };
}

/**
 * A callback whose identity never changes but which always runs the latest
 * closure. The wizard's Continue and Confirm handlers read the whole state,
 * and without this every keystroke in the details step would hand the buttons
 * a new function.
 */
export function useEvent<A extends unknown[], R>(
  handler: (...args: A) => R,
): (...args: A) => R {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
