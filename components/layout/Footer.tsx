import Image from "next/image";
import Link from "next/link";

import NewsletterForm from "./NewsletterForm";
import { contact, siteConfig, workingHours } from "@/lib/site";

const label = "font-body text-[11px] tracking-[0.18em] text-body-text/55 uppercase";
const link =
  "font-body text-[14px] text-body-text/80 transition-colors duration-300 " +
  "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

const nav = [
  { label: "Services", href: "/services" },
  { label: "About us", href: "/about-us" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact-us" },
];

/**
 * Site footer: deliberately small. It closes the page with the practical
 * essentials — where, when, how to book — on the white ground the studio used
 * before, and nothing else. No display wordmark, no column sprawl.
 */
export default function Footer() {
  return (
    <footer className="border-t border-secondary/10 bg-white">
      <div className="page-wrap py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,4fr)]">
          {/* Identity + reach */}
          <div>
            <Link
              href="/"
              aria-label={siteConfig.name}
              className="inline-block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={861}
                height={861}
                sizes="48px"
                className="h-12 w-12 object-contain"
              />
            </Link>

            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              <li>
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  Instagram
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className={link}>
                  Email
                </a>
              </li>
            </ul>
          </div>

          {/* Pages */}
          <nav aria-label="Footer">
            <p className={label}>Pages</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={link}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Practicalities */}
          <div>
            <p className={label}>Visit</p>
            <address className="mt-3 max-w-[34ch] font-body text-[14px] leading-[1.65] text-body-text/80 not-italic">
              {contact.address}
            </address>
            {workingHours.map((slot) => (
              <p
                key={slot.days}
                className="mt-1.5 font-body text-[14px] text-body-text/80"
              >
                {slot.days} &middot; {slot.hours}
              </p>
            ))}
            <p className="mt-1.5">
              <a href={contact.phoneHref} className={link}>
                {contact.phone}
              </a>
            </p>

            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>

      <div className="page-wrap border-t border-secondary/10 py-5">
        <p className="font-body text-[13px] text-body-text/60">
          {siteConfig.copyright}
        </p>
      </div>
    </footer>
  );
}
