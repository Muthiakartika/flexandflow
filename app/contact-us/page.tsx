import type { Metadata } from "next";

import ContactForm from "@/components/forms/ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
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

const WHATSAPP_PATH =
  "M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.01 12.01 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896a11.82 11.82 0 0 0-3.48-8.45M12.05 21.785h-.004a9.87 9.87 0 0 1-5.032-1.378l-.36-.214-3.741.98 1.005-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.885-9.884a9.83 9.83 0 0 1 6.988 2.9 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.437 9.884-9.888 9.884";

const INSTAGRAM_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.586 2.163 15.206 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608C4.519 2.567 5.786 2.293 7.152 2.231 8.418 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8";

function Social({
  href,
  path,
  label,
}: {
  href: string;
  path: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-secondary/20 text-secondary transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
        <path d={path} />
      </svg>
    </a>
  );
}

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
                  <Social
                    href={contact.whatsapp}
                    path={WHATSAPP_PATH}
                    label="WhatsApp"
                  />
                  <Social
                    href={contact.instagram}
                    path={INSTAGRAM_PATH}
                    label="Instagram"
                  />
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
