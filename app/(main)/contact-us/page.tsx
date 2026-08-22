import type { Metadata } from "next";

import ContactForm from "@/components/forms/ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { Social, socialLinks } from "@/components/ui/Social";
import { BAND, CARD, FOCUS, H2, WRAP } from "@/components/ui/tokens";
import { contact, workingHours } from "@/lib/site";

const description =
  "Get in touch with us! We’re here to answer any questions and help you with your wellness journey. Reach out today and let’s connect.";

/** Studio location, embedded from Google Maps exactly as on the original. */
const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3942.5714153571184!2d115.12042387606834!3d-8.826270990327098!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd25b536736f9db%3A0xa2033d81afbfb42f!2sFlex%26flow%20assisted%20stretching!5e0!3m2!1sen!2sid!4v1738724893822!5m2!1sen!2sid";

export const metadata: Metadata = {
  title: "Contact Us - Flex and Flow",
  description,
  alternates: { canonical: "/contact-us/" },
  openGraph: {
    title: "Contact Us - Flex and Flow",
    description,
    url: "/contact-us/",
    type: "article",
  },
};

export default function ContactPage() {
  const details = [
    { term: "Address", detail: contact.address },
    {
      term: "Hours",
      detail: workingHours
        .map((slot) => `${slot.days} · ${slot.hours}`)
        .join(" "),
    },
  ];

  return (
    <>
      <PageHero
        title="Contact Us"
        crumbs={[{ label: "Contact Us" }]}
        lead={description}
        actions={
          <ButtonLink href={contact.whatsapp} external variant="solid">
            Book on WhatsApp
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* ── The form ────────────────────────────────────────────────── */}
          <div>
            <h2 className={H2}>Stay In Touch</h2>
            <div className={`mt-5 ${CARD} p-5`}>
              <ContactForm />
            </div>
          </div>

          {/* ── The studio's own details ────────────────────────────────── */}
          <div>
            <h2 className={H2}>Contact Us</h2>

            <p className="mt-4 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              Ready to start your journey with Flex &amp; Flow? Whether you have
              a question, need support, or just want to say hello, we&rsquo;re
              here for you! Reach out to us and experience the flow of seamless
              communication and service.
            </p>
            <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              We&rsquo;re excited to hear from you and ready to assist however we
              can. Don&apos;t hesitate to connect with us today!
            </p>

            <dl className={`mt-6 ${CARD} p-5`}>
              {details.map((row) => (
                <div
                  key={row.term}
                  className="border-t border-secondary/10 py-3 first:border-t-0 first:pt-0"
                >
                  <dt className="page-label">{row.term}</dt>
                  <dd className="mt-1.5 font-body text-[15px] leading-[1.6]">
                    {row.detail}
                  </dd>
                </div>
              ))}

              <div className="border-t border-secondary/10 py-3">
                <dt className="page-label">Email</dt>
                <dd className="mt-1.5">
                  <a
                    href={`mailto:${contact.email}`}
                    className={`font-body text-[15px] break-all transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    {contact.email}
                  </a>
                </dd>
              </div>

              <div className="border-t border-secondary/10 py-3">
                <dt className="page-label">Phone</dt>
                <dd className="mt-1.5">
                  <a
                    href={contact.phoneHref}
                    className={`font-body text-[15px] font-bold tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    {contact.phone}
                  </a>
                </dd>
              </div>

              <div className="border-t border-secondary/10 pt-4">
                <dt className="page-label">Social</dt>
                <dd className="mt-2.5 flex items-center gap-2">
                  {socialLinks.map((item) => (
                    <Social key={item.href} {...item} />
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── Where the studio is ───────────────────────────────────────── */}
      <section className="page-band-line">
        <div className={`${WRAP} ${BAND}`}>
          <h2 className="sr-only">Find the studio</h2>
          <iframe
            src={MAP_SRC}
            title="Flex &amp; Flow studio location"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[420px] w-full rounded-[10px] border border-secondary/10 max-[767px]:h-[300px]"
          />
        </div>
      </section>
    </>
  );
}
