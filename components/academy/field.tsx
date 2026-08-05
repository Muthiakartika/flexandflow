import type { ReactNode } from "react";

/**
 * Component 8 of 10 — Field.
 *
 * Label + control + error, shared by the registration wizard, the e-book
 * checkout and the contact form so validation looks identical everywhere.
 */
const CONTROL =
  "w-full rounded-surface border-2 bg-white px-4 py-3 text-sm outline-none transition-colors " +
  "focus-visible:border-olive placeholder:text-faint";

function Shell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-bold text-olive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} ${error ? "border-olive" : "border-line"}`}
      />
    </Shell>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  placeholder = "Select one…",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} ${error ? "border-olive" : "border-line"}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function TextareaField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} resize-y ${error ? "border-olive" : "border-line"}`}
      />
    </Shell>
  );
}
