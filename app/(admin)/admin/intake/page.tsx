import type { Metadata } from "next";

import { AddIntakeFieldForm } from "@/components/admin/AddIntakeFieldForm";
import { IntakeFieldRowForm } from "@/components/admin/IntakeFieldRowForm";
import { IntakeSettingsForm } from "@/components/admin/IntakeSettingsForm";
import { RestoreIntakeFieldButton } from "@/components/admin/RestoreIntakeFieldButton";
import { Panel, PageHeading } from "@/components/admin/primitives";
import { requirePermission } from "@/lib/admin/auth";
import { sheetsEnabled } from "@/lib/env";
import { listIntakeFieldsForAdmin } from "@/lib/intake/admin";
import { SECTION_LABEL, SECTION_ORDER } from "@/lib/intake/schema";
import { loadIntakeSettings } from "@/lib/intake/settings";

export const metadata: Metadata = { title: "Intake form" };

/**
 * Intake form builder: add questions, edit content, archive and restore.
 * Field keys stay stable for historical submissions. See INTAKE-PLAN.md.
 */
export default async function AdminIntakePage() {
  await requirePermission("intake.manage");

  const [fields, settings] = await Promise.all([
    listIntakeFieldsForAdmin(),
    loadIntakeSettings(),
  ]);

  const bySection = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABEL[key],
    fields: fields
      .filter((field) => field.sectionKey === key && !field.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter((section) => section.fields.length > 0);

  const allSections = SECTION_ORDER.map((key) => ({ key, label: SECTION_LABEL[key] }));
  const hasSignature = fields.some((field) => field.kind === "SIGNATURE" && !field.archived);
  const removedFields = fields.filter((field) => field.archived);

  return (
    <>
      <PageHeading
        title="Intake form"
        lede="Add, edit or remove fields on the public intake form. Changes appear immediately. Removed fields can be restored; previous submissions are kept."
      />

      <Panel title="Add a field" description="Choose a section and field type, then enter your question. It will appear at the end of that section.">
        <AddIntakeFieldForm sections={allSections} hasSignature={hasSignature} />
        <a href="/intake/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-quiet mt-3">Preview public form</a>
      </Panel>

      <Panel
        title="Google Sheet sharing"
        description={
          sheetsEnabled()
            ? "Submissions are appended to the studio's Google Sheet automatically. Give up to two Gmail addresses access to it."
            : "Google Sheets is not configured on this deployment yet — submissions still save and the WhatsApp notice still sends, but nothing is appended to a sheet until the Google credentials are set. See INTAKE-PLAN.md."
        }
      >
        <IntakeSettingsForm settings={settings} />
      </Panel>

      {bySection.map((section) => (
        <Panel key={section.key} title={section.label}>
          {section.fields.map((field) => (
            <IntakeFieldRowForm key={field.id} field={field} />
          ))}
        </Panel>
      ))}

      {removedFields.length > 0 ? <Panel title="Removed fields" description="These fields are no longer shown to clients. Restore one to add it back with its previous settings.">
        {removedFields.map((field) => <RestoreIntakeFieldButton key={field.id} id={field.id} label={field.label} />)}
      </Panel> : null}
    </>
  );
}
