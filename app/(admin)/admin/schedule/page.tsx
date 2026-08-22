import type { Metadata } from "next";

import { PageHeading, Panel } from "@/components/admin/primitives";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { TimeOffEditor } from "@/components/admin/TimeOffEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { loadSchedule, loadTimeOffConflicts } from "@/lib/admin/queries";
import { studioDateKey } from "@/lib/booking/time";

export const metadata: Metadata = {
  title: "Schedule",
};

/**
 * Working hours and time off — between them, the entire input to the
 * availability engine. Every slot the wizard offers is derived from these two
 * tables, so an empty week here means a booking page that offers nothing and
 * says nothing about why.
 */
export default async function AdminSchedulePage() {
  await requireAdmin();

  const now = new Date();
  const schedule = await loadSchedule(now);
  const timeOff = await loadTimeOffConflicts(schedule.timeOff);

  return (
    <>
      <PageHeading
        title="Schedule"
        lede="Weekly working hours and time off. All times are Bali time (WITA)."
      />

      <Panel
        title="Working hours"
        description="The repeating week. A day with no block is closed, and the wizard will not offer it."
      >
        {schedule.therapists.length === 0 ? (
          <p className="px-1 py-6 text-center text-[14px] text-faint">
            No therapists have been set up yet.
          </p>
        ) : (
          <ScheduleEditor therapists={schedule.therapists} />
        )}
      </Panel>

      <Panel title="Time off">
        <TimeOffEditor
          therapists={schedule.therapists}
          entries={timeOff}
          today={studioDateKey(now)}
        />
      </Panel>
    </>
  );
}
