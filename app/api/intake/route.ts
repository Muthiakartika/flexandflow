/**
 * `POST /api/intake/` — the client intake & consent form's only endpoint.
 *
 * `multipart/form-data`, not JSON: the signature arrives as a binary file,
 * matching how `/api/cms/media` already accepts one. Order mirrors
 * `/api/booking/`'s: validate → guard → commit → queue → `after()` dispatch.
 * The database commit must never be blocked by WAHA, SendGrid or Sheets
 * availability — the same rule the booking route follows.
 */
import { after } from "next/server";

import { createIntakeSubmission } from "@/lib/intake/create";
import { guardIntakeRequest } from "@/lib/intake/guard";
import { dispatchPendingIntake, queueIntakeSubmissionCreated } from "@/lib/intake/notifications";
import { listPublicIntakeFields } from "@/lib/intake/read";
import { fail, ok, serverError } from "@/lib/intake/respond";
import { buildAnswerSchema, fieldErrors } from "@/lib/intake/schema";
import {
  MAX_SIGNATURE_BYTES,
  SIGNATURE_MIME_TYPE,
  storeSignature,
} from "@/lib/intake/signature";
import { syncSubmissionToSheet } from "@/lib/intake/sync";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_INTAKE_PAYLOAD_BYTES, intakePayloadBytes } from "@/lib/intake/types";
import { storeIntakeImage } from "@/lib/intake/uploads";
import { isDecodableImage } from "@/lib/intake/file-validation";

/* Buffer and the storage driver's Node APIs are not Edge-safe. */
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    return await submit(request);
  } catch (error) {
    console.error("[intake] request failed", error);
    return serverError("Could not process your form. Please try again.");
  }
}

