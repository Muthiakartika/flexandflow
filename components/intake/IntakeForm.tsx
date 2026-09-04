"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";

import { IntakeField } from "@/components/intake/IntakeSection";
import { SignaturePad, type SignaturePadHandle } from "@/components/intake/SignaturePad";
import {
  clearDraft,
  intakeFormReducer,
  loadDraft,
  saveDraft,
  type Answers,
} from "@/components/intake/state";
import { Button } from "@/components/ui/Button";
import { CARD } from "@/components/ui/tokens";
import { isFieldVisible } from "@/lib/intake/conditional";
import { buildAnswerSchema, fieldErrors, SECTION_LABEL, SECTION_ORDER } from "@/lib/intake/schema";
import { isApiError, intakePayloadBytes, MAX_INTAKE_PAYLOAD_BYTES, type PublicIntakeField } from "@/lib/intake/types";
import { externalBookingUrl } from "@/lib/site";

/** Long enough to register as a confirmation, short enough that "immediately
 *  redirected" is still true. The manual link below covers anyone who reads
 *  slower than that, or whose browser is slow to act on the timer. */
const REDIRECT_DELAY_MS = 2500;

function defaultAnswers(fields: PublicIntakeField[]): Answers {
  const answers: Answers = {};

  for (const field of fields) {
    switch (field.kind) {
      case "NAME":
        answers[field.fieldKey] = { firstName: "", lastName: "" };
        break;
      case "ADDRESS":
        answers[field.fieldKey] = { street: "", street2: "", city: "", state: "", zip: "" };
        break;
      case "CHECKBOX_GROUP":
        answers[field.fieldKey] = [];
        break;
      case "SIGNATURE":
      case "INFO":
        break;
      default:
        answers[field.fieldKey] = "";
    }
  }

  return answers;
}

