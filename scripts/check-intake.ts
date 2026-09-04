import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { buildAnswerSchema, fieldErrors, intakeFieldCreateSchema } from "../lib/intake/schema";
import { isFieldVisible } from "../lib/intake/conditional";
import { isDecodableImage } from "../lib/intake/file-validation";
import { SEED_INTAKE_FIELDS } from "../lib/intake/seed-fields";
import { buildSheetHeaderRow, buildSheetRow } from "../lib/intake/sheet-row";
import type { PublicIntakeField, IntakeFieldKind } from "../lib/intake/types";
import type { IntakeFormField } from "../generated/prisma/client";
import { intakePayloadBytes, MAX_INTAKE_PAYLOAD_BYTES } from "../lib/intake/types";
import { intakeFormReducer } from "../components/intake/state";

const field = (kind: IntakeFieldKind, required = false, fieldKey = "test"): PublicIntakeField => ({
  id: fieldKey, fieldKey, kind, required, sectionKey: "CLIENT_DETAILS", sortOrder: 0,
  label: "Test", helpText: null, options: ["A", "B"],
});
const parse = (f: PublicIntakeField, value?: unknown) => buildAnswerSchema([f]).safeParse(value === undefined ? {} : { [f.fieldKey]: value });

for (const kind of ["TEXT", "TEXTAREA", "PHONE", "NAME", "ADDRESS", "DATE", "DROPDOWN", "RADIO", "YES_NO", "CHECKBOX_GROUP", "IMAGE"] as const) {
  test(`${kind}: required rejects missing; optional accepts missing`, () => {
    assert.equal(parse(field(kind, true)).success, false);
    assert.equal(parse(field(kind)).success, true);
  });
}
test("full seeded form accepts valid answers", () => {
  const fields = SEED_INTAKE_FIELDS.map((f, i) => ({ ...f, id: String(i), sortOrder: i, options: f.options ?? [], helpText: f.helpText ?? null }));
  const answers: Record<string, unknown> = {};
  for (const f of fields) {
    answers[f.fieldKey] = f.kind === "NAME" ? { firstName: "Intake", lastName: "Test" }
      : f.kind === "DATE" ? "2026-09-04" : f.kind === "PHONE" ? "+6281234567890"
      : f.kind === "CHECKBOX_GROUP" ? [f.options[0]] : f.kind === "YES_NO" ? "No"
      : f.kind === "DROPDOWN" || f.kind === "RADIO" ? f.options[0] : "Test";
  }
  answers.emailAddress = "intake@example.com";
  const result = buildAnswerSchema(fields).safeParse(answers);
  assert.equal(result.success, true, JSON.stringify(result));
});
test("date validity, leap years, email and phone", () => {
  for (const date of ["2026-02-29", "2026-04-31", "2026-99-99", "today"]) assert.equal(parse(field("DATE"), date).success, false);
  assert.equal(parse(field("DATE"), "2024-02-29").success, true);
  assert.equal(parse(field("TEXT", false, "emailAddress"), "wrong").success, false);
  assert.equal(parse(field("PHONE"), "123").success, false);
  assert.equal(parse(field("PHONE"), "+6281234567890").success, true);
});
test("unknown options and malformed structures are rejected", () => {
  for (const kind of ["RADIO", "DROPDOWN", "YES_NO"] as const) assert.equal(parse(field(kind), "forged").success, false);
  assert.equal(parse(field("CHECKBOX_GROUP"), ["forged"]).success, false);
  for (const value of [null, [], "bad", 1]) assert.equal(buildAnswerSchema([]).safeParse(value).success, false);
});
test("nested required errors map to visible field", () => {
  const result = parse(field("NAME", true), { firstName: "", lastName: "" });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(fieldErrors(result.error).test);
});
test("hidden required fields are omitted, including stale nested answers", () => {
  const fields = [field("YES_NO", true, "receivedTreatmentBefore"), field("YES_NO", true, "adverseReactionBefore"), field("TEXTAREA", true, "adverseReactionDetails")];
  const answers = { receivedTreatmentBefore: "No", adverseReactionBefore: "Yes", adverseReactionDetails: "stale" };
  assert.equal(isFieldVisible("adverseReactionDetails", answers), false);
  assert.deepEqual(buildAnswerSchema(fields).parse(answers), { receivedTreatmentBefore: "No" });
  assert.equal(buildAnswerSchema(fields).safeParse({ receivedTreatmentBefore: "Yes", adverseReactionBefore: "Yes" }).success, false);
});
test("removing a conditional parent makes remaining question reachable", () => {
  assert.equal(isFieldVisible("medicationDetails", {}, new Set(["medicationDetails"])), true);
  assert.equal(parse(field("TEXTAREA", true, "medicationDetails")).success, false);
});
test("unknown and removed answers never enter submission data", () => {
  assert.deepEqual(buildAnswerSchema([field("TEXT")]).parse({ test: "ok", removed: "secret" }), { test: "ok" });
});
test("creation rejects unknown kind, empty label and too many options", () => {
  const base = { sectionKey: "CONSENT", kind: "TEXT", label: "Test", required: false };
  assert.equal(intakeFieldCreateSchema.safeParse(base).success, true);
  for (const override of [{ kind: "UNKNOWN" }, { label: " " }, { options: Array(51).fill("x") }]) assert.equal(intakeFieldCreateSchema.safeParse({ ...base, ...override }).success, false);
});
test("real PNG/JPEG/WebP decode; forged MIME and corrupt uploads fail", async () => {
  for (const format of ["png", "jpeg", "webp"] as const) {
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).toFormat(format).toBuffer();
    assert.equal(await isDecodableImage(new File([new Uint8Array(bytes)], `test.${format}`, { type: `image/${format}` })), true);
    assert.equal(await isDecodableImage(new File([new Uint8Array(bytes)], "fake.png", { type: "text/plain" })), false);
  }
  assert.equal(await isDecodableImage(new File(["not an image"], "fake.png", { type: "image/png" })), false);
});
test("archived fields keep historical sheet columns while new fields append", () => {
  const fields = [{ ...field("TEXT", false, "old"), archived: true }, { ...field("TEXT", false, "new"), sortOrder: 1 }] as IntakeFormField[];
  assert.equal(buildSheetHeaderRow(fields).length, 3);
  assert.deepEqual(buildSheetRow({ data: { old: "historical" }, signatureUrl: "", createdAt: new Date("2026-09-04") }, fields).slice(1), ["historical", ""]);
});

