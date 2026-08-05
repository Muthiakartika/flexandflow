"use client";

import { useState } from "react";
import { Button } from "@/components/academy/button";
import { Field, SelectField, TextareaField } from "@/components/academy/field";
import { DISCIPLINES } from "@/lib/academy";

const INTERESTS = ["Online course", "Onsite course", "Materials only", "Not sure yet"];

const TOPICS = DISCIPLINES.map((discipline) => discipline.title);

type Form = {
  name: string;
  email: string;
  interest: string;
  discipline: string;
  message: string;
};

const EMPTY: Form = {
  name: "",
  email: "",
  interest: "",
  discipline: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-surface bg-paper p-8">
        <p className="eyebrow">Message sent</p>
        <h2 className="display mt-2 text-3xl">Thank you, {form.name}.</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We reply to everything ourselves, usually within a day. If it is
          urgent, WhatsApp is faster than email.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setForm(EMPTY);
            setSent(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  function submit() {
    const next: Partial<Record<keyof Form, string>> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!form.interest) next.interest = "Pick what you are interested in.";
    if (form.message.trim().length < 10) {
      next.message = "Tell us a little more so we can answer properly.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-surface bg-paper p-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-name"
          label="Your name"
          value={form.name}
          error={errors.name}
          autoComplete="name"
          onChange={(value) => setForm((f) => ({ ...f, name: value }))}
        />
        <Field
          id="contact-email"
          label="Email"
          type="email"
          value={form.email}
          error={errors.email}
          autoComplete="email"
          onChange={(value) => setForm((f) => ({ ...f, email: value }))}
        />
        <SelectField
          id="contact-interest"
          label="I'm interested in"
          value={form.interest}
          error={errors.interest}
          options={INTERESTS}
          onChange={(value) => setForm((f) => ({ ...f, interest: value }))}
        />
        <SelectField
          id="contact-discipline"
          label="Discipline"
          hint="Optional — leave blank if you are undecided."
          value={form.discipline}
          options={TOPICS}
          placeholder="Any / not sure"
          onChange={(value) => setForm((f) => ({ ...f, discipline: value }))}
        />
      </div>

      <TextareaField
        id="contact-message"
        label="Your message"
        hint="Where you are in your practice, and what you want to offer clients."
        value={form.message}
        error={errors.message}
        onChange={(value) => setForm((f) => ({ ...f, message: value }))}
      />

      <Button type="submit" size="lg" className="sm:w-fit">
        Send message
      </Button>

      <p className="text-xs leading-relaxed text-faint">
        This form is not connected to a mailbox yet — submitting shows the
        confirmation state so the flow can be reviewed.
      </p>
    </form>
  );
}
