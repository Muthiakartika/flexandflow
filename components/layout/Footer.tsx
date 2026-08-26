import { Clock, Mail, MapPin, Phone as PhoneIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import NewsletterForm from "./NewsletterForm";
import { Social, socialLinks } from "@/components/ui/Social";
import {
  contact,
  footerIntroShort,
  paymentIcons,
  siteConfig,
  workingHours,
} from "@/lib/site";

const label = "font-body text-[11px] tracking-[0.18em] text-body-text/55 uppercase";
const link =
  "font-body text-[14px] text-body-text/80 transition-colors duration-300 " +
  "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

/**
 * Site footer: deliberately small. It closes the page with the practical
 * essentials — where, when, how to book — on the white ground the studio used
 * before, and nothing else. No display wordmark, no column sprawl.
 */
export default function Footer() {
  return (
    <footer className="border-t border-secondary/10 bg-white">
      <div className="page-wrap py-10">
        {/* Three columns, one block of content each — Pages (a short nav
            list) used to sit here, but a six-link list has no natural way to
            reach the height of a real content column, and every attempt at
            pairing it with another block just moved the mismatch around
            instead of closing it. Splitting Visit and Newsletter back into
            their own columns, matching booking.flexandflow.fit's, means each
            one only has to be as tall as itself.

            `items-start`, not the grid default `stretch`: a stretched column
            leaves dead space below whichever content is shorter than the
            tallest — no border makes that invisible in code, but not on the
            actual page. */}
        <div className="grid items-start gap-y-8 gap-x-12 lg:grid-cols-3">
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
                sizes="56px"
                className="h-14 w-14 object-contain"
              />
            </Link>

            {/* `footerIntroShort` — the first sentence only, verbatim, see
                its definition in lib/site.ts for why. */}
            <p className="mt-4 max-w-[38ch] font-body text-[14px] leading-[1.7] text-body-text/70">
              {footerIntroShort}
            </p>
          </div>

          {/* Practicalities. Each line gets a small marker — a bare list of
              four lines in a row otherwise reads as one grey block, and the
              icon is what a glance uses to find "the phone number" without
              reading all four. */}
          <div>
            <p className={label}>Visit</p>
            <div className="mt-3 flex items-start gap-2">
              <MapPin
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              <address className="max-w-[30ch] font-body text-[14px] leading-[1.65] text-body-text/80 not-italic">
                {contact.address}
              </address>
            </div>
            {workingHours.map((slot) => (
              <div key={slot.days} className="mt-2 flex items-start gap-2">
                <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="font-body text-[14px] text-body-text/80">
                  {slot.days} &middot; {slot.hours}
                </p>
              </div>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <PhoneIcon aria-hidden className="h-4 w-4 shrink-0 text-primary" />
              <a href={contact.phoneHref} className={link}>
                {contact.phone}
              </a>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
              <a href={`mailto:${contact.email}`} className={link}>
                {contact.email}
              </a>
            </div>
          </div>

          {/* Newsletter, with the payment marks underneath — the social
              profiles sit in the bottom bar instead, level with copyright. */}
          <div>
            <p className={label}>Newsletter</p>
            <NewsletterForm />

            <ul className="mt-4 flex items-center gap-2">
              {paymentIcons.map((icon) => (
                <li
                  key={icon.src}
                  className="flex h-8 items-center rounded-[6px] border border-secondary/12 px-2.5"
                >
                  <Image
                    src={icon.src}
                    alt={icon.alt}
                    width={50}
                    height={32}
                    className="h-4 w-auto object-contain"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="page-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-secondary/10 py-5">
        <p className="font-body text-[13px] text-body-text/60">
          {siteConfig.copyright}
        </p>

        <ul className="flex items-center gap-4">
          {socialLinks.map((item) => (
            <li key={item.href}>
              <Social {...item} variant="bare" />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
