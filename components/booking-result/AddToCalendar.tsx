"use client";

import { useState } from "react";

import { BTN_GHOST, BTN_SOLID, CARD } from "@/components/ui/tokens";

/**
 * The three ways this appointment reaches a calendar.
 *
 * A download link that opens the calendar app is not what anyone expects a
 * download link to do, and on a phone that is exactly what happens — so the
 * `.ics` route says so, and confirms afterwards that something was handed over.
 * That acknowledgement is the reason this is a client component: on a desktop
 * the file lands silently in the downloads folder, and people who see nothing
 * happen tap the button again.
 */
export default function AddToCalendar({
  googleUrl,
  icsUrl,
  emailed,
}: {
  googleUrl: string;
  icsUrl: string;
  /** Only true when the booking carries an email address to attach it to. */
  emailed: boolean;
}) {
  const [handedOver, setHandedOver] = useState(false);

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN_SOLID}
        >
          Add to Google Calendar
        </a>

        <a
          href={icsUrl}
          onClick={() => setHandedOver(true)}
          className={BTN_GHOST}
        >
          Add to Apple / Outlook (.ics)
        </a>
      </div>

      <p className="mt-4 font-body text-[14px] leading-[1.7] text-body-text/75">
        On a phone, tapping the <code className="font-body">.ics</code> opens
        your calendar app and offers to add the session. On a computer it saves
        a file — open it and your calendar takes it from there.
      </p>

      {/* The region has to be in the DOM before it fills, or assistive tech has
          nothing to watch; the sentence inside is rendered only once the link
          has been used, so nothing ships hidden. */}
      <div role="status">
        {handedOver ? (
          <p className="mt-3 font-body text-[14px] leading-[1.7] text-primary-strong">
            The .ics file has been handed to your device. If nothing opened,
            look in your downloads and open it from there.
          </p>
        ) : null}
      </div>

      {emailed ? (
        <p className="mt-3 border-t border-secondary/10 pt-3 font-body text-[14px] leading-[1.7] text-body-text/75">
          The same file is attached to your confirmation email, so you can add
          it later from your phone without coming back here.
        </p>
      ) : null}
    </div>
  );
}
