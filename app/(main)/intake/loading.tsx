import { CARD, WRAP } from "@/components/ui/tokens";

export default function Loading() {
  return (
    <section className={`${WRAP} py-12`}>
      <div className={`${CARD} mx-auto max-w-[820px] animate-pulse p-8`}>
        <div className="h-6 w-2/3 rounded-[6px] bg-secondary/10" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-11 rounded-[10px] bg-secondary/10" />
          ))}
        </div>
      </div>
    </section>
  );
}
