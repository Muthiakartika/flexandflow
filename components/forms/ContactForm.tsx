"use client";

import { Button } from "@/components/ui/Button";
import { FormSelect } from "@/components/ui/FormSelect";
import { FIELD, SELECT_CONTENT, SELECT_TRIGGER } from "@/components/ui/tokens";
import { contact } from "@/lib/site";

/** Service options, in the same order as the WordPress select. */
const serviceOptions = [
  "Select Services",
  "Sport Massage",
  "Lymphatic Drainage Massage",
  "Assisted Stretching",
  "Cupping Service",
  "Full Body Relaxing Massage",
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

/** Turns the submitted fields into the message WhatsApp opens with. */
function whatsappMessage(data: FormData): string {
  const name = forWhatsapp(String(data.get("your-name") ?? "").trim());
  const email = forWhatsapp(String(data.get("your-email") ?? "").trim());
  const service = forWhatsapp(String(data.get("How") ?? "").trim());
  const phone = forWhatsapp(String(data.get("phone") ?? "").trim());
  const message = forWhatsapp(String(data.get("your-message") ?? "").trim());

  const lines = [
    "Hi Flex & Flow, I'd like to get in touch.",
    "",
    `*Name:* ${name}`,
    `*Email:* ${email}`,
  ];

  if (service && service !== "Select Services") {
    lines.push(`*Service:* ${service}`);
  }

  lines.push(`*Phone:* ${phone}`);

  if (message) {
    /* `> ` is WhatsApp's block-quote marker; it applies per line, so a
       multi-line message needs it repeated rather than once at the top. */
    const quoted = message
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    lines.push("", "*Message:*", quoted);
  }

  return lines.join("\n");
}

/**
 * Contact form — submitting opens WhatsApp with the fields already written
 * into the message, rather than posting anywhere. Field names match the
 * original Contact Form 7 setup.
 *
 * Fields are labelled visibly rather than by placeholder alone: the original
 * relied on placeholders, which vanish as soon as anyone types.
 */
export default function ContactForm() {
  const label = "page-label mb-1.5 block";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const text = whatsappMessage(new FormData(event.currentTarget));
        window.open(
          `${contact.whatsapp}?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="your-name" className={label}>
            Name
          </label>
          <input
            id="your-name"
            name="your-name"
            type="text"
            required
            maxLength={400}
            autoComplete="name"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="your-email" className={label}>
            Email
          </label>
          <input
            id="your-email"
            name="your-email"
            type="email"
            required
            maxLength={400}
            autoComplete="email"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="service" className={label}>
            Service
          </label>
          <FormSelect
            id="service"
            name="How"
            defaultValue="Select Services"
            options={serviceOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            triggerClassName={SELECT_TRIGGER}
            contentClassName={SELECT_CONTENT}
          />
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="your-message" className={label}>
          Message
        </label>
        <textarea
          id="your-message"
          name="your-message"
          maxLength={2000}
          rows={4}
          className={`${FIELD} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid">
          Send Message
        </Button>
      </div>
    </form>
  );
}
