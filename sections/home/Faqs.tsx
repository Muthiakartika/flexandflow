import Link from "next/link";

import Accordion from "@/components/ui/Accordion";
import { homeFaqs } from "@/lib/data/home";
import { contact, workingHours } from "@/lib/site";
import { BAND, BTN_SOLID, CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";

/**
 * FAQs with the practical card beside them. Previously the questions ran full
 * width over a botanical background photo and the address only appeared in the
 * footer; pairing them keeps the page short and puts where/when/how-to-book
 * next to the last thing anyone reads before deciding.
 */
export default function Faqs() {
  return (
    <section className="page-band-line">
      <div className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          <div>
            <h2 className={H2}>FAQs</h2>
            <Accordion items={homeFaqs} className="mt-5" />
          </div>

          <div className={`${CARD} h-fit p-5 lg:sticky lg:top-[92px]`}>
            <h2 className="font-display text-[26px] leading-none font-bold">
              Visit us
            </h2>

            <dl className="mt-5 flex flex-col gap-4">
              <div>
                <dt className="page-label">Studio</dt>
                <dd className="mt-1.5 font-body text-[15px] leading-[1.6]">
                  {contact.address}
                </dd>
              </div>

              <div className="border-t border-secondary/10 pt-4">
                <dt className="page-label">Hours</dt>
                {workingHours.map((slot) => (
                  <dd
                    key={slot.days}
                    className="mt-1.5 font-body text-[15px] leading-[1.6]"
                  >
                    {slot.days} &middot; {slot.hours}
                  </dd>
                ))}
              </div>

              <div className="border-t border-secondary/10 pt-4">
                <dt className="page-label">Bookings</dt>
                <dd className="mt-1.5">
                  <a
                    href={contact.phoneHref}
                    className={`font-body text-[15px] font-bold tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    {contact.phone}
                  </a>
                </dd>
                <dd className="mt-1">
                  <a
                    href={`mailto:${contact.email}`}
                    className={`font-body text-[15px] break-all transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>
            </dl>

            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_SOLID} mt-5 w-full`}
            >
              Book on WhatsApp
            </a>

            <p className="mt-4 text-center">
              <Link href="/contact-us" className={LINK}>
                Find the studio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
