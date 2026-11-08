"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormSelect } from "@/components/ui/FormSelect";
import { FIELD, FOCUS, SELECT_CONTENT, SELECT_TRIGGER } from "@/components/ui/tokens";
import { contact, homeServiceSlugs } from "@/lib/site";
import { TREATMENT_NAMES, TREATMENT_ORDER } from "@/lib/treatments";

/* Trauma healing is Ginny's alone (the price list, `lib/data/priceList.ts`). */
const GINNY_ONLY = new Set(["trauma-healing"]);

const TIMES = [
  { value: "Any time", label: "Any time, 09:00–17:00" },
  { value: "Morning, 09:00–12:00", label: "Morning, 09:00–12:00" },
  { value: "Midday, 12:00–14:00", label: "Midday, 12:00–14:00" },
  { value: "Afternoon, 14:00–17:00", label: "Afternoon, 14:00–17:00" },
];

/**
 * A field value, safe to drop into the WhatsApp message. `*`, `_`, `~` and
 * backtick are WhatsApp's own bold/italic/strikethrough/code markers — one
 * stray character typed into "Message" would otherwise bend the formatting
 * of everything after it.
 */
function forWhatsapp(value: string): string {
  return value.replace(/[*_~`]/g, "");
}

/** A date input's `YYYY-MM-DD` as a local date, not UTC midnight. */
function localDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Tue 12 Nov". */
function dayLabel(value: string): string {
  return localDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function todayValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * A booking request: the treatment, studio or villa, the team or Ginny, a
 * day and a time, and a name. Submitting opens WhatsApp with it written out,
 * rather than posting anywhere, so it needs no server and the studio
 * confirms the time in the same chat. It holds no slot; the booking site
 * (`bookingCtaHref`) is the place for that.
 *
 * It replaced a general contact form that asked for an email and a phone
 * number (WhatsApp already has the number), listed a treatment the studio
 * no longer offers, and never asked the two things a booking needs: where,
 * and when. The villa choice drops the studio-only treatment, a Sunday is
 * refused before WhatsApp opens, and the team is the default, Ginny the
 * step up (DESIGN.md, copy rule).
 */
export default function BookingRequestForm() {
  const [where, setWhere] = useState<"studio" | "villa">("studio");
  const [treatment, setTreatment] = useState("");
  const [withGinny, setWithGinny] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState(TIMES[0].value);

  const ginnyOnly = GINNY_ONLY.has(treatment);
  const sunday = day !== "" && localDate(day).getDay() === 0;
  const options = [
    { value: "", label: "Not sure yet: help me choose" },
    ...TREATMENT_ORDER.filter((slug) => where === "studio" || homeServiceSlugs.has(slug)).map(
      (slug) => ({ value: slug, label: TREATMENT_NAMES[slug] }),
    ),
  ];

  const pickWhere = (next: "studio" | "villa") => {
    setWhere(next);
    if (next === "villa" && treatment && !homeServiceSlugs.has(treatment)) setTreatment("");
  };

  const label = "page-label mb-1.5 block";
  const tab = (active: boolean) =>
    `rounded-full px-4 py-2.5 font-body text-[13px] leading-none whitespace-nowrap transition-colors duration-300 ${FOCUS} ${
      active ? "bg-primary-strong font-bold text-white" : "text-body-text/65 hover:text-body-text"
    }`;
  const track = "grid grid-cols-2 gap-1 rounded-full border border-secondary/12 bg-cream p-1";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (sunday) return;
        const data = new FormData(event.currentTarget);
        const field = (key: string) => forWhatsapp(String(data.get(key) ?? "").trim());
        const staying = field("staying");
        const message = field("message");

        const lines = [
          "Hi Flex & Flow! I'd like to book a session.",
          "",
          `*Treatment:* ${treatment ? TREATMENT_NAMES[treatment] : "Not sure yet, please suggest one"}`,
          `*Where:* ${where === "villa" ? `At my villa: ${staying}` : "At the studio"}`,
          `*With:* ${ginnyOnly ? "Ginny" : withGinny ? "Ginny, if she has space" : "One of your therapists"}`,
          `*Day:* ${day ? dayLabel(day) : "Flexible"}`,
          `*Time:* ${time}`,
          `*Name:* ${field("name")}`,
        ];
        if (message) {
          /* `> ` is WhatsApp's block-quote marker; it applies per line, so a
             multi-line message needs it repeated rather than once at the top. */
          lines.push("", ...message.split("\n").map((line) => `> ${line}`));
        }

        window.open(
          `${contact.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`,
          "_blank",
          "noopener,noreferrer",
        );
      }}
    >
      <div>
        <p id="request-where" className={label}>
          Where
        </p>
        <div role="group" aria-labelledby="request-where" className={track}>
          <button type="button" aria-pressed={where === "studio"} onClick={() => pickWhere("studio")} className={tab(where === "studio")}>
            At the studio
          </button>
          <button type="button" aria-pressed={where === "villa"} onClick={() => pickWhere("villa")} className={tab(where === "villa")}>
            At your villa
          </button>
        </div>
      </div>

      {where === "villa" ? (
        <div>
          <label htmlFor="request-staying" className={label}>
            Where you are staying
          </label>
          <input
            id="request-staying"
            name="staying"
            type="text"
            required
            maxLength={200}
            placeholder="Villa or hotel name, and the area"
            className={FIELD}
          />
          <p className="mt-1.5 font-body text-[12px] leading-[1.4] text-body-text/60">
            Ungasan to Balangan, plus IDR 100,000 per visit. Not sure you are in range? Ask in
            your message.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="request-treatment" className={label}>
            Treatment
          </label>
          <FormSelect
            id="request-treatment"
            value={treatment}
            onValueChange={setTreatment}
            options={options}
            triggerClassName={SELECT_TRIGGER}
            contentClassName={SELECT_CONTENT}
          />
        </div>

        <div>
          <p id="request-with" className={label}>
            With
          </p>
          {ginnyOnly ? (
            <p className="flex min-h-[46px] items-center font-body text-[14px] text-body-text/75">
              Ginny only: trauma healing is hers alone.
            </p>
          ) : (
            <div role="group" aria-labelledby="request-with" className={track}>
              <button type="button" aria-pressed={!withGinny} onClick={() => setWithGinny(false)} className={tab(!withGinny)}>
                Our therapists
              </button>
              <button type="button" aria-pressed={withGinny} onClick={() => setWithGinny(true)} className={tab(withGinny)}>
                Ginny
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="request-day" className={label}>
            Preferred day
          </label>
          <input
            id="request-day"
            type="date"
            /* Set in the browser: the page is prerendered, so a date worked
               out on the server would be the build's, not today's. */
            ref={(input) => {
              if (input) input.min = todayValue();
            }}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-invalid={sunday || undefined}
            aria-describedby={sunday ? "request-day-note" : undefined}
            className={FIELD}
          />
          {sunday ? (
            <p id="request-day-note" className="mt-1.5 font-body text-[12px] leading-[1.4] text-danger">
              We are closed on Sunday. Pick Monday to Saturday.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="request-time" className={label}>
            Preferred time
          </label>
          <FormSelect
            id="request-time"
            value={time}
            onValueChange={setTime}
            options={TIMES}
            triggerClassName={SELECT_TRIGGER}
            contentClassName={SELECT_CONTENT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="request-name" className={label}>
          Your name
        </label>
        <input
          id="request-name"
          name="name"
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="request-message" className={label}>
          Anything we should know <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="request-message"
          name="message"
          maxLength={2000}
          rows={3}
          placeholder="An injury, how far along you are, the areas to focus on"
          className={`${FIELD} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" variant="solid" disabled={sunday}>
          Send on WhatsApp
        </Button>
        <p className="font-body text-[12px] leading-[1.4] text-body-text/60">
          Opens WhatsApp with this written out. We confirm the time there.
        </p>
      </div>
    </form>
  );
}
