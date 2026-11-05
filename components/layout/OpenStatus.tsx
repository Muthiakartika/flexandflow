"use client";

import { useEffect, useState } from "react";

import { openingSchedule, shortHours } from "@/lib/site";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Status = { open: boolean; label: string; detail: string };

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Open or closed at `date`, in the studio's own time zone, and when that changes. */
function statusAt(date: Date): Status {
  const { timeZone, days, opens, closes } = openingSchedule;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = WEEKDAYS.indexOf(part("weekday"));
  const now = Number(part("hour")) * 60 + Number(part("minute"));
  const openToday = (days as readonly number[]).includes(day);

  if (openToday && now >= toMinutes(opens) && now < toMinutes(closes)) {
    return { open: true, label: "Open now", detail: `until ${closes}, Bali time` };
  }
  if (openToday && now < toMinutes(opens)) {
    return { open: false, label: "Closed", detail: `opens today at ${opens}, Bali time` };
  }
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const next = (day + ahead) % 7;
    if ((days as readonly number[]).includes(next)) {
      const when = ahead === 1 ? "tomorrow" : DAY_NAMES[next];
      return { open: false, label: "Closed", detail: `opens ${when} at ${opens}, Bali time` };
    }
  }
  return { open: false, label: "Closed", detail: shortHours };
}

/**
 * "Open now · until 17:00, Bali time", worked out in the visitor's browser
 * from `openingSchedule`. The server cannot say it: pages are cached, and a
 * visitor is rarely in Bali's time zone. Until it mounts it shows the plain
 * hours, so the first paint and the hydrated page agree.
 */
export default function OpenStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const tick = () => setStatus(statusAt(new Date()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-[14px] leading-snug">
      <span
        aria-hidden
        className={`open-dot h-2 w-2 shrink-0 rounded-full ${
          status?.open ? "is-open bg-primary" : "bg-body-text/30"
        }`}
      />
      <span className="font-bold">{status ? status.label : "Open"}</span>
      <span className="text-body-text/60 tabular-nums">
        {status ? status.detail : shortHours}
      </span>
    </p>
  );
}