test("combined upload budget includes files and text", () => {
  const form = new FormData();
  form.set("answers", JSON.stringify({ text: "hello" }));
  form.set("photo", new File([new Uint8Array(MAX_INTAKE_PAYLOAD_BYTES)], "photo.png"));
  assert.ok(intakePayloadBytes(form) > MAX_INTAKE_PAYLOAD_BYTES);
});

test("replacement signature does not populate the removed signature column", () => {
  const fields = [{ ...field("SIGNATURE", true, "old"), isCustom: false, archived: true }, { ...field("SIGNATURE", true, "new"), isCustom: true, sortOrder: 1 }] as IntakeFormField[];
  const submission = { data: { _signatureFieldKey: "new" }, signatureUrl: "/new.png", createdAt: new Date("2026-09-04") };
  assert.deepEqual(buildSheetRow(submission, fields).slice(1), ["", "/new.png"]);
  assert.deepEqual(buildSheetRow({ ...submission, data: {}, signatureUrl: "/old.png" }, fields).slice(1), ["/old.png", ""]);
});

test("draft restores once and later field refresh cannot overwrite edits", () => {
  const initial = { draftLoaded: false, answers: {}, errors: {}, status: "idle" as const, serverMessage: null, reference: null };
  const restored = intakeFormReducer(initial, { type: "RESTORE_DRAFT", answers: { receivedTreatmentBefore: "Yes" } });
  assert.equal(restored.draftLoaded, true);
  const edited = intakeFormReducer(restored, { type: "SET_ANSWER", fieldKey: "receivedTreatmentBefore", value: "No" });
  assert.equal(intakeFormReducer(edited, { type: "RESTORE_DRAFT", answers: { receivedTreatmentBefore: "Yes" } }).answers.receivedTreatmentBefore, "No");
});