async function submit(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("VALIDATION", "Could not read the submitted form.");
  }

  const answersRaw = form.get("answers");
  if (intakePayloadBytes(form) > MAX_INTAKE_PAYLOAD_BYTES) return fail("VALIDATION", "Please choose smaller images (under 4MB total).");
  if (typeof answersRaw !== "string") {
    return fail("VALIDATION", "No answers were submitted.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(answersRaw);
  } catch {
    return fail("VALIDATION", "The submitted answers could not be read.");
  }

  /* Loaded fresh through the cache tag `lib/intake/actions.ts` invalidates
     immediately on every edit, rather than trusted from the client — the
     field list is SUPER_ADMIN-editable and can drift between page load and
     submit. */
  const fields = await listPublicIntakeFields();

  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    return fail("VALIDATION", "The submitted answers must be an object.");
  }
  // Only actual multipart files count as image answers, never a posted URL.
  for (const field of fields.filter((field) => field.kind === "IMAGE")) {
    const file = form.get(field.fieldKey);
    (parsedJson as Record<string, unknown>)[field.fieldKey] = file instanceof File && file.size > 0 ? "uploaded" : "";
  }

  const parsed = buildAnswerSchema(fields).safeParse(parsedJson);
  if (!parsed.success) {
    return fail(
      "VALIDATION",
      "Please check the answers you entered.",
      fieldErrors(parsed.error),
    );
  }

  const website = form.get("website");
  const turnstileToken = form.get("turnstileToken");

  const guard = await guardIntakeRequest({
    request,
    website: typeof website === "string" ? website : null,
    turnstileToken: typeof turnstileToken === "string" ? turnstileToken : undefined,
  });

  if (!guard.ok) {
    return fail(guard.code, guard.message);
  }

  // Validate every upload before writing any object to storage.
  const uploads = fields.filter((field) => field.kind === "IMAGE" || field.kind === "SIGNATURE");
  for (const field of uploads) {
    const file = form.get(field.kind === "SIGNATURE" ? "signature" : field.fieldKey);
    if (!(file instanceof File) || file.size === 0) {
      if (field.required || field.kind === "SIGNATURE") return fail("VALIDATION", `Please provide ${field.label}.`, { [field.fieldKey]: "This field is required." });
      continue;
    }
    const max = field.kind === "SIGNATURE" ? MAX_SIGNATURE_BYTES : MAX_IMAGE_BYTES;
    const allowed = field.kind === "SIGNATURE" ? [SIGNATURE_MIME_TYPE] : ALLOWED_IMAGE_TYPES;
    if (file.size > max || !allowed.includes(file.type) || !(await isDecodableImage(file))) {
      return fail("VALIDATION", `Please check ${field.label}.`, { [field.fieldKey]: "Choose a valid image within the size limit." });
    }
  }

  /* IntakeSubmission.signatureUrl is a required column, so a signature is
     mandatory whenever a SIGNATURE field exists — regardless of its own
     `required` flag, which the admin editor keeps forced to true for exactly
     this reason (see lib/intake/actions.ts). */
  const signatureField = fields.find((field) => field.kind === "SIGNATURE");
  const signatureFile = form.get("signature");

  let signatureUrl = "";

  if (signatureField) {
    if (!(signatureFile instanceof File) || signatureFile.size === 0) {
      return fail("VALIDATION", "Please sign before submitting.", {
        [signatureField.fieldKey]: "A signature is required.",
      });
    }

    if (signatureFile.type !== SIGNATURE_MIME_TYPE) {
      return fail("VALIDATION", "The signature could not be read. Please try again.", {
        [signatureField.fieldKey]: "The signature could not be read. Please try again.",
      });
    }

    if (signatureFile.size > MAX_SIGNATURE_BYTES) {
      return fail("VALIDATION", "The signature is too large.", {
        [signatureField.fieldKey]: "The signature is too large.",
      });
    }

    try {
      const bytes = Buffer.from(await signatureFile.arrayBuffer());
      signatureUrl = (await storeSignature(bytes)).url;
    } catch (error) {
      console.error("[intake] could not store signature", error);
      return serverError("Could not save your signature. Please try again.");
    }
  }

  /* IMAGE fields have no dedicated column like signatureUrl — each one's
     answer lives in `data` like any normal field. The client can only send a
     filename placeholder there (see `IntakeForm.tsx`'s `imageFilesRef`),
     which is enough to satisfy the `required` check `parsed.data` already
     passed; the real file arrives as its own FormData entry, keyed by
     fieldKey the same way `signature` is, and gets swapped in here before
     anything is written to the database. */
  const answers = { ...parsed.data } as Record<string, unknown>;
  if (signatureField) answers._signatureFieldKey = signatureField.fieldKey;

  for (const field of fields) {
    if (field.kind !== "IMAGE") continue;

    const file = form.get(field.fieldKey);

    if (!(file instanceof File) || file.size === 0) {
      if (field.required) {
        return fail("VALIDATION", `Please upload ${field.label}.`, {
          [field.fieldKey]: "This image is required.",
        });
      }
      answers[field.fieldKey] = "";
      continue;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return fail("VALIDATION", "One of the uploaded images could not be read.", {
        [field.fieldKey]: "Please upload a JPEG, PNG or WebP image.",
      });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return fail("VALIDATION", "One of the uploaded images is too large.", {
        [field.fieldKey]: "That image is too large — please choose one under 3MB.",
      });
    }

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      answers[field.fieldKey] = (await storeIntakeImage(bytes, file.type)).url;
    } catch (error) {
      console.error("[intake] could not store an uploaded image", error);
      return serverError("Could not save an uploaded image. Please try again.");
    }
  }

  let submission: { id: string; reference: string };
  try {
    submission = await createIntakeSubmission({
      answers,
      signatureUrl,
      ipAddress: guard.ip,
    });
  } catch (error) {
    console.error("[intake] could not save submission", error);
    return serverError("Could not save your submission. Please try again.");
  }

  /* Queued before the response, sent after it — same reasoning as booking's
     route: even if the function is killed the moment it returns, the cron
     dispatcher still finds the queued rows. */
  try {
    await queueIntakeSubmissionCreated(submission.id);
  } catch (error) {
    console.error("[intake] could not queue notifications", error);
  }

  after(async () => {
    try {
      await dispatchPendingIntake();
    } catch (error) {
      console.error("[intake] deferred dispatch failed", error);
    }

    try {
      await syncSubmissionToSheet(submission.id);
    } catch (error) {
      console.error("[intake] deferred sheet sync failed", error);
    }
  });

  return ok({ reference: submission.reference }, { status: 201 });
}
