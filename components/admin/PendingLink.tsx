"use client";

/**
 * The panel's pending link: `components/ui/PendingLink.tsx` wearing the
 * admin stylesheet's dot.
 *
 * The behaviour and the reasoning live in the shared component. All this adds
 * is `.admin-link-hint`, which is `admin.css`'s own rule — the studio site's
 * `.link-hint` is a different size on a different ground, and neither
 * stylesheet can see the other's classes.
 */

import { PendingLink as BasePendingLink } from "@/components/ui/PendingLink";
import type { ComponentProps } from "react";

export function PendingLink(
  props: Omit<ComponentProps<typeof BasePendingLink>, "hintClassName">,
) {
  return <BasePendingLink {...props} hintClassName="admin-link-hint" />;
}
