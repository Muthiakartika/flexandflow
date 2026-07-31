import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { serviceBySlug } from "@/lib/data/services";

/** Treatments featured on the home page, in the original order. */
const featured = [
  "assisted-stretching",
  "sport-massage",
  "lymphatic-drainage",
  "cupping-therapy",
  "trauma-healing",
  "lymphatic-detox-massage-for-men",
];

/**
 * The treatment list reads as an index rather than a grid of matching cards:
 * each row is a link at display scale with its own photograph, so scanning the
 * list feels like reading a menu of work rather than counting tiles.
 */
export default function Treatments() {
  const services = featured
    .map((slug) => serviceBySlug.get(slug))
    .filter((service) => service !== undefined);

  return (
    <section className="band band-line">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h2 className="max-w-[18ch] text-[clamp(2.25rem,1.8rem+2vw,3.5rem)] leading-[1.05] text-balance">
            What we work on
          </h2>
          <Link
            href="/services"
            className="font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary"
          >
            All treatments &amp; prices
          </Link>
        </div>

        <ul className="mt-[clamp(1.75rem,3vw,2.75rem)] grid gap-x-[clamp(1.5rem,3vw,3.5rem)] lg:grid-cols-2">
          {services.map((service, i) => (
            <li key={service.slug}>
              <Reveal delay={(i % 2) * 80}>
                <Link
                  href={`/uluwatu-bali/${service.slug}`}
                  className="group flex items-center gap-5 border-t border-secondary/12 py-5 transition-colors duration-300 hover:border-secondary/30"
                >
                  <span className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[14px] max-[479px]:h-[62px] max-[479px]:w-[62px]">
                    <Image
                      src={service.image}
                      alt=""
                      aria-hidden
                      width={400}
                      height={400}
                      sizes="76px"
                      className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[clamp(1.5rem,1.35rem+0.6vw,1.9rem)] leading-[1.15] transition-colors duration-300 group-hover:text-primary">
                      {service.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block max-w-[46ch] font-body text-[14px] leading-[1.6] text-body-text/70">
                      {service.excerpt}
                    </span>
                  </span>

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-body-text/60 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
