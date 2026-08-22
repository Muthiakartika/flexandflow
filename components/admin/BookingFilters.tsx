import Link from "next/link";

import type {
  BookingFilters as Filters,
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
 * A plain `method="get"` form, not a server action.
 *
 * Filters belong in the URL: the studio bookmarks "this month, Ginny", sends
 * that link to the other admin, and reloads it after making a change. A form
 * that posted state nowhere the address bar could see would break all three,
 * and this way the whole page works with JavaScript switched off.
 */
export function BookingFilters({
  filters,
  therapists,
}: {
  filters: Filters;
  therapists: TherapistOption[];
}) {
  return (
    <form
      method="get"
      action="/admin/bookings/"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
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
        <select
          id="filter-therapist"
          name="therapistId"
          defaultValue={filters.therapistId ?? ""}
          className="admin-input"
        >
          <option value="">Everyone</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.name}
              {therapist.active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="admin-label" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          name="status"
          defaultValue={filters.status ?? ""}
          className="admin-input"
        >
          <option value="">Any status</option>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button type="submit" className="admin-btn admin-btn-solid">
          Filter
        </button>
        <Link href="/admin/bookings/" className="admin-btn admin-btn-quiet">
          Clear
        </Link>
      </div>
    </form>
  );
}
