import { slideMenuServices } from "@/lib/site";

/* Two identical halves: the track translates by exactly -50%, so the second
   half lands where the first began and the loop has no seam. */
const names = slideMenuServices.map((service) => service.label);

/**
 * A moving strip of what the studio actually does, directly under the hero.
 * It answers "what is on offer" before the visitor has scrolled, and gives the
 * page one piece of continuous motion instead of the twenty-three identical
 * fade-ups the previous build used.
 */
export default function ServiceTicker() {
  return (
    <section className="border-y border-secondary/10 bg-white">
      <h2 className="sr-only">Our treatments</h2>

      <div className="marquee-viewport py-3.5">
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <ul
              key={half}
              aria-hidden={half === 1}
              className="flex shrink-0 items-center"
            >
              {names.map((name) => (
                <li key={name} className="flex items-center gap-5 px-5">
                  <span className="font-display text-[20px] leading-none font-bold whitespace-nowrap">
                    {name}
                  </span>
                  <span
                    aria-hidden
                    className="block h-2.5 w-2.5 shrink-0 bg-primary"
                    style={{
                      maskImage: "url('/shapes/bullet-clover.svg')",
                      WebkitMaskImage: "url('/shapes/bullet-clover.svg')",
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                    }}
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
