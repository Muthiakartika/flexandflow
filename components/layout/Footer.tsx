import Image from "next/image";
import Link from "next/link";

import NewsletterForm from "./NewsletterForm";
import { Social, socialLinks } from "@/components/ui/Social";
import { contact, footerIntro, siteConfig, workingHours } from "@/lib/site";
import type { NavItem } from "@/lib/site";

const label = "font-body text-[11px] tracking-[0.18em] text-body-text/55 uppercase";
const link =
  "font-body text-[14px] text-body-text/80 transition-colors duration-300 " +
  "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

/**
 * Home and Price List were missing here, which left this column two links
 * shorter than the other two and made the row look untidy. Both are pages the
 * header already offers, and Price List is the one a visitor at the foot of
 * the page is most likely to want.
 */
const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Price List", href: "/price-list" },
  { label: "About us", href: "/about-us" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact-us" },
];

/**
 * The footer's link list, in two columns filled column-wise: a single file of
 * six left the right half of this column empty while the two either side of it
 * were full.
 *
 * `grid-flow-col` over an explicit row count, not CSS multi-column and not the
 * default row flow. Row flow fills across, so the six would read Home, Services
 * / Price List, About us — scrambled for a list of links. Multi-column reads in
 * the right order but balances by height, so any label long enough to wrap
 * would silently move the split off 3/3; the row count pins it.
 *
 * The row count goes in `style` because Tailwind cannot see a class name built
 * at runtime — `grid-rows-${rows}` would compile to nothing.
 */
function FooterLinks({ items }: { items: NavItem[] }) {
  const rows = Math.ceil(items.length / 2);

  return (
    <ul
      className="mt-3 grid grid-flow-col grid-cols-2 gap-x-6 gap-y-1.5"
      style={{ gridTemplateRows: `repeat(${rows}, auto)` }}
    >
      {items.map((item) => (
        <li key={item.href}>
          {item.external ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              {item.label}
            </a>
          ) : (
            <Link href={item.href} className={link}>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Site footer: deliberately small. It closes the page with the practical
 * essentials — where, when, how to book — on the white ground the studio used
 * before, and nothing else. No display wordmark, no column sprawl.
 */
export default function Footer() {
  return (
    <footer className="border-t border-secondary/10 bg-white">
      <div className="page-wrap py-10">
        {/* 48px between columns, not 32. The intro paragraph fills its column,
            so at the old gutter its last word sat a hair from the Pages list
            and the three columns read as one crowded block. */}
        <div className="grid gap-y-8 gap-x-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,4fr)]">
          {/* Identity + reach */}
          <div>
            <Link
              href="/"
              aria-label={siteConfig.name}
              className="inline-block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {/* 56px, not 48: the mark is fine olive line work on its own
                  white disc, so on the white footer only the linework carries
                  it — at 48 the ring and the lettering were disappearing. */}
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={861}
                height={861}
                sizes="56px"
                className="h-14 w-14 object-contain"
              />
            </Link>

            {/* The summary the WordPress footer carried. It was ported into
                `footerIntro` with the rest of the copy and then never rendered,
                which left this column as a logo and three words. It is the
                studio's own wording — do not rewrite it.

                No `max-w` here on purpose: capping the measure at 46ch inside a
                400px column bought nothing and cost a sixth line, which is the
                line that pushed this column below the other two. */}
            <p className="mt-4 font-body text-[14px] leading-[1.7] text-body-text/70">
              {footerIntro}
            </p>
          </div>

          {/* Pages */}
          <nav aria-label="Footer">
            <p className={label}>Pages</p>
            <FooterLinks items={nav} />
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

      {/* The two profiles live down here rather than under the intro
          paragraph. In the identity column they were a fourth element hanging
          well below where the other two columns ended, which is what made the
          row look out of true; on this bar they sit opposite the copyright
          line, which had the whole right-hand side empty. E-mail is not
          repeated here — it is a column above and a row on the Contact page. */}
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
