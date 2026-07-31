import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { contact, workingHours } from "@/lib/site";

/* The practical answers someone needs before they message. */
const facts = [
  { term: "Where", detail: contact.address },
  {
    term: "When",
    detail: workingHours.map((slot) => `${slot.days}, ${slot.hours}`).join(" · "),
  },
  { term: "Can't come to us", detail: "We offer outcall home service in Uluwatu" },
];

/**
 * The page's anchor. Everything above argues for the work; this band answers the
 * practical questions and hands off to WhatsApp, which is how these bookings
 * actually happen.
 */
export default function BookClose() {
  return (
    <section className="band">
      <Container>
        {/* Olive owns the region and anchors the scroll, but only the display
            heading sits on it — at that scale white clears contrast on this
            green. Everything meant to be read sits on a cream inset. */}
        <div className="rounded-[var(--radius-2x)] bg-primary p-[clamp(1rem,2vw,1.75rem)]">
          <h2 className="max-w-[18ch] px-[clamp(0.5rem,1.5vw,1.5rem)] pt-[clamp(1.25rem,2.5vw,2.25rem)] pb-[clamp(1.5rem,2.5vw,2.25rem)] text-[clamp(2.25rem,1.8rem+2vw,3.5rem)] leading-[1.05] text-balance text-white">
            Sore from training? Let&rsquo;s get you moving again.
          </h2>

          <div className="grid gap-[clamp(1.75rem,3vw,3.5rem)] rounded-[var(--radius-1x)] bg-cream p-[clamp(1.5rem,3vw,2.75rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div>
              <p className="max-w-[46ch] font-body text-[17px] leading-[1.7]">
                Message us on WhatsApp and tell us what hurts. We&rsquo;ll tell
                you which session suits and when we can fit you in.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href={contact.whatsapp} external variant="solid">
                  Book on WhatsApp
                </ButtonLink>
                <a
                  href={contact.phoneHref}
                  className="font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary"
                >
                  {contact.phone}
                </a>
              </div>
            </div>

            <dl className="flex flex-col gap-4">
              {facts.map((fact) => (
                <div
                  key={fact.term}
                  className="border-t border-secondary/12 pt-4 first:border-t-0 first:pt-0"
                >
                  <dt className="font-body text-[13px] tracking-[0.06em] text-body-text/70 uppercase">
                    {fact.term}
                  </dt>
                  <dd className="mt-1.5 font-body text-[16px] leading-[1.6]">
                    {fact.detail}
                  </dd>
                </div>
              ))}

              <div className="border-t border-secondary/12 pt-4">
                <dt className="sr-only">More</dt>
                <dd>
                  <Link
                    href="/contact-us"
                    className="font-body text-[15px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary hover:decoration-primary"
                  >
                    Find the studio &amp; full contact details
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
