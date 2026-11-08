import { AtSign, CalendarCheck, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import BookingRequestForm from "@/components/forms/BookingRequestForm";
import OpenStatus from "@/components/layout/OpenStatus";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { BAND, BAND_LINE, CARD, FOCUS, H2, LINK, WRAP } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/pricing";
import {
  bookingCtaHref,
  bookingCtaProps,
  contact,
  homeServiceFeeIdr,
  shortHours,
  studioMapsUrl,
} from "@/lib/site";

const title = "Contact & Booking | Flex & Flow, Uluwatu";
const description =
  "WhatsApp Flex & Flow, book online or send a booking request. The studio in Ungasan, " +
  "Uluwatu is open Monday to Saturday, 09:00 to 17:00, with villa visits.";

/** Studio location, embedded from Google Maps exactly as on the original. */
const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3942.5714153571184!2d115.12042387606834!3d-8.826270990327098!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd25b536736f9db%3A0xa2033d81afbfb42f!2sFlex%26flow%20assisted%20stretching!5e0!3m2!1sen!2sid!4v1738724893822!5m2!1sen!2sid";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact-us/" },
  openGraph: {
    title,
    description,
    url: "/contact-us/",
    type: "website",
    images: ["/images/2026/08/gallery-1.jpg"],
  },
};

/* "+6285858887777" as people write it: "+62 858 5888 7777". */
const phone = contact.phone.replace(/^\+62(\d{3})(\d{4})(\d{4})$/, "+62 $1 $2 $3");

/**
 * Contact and booking: the booking request (`BookingRequestForm`, which
 * opens WhatsApp with it written out) beside the other ways in, with the
 * studio's live open / closed line, then where the studio is.
 *
 * It used to open on "Get in touch with us! … your wellness journey", put a
 * general contact form under "Stay In Touch" that asked for an email and a
 * phone number, and never mention the booking site.
 */
export default function ContactPage() {
  const ways = [
    {
      icon: MessageCircle,
      term: "WhatsApp",
      detail: phone,
      meta: "The quickest way to reach us",
      href: contact.whatsapp,
      external: true,
    },
    {
      icon: CalendarCheck,
      term: "Book online",
      detail: "Pick a time yourself",
      meta: "booking.flexandflow.fit",
      href: bookingCtaHref,
      external: false,
    },
    {
      icon: Mail,
      term: "Email",
      detail: contact.email,
      meta: "For anything that is not a booking",
      href: `mailto:${contact.email}`,
      external: true,
    },
    {
      icon: AtSign,
      term: "Instagram",
      detail: "@flex_and_flow.id",
      meta: "The studio, day to day",
      href: contact.instagram,
      external: true,
    },
  ];

  return (
    <>
      <PageHero
        title="Get in Touch"
        eyebrow="Contact"
        crumbs={[{ label: "Contact Us" }]}
        lead="WhatsApp is the quickest way to reach us. Send a request below and it opens with everything written out, or pick a time yourself on the booking site."
        actions={
          <>
            <ButtonLink href={contact.whatsapp} external variant="solid">
              WhatsApp Us
            </ButtonLink>
            <ButtonLink href={bookingCtaHref}>Book Online</ButtonLink>
          </>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(2rem,3.4vw,3.5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* ── The request ─────────────────────────────────────────────── */}
          <div className="min-w-0">
            <p className="page-label">Booking request</p>
            <h2 className={`mt-2 ${H2}`}>Request a Session</h2>
            <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              Tell us what you would like and when. It opens WhatsApp with your request written
              out, and we confirm the time with you there.
            </p>
            <div className={`mt-6 ${CARD} p-5 sm:p-6`}>
              <BookingRequestForm />
            </div>
          </div>

          {/* ── Other ways in ───────────────────────────────────────────── */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-[92px] lg:h-fit">
            <div className={`${CARD} px-5 py-4`}>
              <OpenStatus />
              <p className="mt-1.5 font-body text-[13px] text-body-text/60 tabular-nums">
                {shortHours} &middot; closed Sunday
              </p>
            </div>

            <ul className={`${CARD} divide-y divide-secondary/10`}>
              {ways.map((way) => {
                const inner = (
                  <>
                    <way.icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
                    <span className="min-w-0">
                      <span className="page-label block">{way.term}</span>
                      <span className="mt-1 block font-body text-[15px] leading-[1.35] font-bold break-words">
                        {way.detail}
                      </span>
                      <span className="mt-1 block font-body text-[12px] leading-[1.4] text-body-text/60">
                        {way.meta}
                      </span>
                    </span>
                    <span aria-hidden className="ml-auto self-center text-primary">
                      &rarr;
                    </span>
                  </>
                );
                const row = `flex items-start gap-3 px-5 py-4 transition-colors duration-300 hover:bg-cream/60 ${FOCUS}`;
                return (
                  <li key={way.term}>
                    {way.external ? (
                      <a
                        href={way.href}
                        className={row}
                        {...(way.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link href={way.href} {...bookingCtaProps} className={row}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>

      {/* ── Where the studio is ───────────────────────────────────────── */}
      <section className={BAND_LINE} aria-labelledby="contact-visit">
        <div className={`${WRAP} ${BAND}`}>
          <p className="page-label">Find us</p>
          <h2 id="contact-visit" className={`mt-2 ${H2}`}>
            Visit the Studio
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <dl className="pl-facts mt-0! lg:grid-cols-1!">
              <div>
                <dt>Studio</dt>
                <dd>
                  {contact.address}
                  <br />
                  <a
                    href={studioMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[14px]! ${LINK}`}
                  >
                    Directions in Google Maps &rarr;
                  </a>
                </dd>
              </div>
              <div>
                <dt>Hours</dt>
                <dd>
                  {shortHours}
                  <br />
                  <span className="text-body-text/60">Closed on Sunday</span>
                </dd>
              </div>
              <div>
                <dt>At your villa</dt>
                <dd>
                  Ungasan, Pecatu, Bingin, Padang Padang and Balangan, {formatIdr(homeServiceFeeIdr)}{" "}
                  per visit on top of the studio price.
                  <br />
                  <Link href="/uluwatu-bali/outcall-home-service-massage/" className={`text-[14px]! ${LINK}`}>
                    How home visits work &rarr;
                  </Link>
                </dd>
              </div>
            </dl>

            <iframe
              src={MAP_SRC}
              title="Flex &amp; Flow studio location"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-[320px] w-full rounded-[10px] border border-secondary/10"
            />
          </div>
        </div>
      </section>
    </>
  );
}
