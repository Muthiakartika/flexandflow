import { CheckboxGroupField, DropdownField, RadioField, YesNoField } from "@/components/intake/ChoiceFields";
import { AddressField, NameField } from "@/components/intake/CompoundFields";
import { ImageField } from "@/components/intake/ImageField";
import { InfoBlock } from "@/components/intake/InfoBlock";
import { PhoneField } from "@/components/intake/PhoneField";
import { DateField, TextField, TextareaField } from "@/components/intake/TextFields";
import type { AddressAnswer, NameAnswer } from "@/lib/intake/schema";
import type { PublicIntakeField } from "@/lib/intake/types";

/**
 * Dispatches one field to the renderer its `kind` needs. SIGNATURE is not
 * handled here — it renders once, outside every section, in `IntakeForm`.
 *
 * `onFileChange` is only read for IMAGE — a `File` cannot go through
 * `onChange`/`value`, which round-trip through the JSON-serialisable
 * `Answers` draft. Every other kind ignores it.
 */
export function IntakeField({
  field,
  value,
  onChange,
  onFileChange,
  error,
}: {
  field: PublicIntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFileChange?: (file: File | null) => void;
  error?: string;
}) {
  switch (field.kind) {
    case "INFO":
      return <InfoBlock field={field} />;
    case "TEXT":
      return (
        <TextField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "PHONE":
      return (
        <PhoneField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "IMAGE":
      return (
        <ImageField field={field} onFileChange={onFileChange ?? (() => {})} error={error} />
      );
    case "TEXTAREA":
      return (
        <TextareaField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "DATE":
      return (
        <DateField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "DROPDOWN":
      return (
        <DropdownField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "RADIO":
      return (
        <RadioField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "YES_NO":
      return (
        <YesNoField field={field} value={(value as string) ?? ""} onChange={onChange} error={error} />
      );
    case "CHECKBOX_GROUP":
      return (
        <CheckboxGroupField
          field={field}
          value={(value as string[]) ?? []}
          onChange={onChange}
          error={error}
        />
      );
    case "NAME":
      return (
        <NameField
          field={field}
          value={(value as NameAnswer) ?? { firstName: "", lastName: "" }}
          onChange={onChange}
          error={error}
        />
      );
    case "ADDRESS":
      return (
        <AddressField
          field={field}
          value={
            (value as AddressAnswer) ?? { street: "", street2: "", city: "", state: "", zip: "" }
          }
          onChange={onChange}
          error={error}
        />
      );
    case "SIGNATURE":
      return null;
    default:
      return null;
  }
}
