import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { FOCUS } from "./tokens";

type Variant = "outline" | "solid" | "dark";

/**
 * The site's button.
 *
 * The theme's version was a 2.5em pill with a 3px border, filled with
 * `--color-primary` — white on `#7f8c3a` is 3.67:1 and fails AA. This is the
 * redesign's shape (10px, no heavy border) filled with
 * `--color-primary-strong`, the same olive one step down at 4.76:1. The brand
 * colour is untouched and still owns every accent; see `DESIGN.md`.
 */
const base =
  "inline-flex items-center justify-center gap-2 text-center font-body " +
  "text-[15px] leading-none rounded-[10px] px-6 py-3 " +
  `transition-colors duration-300 ${FOCUS}`;

const variants: Record<Variant, string> = {
  /** Default: quiet, for secondary actions and anything sitting on a card. */
  outline:
    "border border-secondary/20 hover:border-primary hover:text-primary",
  /** The page's primary action. */
  solid: "bg-primary-strong text-white hover:bg-secondary",
  /** Black pill kept for the therapist profiles' "Contact Now". */
  dark: "bg-secondary text-white hover:bg-primary-strong",
};

const classes = (variant: Variant, className: string) =>
  `${base} ${variants[variant]} ${className}`.trim();

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function ButtonLink({
  children,
  href,
  external,
  variant = "outline",
  className = "",
}: CommonProps & {
  href: string;
  /** Absolute URLs (WordPress pages, WhatsApp) bypass the client router. */
  external?: boolean;
}) {
  const isExternal = external ?? /^(https?:|mailto:|tel:)/.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes(variant, className)}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes(variant, className)}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "outline",
  className = "",
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button className={classes(variant, className)} {...rest}>
      {children}
    </button>
  );
}
