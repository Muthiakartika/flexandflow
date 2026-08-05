import type { Testimonial as TestimonialType } from "@/lib/academy";

/**
 * Component 7 of 10 — Testimonial.
 *
 * Set in the display face at a large size so a review reads as an editorial
 * pull quote rather than a boxed review widget.
 *
 * Written for the olive band and used nowhere else, so the two quiet tones
 * are keyed to that ground rather than being tone-agnostic. Both used to be
 * brand colours that only worked on black: --color-olive on olive-dark is
 * 1.7:1 and --color-faint is 1.8:1 — near invisible. If this ever moves to a
 * white section, both need revisiting.
 */
export function Testimonial({
  item,
  align = "left",
}: {
  item: TestimonialType;
  /** `center` is the single-quote carousel layout; `left` the old grid. */
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <figure
      className={`flex h-full flex-col gap-6 ${
        centered ? "items-center text-center" : ""
      }`}
    >
      {/* Decorative, so it sits below text contrast rules on purpose. */}
      <span aria-hidden className="display text-5xl leading-none text-white/50">
        &ldquo;
      </span>
      <blockquote
        className={`flex-1 leading-relaxed text-balance ${
          centered ? "max-w-2xl text-xl sm:text-2xl" : "text-lg sm:text-xl"
        }`}
      >
        {item.quote}
      </blockquote>
      <figcaption className="text-sm">
        <span className="font-bold">{item.name}</span>
        <span className="block text-white/85">{item.role}</span>
      </figcaption>
    </figure>
  );
}
