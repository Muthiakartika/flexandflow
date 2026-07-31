import { wordpressUrls } from "@/lib/site";
import type { Service } from "@/types";

/**
 * The priced service card from the /services/ grid. The photo sits behind the
 * content at `opacity: 0` and fades in on hover under a white veil, exactly as
 * the WordPress plugin styles it.
 *
 * "Book Session" goes to the WordPress booking page, which is not cloned.
 */
export default function ServicePriceCard({ service }: { service: Service }) {
  return (
    <article className="service-card group relative h-full overflow-hidden rounded-[var(--radius-card)] bg-white">
      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-cover bg-center opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
        style={{ backgroundImage: `url('${service.image}')` }}
      >
        <div className="absolute inset-0 bg-white/75" />
      </div>

      <div className="relative z-[2] px-[22px] pt-[50px] pb-[26px]">
        <h3 className="text-center font-display text-[30px] leading-[1.2] font-black text-primary max-[768px]:text-[22px]">
          {service.title}
        </h3>

        <p
          className="mt-3 text-center text-[14px] leading-[1.7] text-muted after:mx-auto after:mt-[14px] after:block after:h-[18px] after:w-[110px] after:bg-[image:var(--divider-squiggle)] after:bg-contain after:bg-center after:bg-no-repeat after:content-['']"
        >
          {service.excerpt}
        </p>

        <div className="mt-4 grid gap-[10px] sm:grid-cols-2 max-[768px]:grid-cols-1">
          {service.tiers.map((tier) => (
            <div
              key={tier.label}
              className="flex min-w-0 flex-col justify-start rounded-[var(--radius-tier)] border border-primary/20 bg-cream p-3 text-center transition-colors duration-[250ms] hover:border-primary"
            >
              <div>
                <span className="block text-[11px] font-bold tracking-[1px] text-primary uppercase">
                  {tier.label}
                </span>
                <small className="mt-1 block text-[11px] leading-[1.3] text-subtle">
                  {tier.note}
                </small>
              </div>

              <div className="my-3 text-[18px] leading-[1.2] font-bold text-price">
                {tier.price}
              </div>

              <a
                href={wordpressUrls.booking}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-full items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white no-underline transition duration-[250ms] hover:-translate-y-[2px] hover:bg-[#6d7932] hover:text-white"
              >
                Book Session
              </a>

              {tier.duration ? (
                <div className="mt-2 text-center text-[8px] tracking-[0.8px] whitespace-nowrap text-subtle uppercase before:content-['⏱_']">
                  {tier.duration}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
