/** The four circle-outline benefit glyphs, masked so they take `currentColor`. */
const icons = {
  "enhances-flexibility": "Enhances Flexibility",
  "relieves-tension": "Relieves Tension",
  "prevents-injuries": "Prevents Injuries",
  "improves-athletic-performance": "Improves Athletic Performance",
} as const;

export type BenefitIconName = keyof typeof icons;

export const benefitLabels = icons;

export default function BenefitIcon({
  name,
  className = "h-[58px] w-[58px]",
}: {
  name: BenefitIconName;
  className?: string;
}) {
  const url = `url('/shapes/icon-${name}.svg')`;

  return (
    <span
      aria-hidden
      className={`block shrink-0 bg-current ${className}`}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
