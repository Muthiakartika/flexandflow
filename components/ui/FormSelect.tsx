"use client";

/**
 * The one dropdown this project uses, wrapped so a call site reads like the
 * `<select>` it replaced.
 *
 * `components/ui/select.tsx` is shadcn/ui's Select, kept verbatim. This is the
 * thin layer over it that holds the three things every call site in this repo
 * would otherwise have to remember, and that are silent and awful to get
 * wrong:
 *
 * 1. **Radix throws on `<SelectItem value="">`.** An empty string is how it
 *    represents "nothing chosen", so a real option cannot use it — and "any
 *    therapist" and "whole studio closed" are exactly that shape. A sentinel
 *    stands in for the empty value inside the component and never escapes it.
 * 2. **Forms submit the hidden input, not Radix.** Radix can render its own
 *    hidden `<select name>`, but it would submit the sentinel verbatim, and a
 *    filter asking the database for a therapist called `__empty__` matches
 *    nothing and looks exactly like a studio with no bookings. So the hidden
 *    input carries the real value, sentinel already unwound.
 * 3. **It is always controlled internally,** even where the old markup used
 *    `defaultValue`, because the hidden input has to be able to see the current
 *    value in order to submit it.
 *
 * The skin is not decided here. It arrives as class strings — `SELECT_TRIGGER`
 * in `components/ui/tokens.ts` for the studio site, `AdminSelect` for the
 * panel — because those two live under different root layouts with different
 * stylesheets and different measures, and this component is rendered under
 * both.
 */

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  /** Submitted verbatim. `""` is allowed here and is handled internally. */
  value: string;
  label: string;
};

/** Stands in for `""` inside Radix, which refuses it. Never submitted. */
const EMPTY = "__empty__";

const toRadix = (value: string) => (value === "" ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? "" : value);

export function FormSelect({
  id,
  name,
  options,
  value,
  defaultValue = "",
  onValueChange,
  onOpenChange,
  placeholder,
  disabled,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  triggerClassName,
  contentClassName,
}: {
  id?: string;
  /** Omit for a dropdown whose value is read from React state, not a form. */
  name?: string;
  options: SelectOption[];
  /** Pass to control it from outside; otherwise it controls itself. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Radix has no `onBlur` worth listening to; closing is the moment. */
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  triggerClassName?: string;
  contentClassName?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  function handleChange(next: string) {
    const plain = fromRadix(next);
    if (!isControlled) setInternal(plain);
    onValueChange?.(plain);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <Select
        value={toRadix(current)}
        onValueChange={handleChange}
        onOpenChange={onOpenChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* `border-border` is not optional: Tailwind v4 defaults a bare
            `border` to `currentColor`, and shadcn normally fixes that with a
            global `* { border-color: … }` rule this project does not have —
            adding one would restyle three sites to fix one dropdown. */}
        <SelectContent className={cn("border-border", contentClassName)}>
          {options.map((option) => (
            <SelectItem key={option.value} value={toRadix(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
