import Image from "next/image";
import Link from "next/link";

import NewsletterForm from "./NewsletterForm";
import OpenStatus from "./OpenStatus";
import { Social, socialLinks } from "@/components/ui/Social";
import { BTN_GHOST, BTN_SOLID } from "@/components/ui/tokens";
import {
  bookingCtaHref,
  bookingCtaProps,
  contact,
  paymentIcons,
  siteConfig,
  studioMapsUrl,
} from "@/lib/site";

const label = "font-body text-[11px] tracking-[0.18em] text-body-text/55 uppercase";
const link =
  "font-body text-[14px] text-body-text/80 transition-colors duration-300 " +
  "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

const explore = [
  { label: "Treatments", href: "/services" },
  { label: "Price List", href: "/price-list" },
  { label: "Home Service", href: "/uluwatu-bali/outcall-home-service-massage" },
  { label: "Meet the Team", href: "/about-us" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact-us" },
];

/**
 * Site footer, on the white ground the studio has always closed on (a black
 * one was tried and rejected).
 *
 * It signs off rather than just stopping: a line in the display face, a
 * booking card that says whether the studio is open right now in Bali time
 * (`OpenStatus`), the practical details, the newsletter, and the studio's
 * name as a wordmark. The wordmark is decoration and hidden from assistive
 * tech; the header's logo is the link home.
 *
 * Every piece is a direct child of one grid (`.footer-grid` in
 * `globals.css`), placed by area: stacked on a phone, two columns on a
 * tablet, and on a wide screen three tight rows (the sign-off, then the
 * booking buttons and the newsletter side by side on one line; the wordmark
 * beside the three detail columns; the small print), so no column is left
 * with a tall empty space under it.
 */
export default function Footer() {
  return (
    <footer className="overflow-hidden border-t border-secondary/10 bg-white">
      <div className="footer-grid page-wrap">
        {/* ── Sign-off ───────────────────────────────────────────────────── */}
        <div className="footer-sign">
          <p className="font-display text-[clamp(2.5rem,2rem+1.8vw,3.25rem)] leading-[0.95] font-bold">
            See you on the table.
          </p>
          <p className="mt-3 max-w-[42ch] font-body text-[14px] leading-[1.65] text-body-text/70">
            Bodywork, massage and assisted stretching in Ungasan, Uluwatu. At the studio, or at
            your villa.
          </p>
        </div>

        {/* ── Booking ────────────────────────────────────────────────────── */}
        {/* No box: the open/closed line as a small pill over the two
            buttons, sitting on the sign-off's baseline. */}
        <div className="footer-book">
          <div className="footer-status inline-flex rounded-full bg-cream px-3.5 py-2">
            <OpenStatus />
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href={bookingCtaHref} {...bookingCtaProps} className={`${BTN_SOLID} rounded-full`}>
              Book Session
            </Link>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_GHOST} rounded-full`}
            >
              WhatsApp Us
            </a>
          </div>
        </div>

        {/* ── Newsletter ─────────────────────────────────────────────────── */}
        {/* Built like the booking block beside it: one short line level with
            the open/closed pill, then the field on the buttons' line. */}
        <div className="footer-news">
          <p className="flex min-h-9 flex-wrap items-center gap-x-2.5 font-body text-[13px] text-body-text/65">
            <span className={label}>Newsletter</span>
            <span>Studio news and the odd recovery tip. No spam.</span>
          </p>
          <NewsletterForm compact />
        </div>

        <hr className="footer-rule" />

        {/* ── The details ────────────────────────────────────────────────── */}
        <div className="footer-studio">
          <p className={label}>Studio</p>
          <address className="mt-3 max-w-[28ch] font-body text-[14px] leading-[1.65] text-body-text/80 not-italic">
            {contact.address}
          </address>
          <a
            href={studioMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${link} mt-2 inline-block text-primary!`}
          >
            Get directions &rarr;
          </a>
        </div>

        <div className="footer-contact">
          <p className={label}>Contact</p>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`${link} tabular-nums`}
              >
                WhatsApp {contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className={link}>
                {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className={link}>
                Instagram @flex_and_flow.id
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer" className="footer-explore">
          <p className={label}>Explore</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {explore.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p aria-hidden className="footer-mark">
          Flex <span>&amp;</span> Flow
        </p>

        {/* ── Small print ────────────────────────────────────────────────── */}
        <div className="footer-base">
          <p className="font-body text-[13px] text-body-text/60">{siteConfig.copyright}</p>
          <div className="flex items-center gap-5">
            <ul className="flex items-center gap-2" aria-label="Accepted payments">
              {paymentIcons.map((icon) => (
                <li
                  key={icon.src}
                  className="flex h-7 items-center rounded-[6px] border border-secondary/12 px-2"
                >
                  <Image
                    src={icon.src}
                    alt={icon.alt}
                    width={50}
                    height={32}
                    className="h-3.5 w-auto object-contain"
                  />
                </li>
              ))}
            </ul>
            <ul className="flex items-center gap-4">
              {socialLinks.map((item) => (
                <li key={item.href}>
                  <Social {...item} variant="bare" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
