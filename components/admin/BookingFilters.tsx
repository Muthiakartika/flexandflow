"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";

import { AdminSelect, type SelectOption } from "@/components/admin/AdminSelect";
import { PendingLink } from "@/components/admin/PendingLink";
import type {
  BookingFilters as Filters,
  PaymentFilterValue,
  TherapistOption,
} from "@/lib/admin/queries";
import type { BookingStatusValue } from "@/lib/booking/types";

const STATUSES: { value: BookingStatusValue; label: string }[] = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
  { value: "PENDING", label: "Pending" },
];

/**
 * Coarser than the payment column on purpose — a filter has to be a `WHERE`,
 * and "paid in full" compares two columns of the same row. `paymentWhere` in
 * `lib/admin/queries.ts` says what each one asks the database.
 */
const PAYMENTS: { value: PaymentFilterValue; label: string }[] = [
  { value: "at_studio", label: "Pay at studio" },
  { value: "unpaid", label: "Awaiting payment" },
  { value: "paid", label: "Paid online" },
  { value: "refunded", label: "Refunded" },
];

/**
 * A plain `method="get"` form, not a server action.
 *
 * Filters belong in the URL: the studio bookmarks "this month, Ginny", sends
 * that link to the other admin, and reloads it after making a change. A form
 * that posted state nowhere the address bar could see would break all three.
 *
 * It used to be a server component that also worked with JavaScript switched
 * off. The dropdowns are shadcn/ui now, which is Radix, which is a client
 * component — so this whole form is one too, and the no-JS path is gone. The
 * URL contract is not: every filter is still a query parameter, the form is
 * still a GET, and typing `?status=CANCELLED` by hand still works. Only the
 * three controls need scripting.
 *
 * Submitting goes through `router.push` inside a transition rather than
 * letting the browser navigate. A native GET submit is a full document load:
 * the panel's layout re-renders, its session query runs again, and the studio
 * sits on the old table with nothing happening until the whole page comes
 * back. Through the router it is a client navigation, which means the button
 * can say it is working and `bookings/loading.tsx` can put a skeleton where
 * the table is. `method="get"` and `action` stay on the element so that if the
 * script has not loaded, the browser still does the old thing.
 */
export function BookingFilters({
  filters,
  therapists,
}: {
  filters: Filters;
  therapists: TherapistOption[];
}) {
  const router = useRouter();
  const [filtering, startFiltering] = useTransition();

  /**
   * The same URL the browser would have built, built here instead.
   *
   * Empty values are dropped rather than sent as `status=`, so a cleared
   * filter leaves the address bar as short as it was before anyone touched it.
   * `page` is deliberately not carried: changing a filter and landing on page
   * four of a result set that now has two pages is not what anybody meant.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = new URLSearchParams();
    for (const [field, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === "string" && value !== "") query.set(field, value);
    }

    const search = query.toString();
    startFiltering(() => {
      router.push(search ? `/admin/bookings/?${search}` : "/admin/bookings/");
    });
  }

  /* The empty value is the "no filter" row. `FormSelect` swaps it for a
     sentinel on the way into Radix, which refuses an empty one, and unwinds it
     again for the hidden input the form submits. */
  const therapistOptions: SelectOption[] = [
    { value: "", label: "Everyone" },
    ...therapists.map((therapist) => ({
      value: therapist.id,
      label: therapist.active ? therapist.name : `${therapist.name} (inactive)`,
    })),
  ];

  const statusOptions: SelectOption[] = [
    { value: "", label: "Any status" },
    ...STATUSES,
  ];

  const paymentOptions: SelectOption[] = [
    { value: "", label: "Any payment" },
    ...PAYMENTS,
  ];

  return (
    <form
      method="get"
      action="/admin/bookings/"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div>
        <label className="admin-label" htmlFor="filter-from">
          From
        </label>
        <input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={filters.from ?? ""}
          className="admin-input"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="filter-to">
          To
        </label>
        <input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={filters.to ?? ""}
          className="admin-input"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="filter-therapist">
          Therapist
        </label>
        <AdminSelect
          id="filter-therapist"
          name="therapistId"
          defaultValue={filters.therapistId ?? ""}
          options={therapistOptions}
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="filter-status">
          Status
        </label>
        <AdminSelect
          id="filter-status"
          name="status"
          defaultValue={filters.status ?? ""}
          options={statusOptions}
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="filter-payment">
          Payment
        </label>
        <AdminSelect
          id="filter-payment"
          name="payment"
          defaultValue={filters.payment ?? ""}
          options={paymentOptions}
        />
      </div>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={filtering}
          className="admin-btn admin-btn-solid"
        >
          {filtering ? "Filtering…" : "Filter"}
        </button>
        <PendingLink
          href="/admin/bookings/"
          className="admin-btn admin-btn-quiet"
        >
          Clear
        </PendingLink>
      </div>
    </form>
  );
}
