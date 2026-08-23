"use client";

/**
 * The panel's dropdown: `FormSelect` wearing `.admin-input`'s measurements.
 *
 * The metrics are utilities rather than a CSS class on purpose. Tailwind
 * utilities sit in a later cascade layer than `@layer components`, so an
 * `.admin-select` rule would lose every one of these properties to the class
 * string shadcn's trigger already carries. `cn()` merges them instead, and
 * `tailwind-merge` drops the loser of each conflicting pair — which is the only
 * arrangement where "make it look like the input next to it" actually holds.
 *
 * The 16px is not a style choice either: below it, iOS Safari zooms the page
 * the moment the control takes focus and never zooms back. Same reason
 * `.admin-input` carries it.
 *
 * Colour comes from the tokens in `app/(admin)/admin.css` — `--color-input`,
 * `--color-ring`, `--color-popover`, `--color-accent` — so nothing about the
 * palette is repeated here, including the olive focus ring.
 */

import type { ComponentProps } from "react";

import { FormSelect, type SelectOption } from "@/components/ui/FormSelect";

/** Matches `.admin-input`: full width, 8px corner, 16px text, 7px/10px box. */
const TRIGGER =
  "w-full data-[size=default]:h-auto rounded-[8px] " +
  "px-[10px] py-[7px] text-[16px] leading-[1.4] shadow-none " +
  /* The panel has no dark mode, and shadcn's trigger ships `dark:bg-input/30`
     — which turned the control grey for anyone whose laptop is set to dark
     while every input beside it stayed white. Repeating the colour under
     `dark:` is what removes it: `tailwind-merge` drops the loser of a
     conflicting pair, and only a `dark:` class beats a `dark:` class. */
  "bg-surface dark:bg-surface dark:hover:bg-surface";

const CONTENT = "rounded-[8px]";

export function AdminSelect({
  triggerClassName,
  contentClassName,
  ...props
}: ComponentProps<typeof FormSelect>) {
  return (
    <FormSelect
      {...props}
      triggerClassName={`${TRIGGER} ${triggerClassName ?? ""}`}
      contentClassName={`${CONTENT} ${contentClassName ?? ""}`}
    />
  );
}

export type { SelectOption };
