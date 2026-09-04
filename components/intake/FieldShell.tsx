import type { ReactNode } from "react";

/** Label, required marker, help caption and error message, shared by every
 *  field renderer so the spacing and typography never drift between them. */
export function FieldShell({
  label,
  htmlFor,
  required,
  helpText,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required: boolean;
  helpText?: string | null;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="page-label mb-1.5 block">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </label>
      {children}
      {helpText ? (
        <p className="mt-1.5 text-[13px] text-body-text/60">{helpText}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] font-bold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
