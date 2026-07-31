import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "outline" | "solid" | "dark";

const base =
  "inline-flex items-center justify-center text-center font-body " +
  "leading-[1.25] rounded-[var(--radius-part)] border-[3px] border-solid " +
  "text-[length:var(--btn-font-size)] " +
  "transition-[background-color,color,border-color] duration-300 ease-linear";

const variants: Record<Variant, string> = {
  /* Global kit default: white fill with primary text/border, inverting on hover. */
  outline:
    "bg-white text-primary border-primary hover:bg-primary hover:text-white",
  solid:
    "bg-primary text-white border-primary hover:bg-white hover:text-primary",
  /* Black "Contact Now" pill used on the therapist profile pages. */
  dark: "bg-black text-white border-black hover:bg-white hover:text-black",
};

/** The theme's button padding is a 3-value shorthand of clamps, which Tailwind
 *  can't express as an arbitrary class — so it's applied inline. */
const paddingStyle = { padding: "var(--btn-padding)" } as const;

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
        style={paddingStyle}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes(variant, className)}
      style={paddingStyle}
    >
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
    <button
      className={classes(variant, className)}
      style={paddingStyle}
      {...rest}
    >
      {children}
    </button>
  );
}
