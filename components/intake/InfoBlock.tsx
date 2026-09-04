import { CARD } from "@/components/ui/tokens";
import type { PublicIntakeField } from "@/lib/intake/types";

/** A static notice — not an input, nothing to answer. */
export function InfoBlock({ field }: { field: PublicIntakeField }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="font-body text-[14px] font-bold text-body-text">{field.label}</p>
      {field.helpText ? (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-body-text/70">
          {field.helpText}
        </p>
      ) : null}
    </div>
  );
}