export function IntakeForm({ fields }: { fields: PublicIntakeField[] }) {
  const signatureField = useMemo(
    () => fields.find((field) => field.kind === "SIGNATURE") ?? null,
    [fields],
  );
  const signatureRef = useRef<SignaturePadHandle>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [signatureError, setSignatureError] = useState<string | undefined>();

  /* IMAGE answers, keyed by fieldKey — outside `state.answers` for the same
     reason the signature drawing is: a `File` cannot survive the
     JSON-stringified sessionStorage draft. `state.answers[fieldKey]` still
     holds a placeholder (the filename) purely so the ordinary Zod
     `required` check has something non-empty to see once a file is picked;
     the route replaces that placeholder with the real uploaded URL before
     it ever validates the submission for real. */
  const imageFilesRef = useRef<Record<string, File | null>>({});

  function setImageFile(fieldKey: string, file: File | null) {
    imageFilesRef.current[fieldKey] = file;
    setAnswer(fieldKey, file ? file.name : "");
  }

  const answerSchema = useMemo(() => buildAnswerSchema(fields), [fields]);

  const [state, dispatch] = useReducer(intakeFormReducer, undefined, () => ({
    draftLoaded: false,
    answers: defaultAnswers(fields),
    errors: {},
    status: "idle" as const,
    serverMessage: null,
    reference: null,
  }));

  // First client render must match SSR; restore conditional fields only after hydration.
  useEffect(() => {
    dispatch({ type: "RESTORE_DRAFT", answers: restoreAnswers(fields) });
  }, [fields]);

  const sections = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABEL[key],
    fields: fields.filter(
      (field) =>
        field.sectionKey === key && isFieldVisible(field.fieldKey, state.answers, new Set(fields.map((f) => f.fieldKey))),
    ),
  })).filter((section) => section.fields.length > 0);

  function setAnswer(fieldKey: string, value: unknown) {
    dispatch({ type: "SET_ANSWER", fieldKey, value });
  }

  /* Saving the draft here, rather than inline in `setAnswer`, is what makes
     it correct under rapid changes — several checkboxes toggled in quick
     succession, say. `setAnswer` closes over whatever `state.answers` was in
     the render that defined it; two calls before React re-renders both read
     the same stale snapshot, and the second `saveDraft` call would overwrite
     the first's change right out of the stored draft even though the live
     `state` (reducer-driven, not closure-driven) had both. A `useEffect`
     keyed on `state.answers` always sees the latest committed state. */
  useEffect(() => {
    if (state.draftLoaded) saveDraft(state.answers);
  }, [state.answers, state.draftLoaded]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;

    try {
      const parsed = answerSchema.safeParse(state.answers);
      const signatureMissing =
        Boolean(signatureField) && (signatureRef.current?.isEmpty() ?? true);

      if (!parsed.success || signatureMissing) {
        /* A visible, top-level line as well as the per-field ones — without
           it, a validation failure is silent except for red text next to
           whichever field the auto-scroll happens to land on, which reads as
           "the button did nothing" to anyone who does not immediately spot
           it. This was reported exactly that way. */
        dispatch({
          type: "SUBMIT_ERROR",
          message: "Please check the highlighted fields below before submitting.",
          fields: parsed.success ? {} : fieldErrors(parsed.error),
        });
        setSignatureError(signatureMissing ? "A signature is required." : undefined);

        requestAnimationFrame(() => {
          document
            .querySelector('[aria-invalid="true"]')
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }

      setSignatureError(undefined);
      dispatch({ type: "SUBMIT_START" });

      const form = new FormData();
      form.set("answers", JSON.stringify(parsed.data));
      /* Honeypot: a real visitor never sees or fills this field. Read from
         the DOM directly rather than trusted state, since a bot fills the
         input itself rather than dispatching React events. */
      form.set("website", honeypotRef.current?.value ?? "");

      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const blob = await signatureRef.current.toBlob();
        if (blob) form.set("signature", blob, "signature.png");
      }

      for (const [fieldKey, file] of Object.entries(imageFilesRef.current)) {
        if (file) form.set(fieldKey, file, file.name);
      }

      if (intakePayloadBytes(form) > MAX_INTAKE_PAYLOAD_BYTES) {
        dispatch({ type: "SUBMIT_ERROR", message: "Your uploads are too large together. Please choose smaller images (under 4MB total)." });
        return;
      }

      const response = await fetch("/api/intake/", { method: "POST", body: form });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = response.status === 413 ? "Your uploads are too large. Please choose smaller images." : isApiError(body) ? body.error : "Something went wrong. Please try again.";
        const fields = isApiError(body) ? body.fields : undefined;
        dispatch({ type: "SUBMIT_ERROR", message, fields });
        if (signatureField) setSignatureError(fields?.[signatureField.fieldKey]);
        requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }

      if (!body || typeof body !== "object" || !("reference" in body) || typeof body.reference !== "string") throw new Error("Invalid submission response");
      const reference = body.reference;
      clearDraft();
      dispatch({ type: "SUBMIT_SUCCESS", reference });
    } catch (error) {
      /* Wraps the whole function, not just the fetch: a bug in validation
         itself must still surface as a visible message rather than leave the
         button looking like it did nothing — the same failure mode as the
         one above, from a different cause. */
      console.error("[intake] submit failed", error);
      dispatch({
        type: "SUBMIT_ERROR",
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }

  useEffect(() => {
    if (state.status !== "success") return;

    /* Same-tab, not a new window: reliable regardless of the browser's
       popup-blocker heuristics, and it puts the visitor's attention where
       their intent already was — on booking, not on this confirmation. */
    const timer = setTimeout(() => {
      window.location.href = externalBookingUrl;
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div className={`${CARD} p-8 text-center sm:p-12`}>
        <h2 className="font-display text-[28px] font-bold text-body-text">Thank you</h2>
        <p className="mt-2 text-[15px] text-body-text/75">
          Your form has been received. Reference: <strong>{state.reference}</strong>
        </p>
        <p className="mt-4 text-[14px] text-body-text/60">
          Taking you to the booking page now…
        </p>
        <a
          href={externalBookingUrl}
          className="mt-3 inline-block font-body text-[14px] font-bold underline decoration-secondary/25 underline-offset-[4px] transition-colors duration-300 hover:text-primary"
        >
          Continue to booking now
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${CARD} intake-form flex min-w-0 flex-col gap-8 p-4 sm:p-8`} noValidate>
      <div aria-hidden className="absolute -left-[9999px] opacity-0">
        <label htmlFor="intake-website">Leave this field empty</label>
        <input
          ref={honeypotRef}
          id="intake-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {sections.map((section) => (
        <div key={section.key} className="flex flex-col gap-5">
          <h2 className="border-b border-secondary/10 pb-2 font-display text-[24px] font-bold text-body-text">
            {section.label}
          </h2>
          {section.fields.map((field) => (
            <IntakeField
              key={`${field.id}-${state.draftLoaded}`}
              field={field}
              value={state.answers[field.fieldKey]}
              onChange={(value) => setAnswer(field.fieldKey, value)}
              onFileChange={(file) => setImageFile(field.fieldKey, file)}
              error={state.errors[field.fieldKey]}
            />
          ))}
        </div>
      ))}

      {signatureField ? (
        <SignaturePad
          ref={signatureRef}
          label={signatureField.label}
          required={signatureField.required}
          helpText={signatureField.helpText}
          error={signatureError}
        />
      ) : null}

      {state.serverMessage ? (
        <p role="alert" className="rounded-[10px] bg-red-50 px-4 py-3 text-[14px] font-bold text-red-700">
          {state.serverMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="solid" disabled={state.status === "submitting"}>
          {state.status === "submitting" ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

function restoreAnswers(fields: PublicIntakeField[]): Answers {
  const answers = defaultAnswers(fields);
  const draft = loadDraft();
  if (!draft) return answers;
  for (const field of fields) {
    if (field.kind === "IMAGE" || field.kind === "SIGNATURE" || field.kind === "INFO") continue;
    const value = draft[field.fieldKey];
    const valid = buildAnswerSchema([{ ...field, required: false }]).safeParse({ [field.fieldKey]: value });
    if (valid.success && valid.data[field.fieldKey] !== undefined) answers[field.fieldKey] = valid.data[field.fieldKey];
  }
  return answers;
}
