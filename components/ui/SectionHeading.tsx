import type { ReactNode } from "react";

type SectionHeadingProps = {
  /** Small line above the title (the theme's "heading subtitle"). */
  eyebrow?: string;
  title: ReactNode;
  /** Supporting copy below the title. */
  description?: string;
  as?: "h1" | "h2" | "h3" | "h4";
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
};

/**
 * Mirrors the theme's `wdt-heading` widget: an optional eyebrow, the heading
 * itself, then an optional description paragraph.
 *
 * Measured off the original: a 16px body-coloured eyebrow 10px above the title,
 * the title on the widget's 1.2 line-height (tighter than the 1.26 the theme
 * gives headings elsewhere), then the description 20px below at a 600px measure.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h2",
  align = "center",
  className = "",
  titleClassName = "",
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "text-center mx-auto items-center" : "text-left items-start";

  return (
    <div className={`flex flex-col ${alignment} ${className}`.trim()}>
      {eyebrow ? (
        <span className="font-body text-[16px] leading-[1.625] text-body-text">
          {eyebrow}
        </span>
      ) : null}

      <Tag
        className={`leading-[1.2] ${eyebrow ? "mt-[10px]" : ""} ${titleClassName}`.trim()}
      >
        {title}
      </Tag>

      {description ? (
        <p
          className={`mt-5 max-w-[600px] text-[16px] leading-[1.625] text-body-text ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
