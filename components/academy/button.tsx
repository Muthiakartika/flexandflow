import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Component 1 of 10 — Button.
 *
 * Mirrors the three treatments on flexandflow.fit: solid black primary,
 * outlined olive secondary (3px border, as on the main site), and a quiet
 * text link. Always a pill, per the brand's 50px control radius.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-olive",
  secondary:
    "border-[3px] border-olive bg-white text-olive hover:bg-olive hover:text-white",
  ghost: "text-ink underline-offset-4 hover:text-olive hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

// `rounded-control` comes from --radius-control in app/globals.css. To change
// the roundness of every button on the site, edit that one variable — not this
// line. The comment block above it explains the options.
const BASE =
  "items-center justify-center gap-2 rounded-control font-bold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// Tailwind resolves conflicts by stylesheet order, not class-attribute order, so
// a caller's `hidden` loses to the default `inline-flex` no matter where it sits
// in the string. Drop our default when the caller states an unprefixed display of
// its own; variant-prefixed ones (lg:hidden) already win on their own.
const OWN_DISPLAY =
  /(?:^|\s)(?:hidden|contents|block|inline|inline-block|flex|inline-flex|grid|inline-grid)(?:\s|$)/;

function classes(variant: ButtonVariant, size: ButtonSize, extra: string) {
  // Ghost is a text link, so the pill padding would only add dead space.
  const sizing = variant === "ghost" ? "text-sm" : SIZES[size];
  const display = OWN_DISPLAY.test(extra) ? "" : "inline-flex ";
  return `${display}${BASE} ${VARIANTS[variant]} ${sizing} ${extra}`;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={classes(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
