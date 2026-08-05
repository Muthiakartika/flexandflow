import Image from "next/image";
import Link from "next/link";
import { CONTACT, DISCIPLINES } from "@/lib/academy";

/**
 * Component 10 of 10 — SiteFooter.
 *
 * Mirrors the main site's footer structure: contact block, working hours,
 * and navigation.
 *
 * Sits on paper rather than the parent site's black, so the page lightens
 * towards the end instead of stopping at a heavy block. Two consequences to
 * keep in mind when editing:
 *
 *   - Every text tone is on the ink side of the scale now. --color-faint is
 *     too weak here (2.9:1 on paper, under AA), so even the quietest lines
 *     use --color-muted at 5.9:1.
 *   - Four of the nine pages end on a paper Section, which would blend
 *     straight into this — --color-line against paper is only 1.17:1, so a
 *     hairline there is invisible. The olive top rule is what actually marks
 *     the seam, and it echoes the header's utility bar. Do not drop it.
 */
const LEARN = [
  { label: "All courses", href: "/academy/courses" },
  { label: "Onsite schedule", href: "/academy/schedule" },
  { label: "Learning materials", href: "/academy/materials" },
];

const ABOUT = [
  { label: "FAQ", href: "/academy/faq" },
  { label: "Contact", href: "/academy/contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-olive bg-paper text-ink">
      {/* Two columns from sm — without it the 704px tablet width renders one
          very tall stack, since lg:grid-cols-4 only kicks in at 1024px. */}
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Image
            src="/photos/logo.png"
            alt="Flex & Flow"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full bg-white object-contain"
          />
          <p className="display text-2xl">Flex &amp; Flow Academy</p>
          <p className="text-sm text-muted">
            Small-group training for massage, spa and wellness professionals in
            Uluwatu, Bali.
          </p>
          <a
            href={CONTACT.mainSite}
            className="-my-1.5 py-1.5 text-sm font-bold text-ink underline-offset-4 hover:text-olive hover:underline"
          >
            flexandflow.fit ↗
          </a>
        </div>

        {/* Links carry `-my-1.5 py-1.5`: the padding grows the tap target from
            the 20px line box to 32px, the negative margin takes it back out of
            the layout, so spacing is unchanged and neighbours meet without
            overlapping (6px each side into a 12px gap). */}
        <div className="flex flex-col gap-3">
          <h2 className="eyebrow text-muted">Learn</h2>
          {LEARN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="-my-1.5 py-1.5 text-sm text-muted hover:text-olive"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="eyebrow text-muted">Disciplines</h2>
          {DISCIPLINES.map((discipline) => (
            <Link
              key={discipline.slug}
              href={`/academy/courses/${discipline.slug}`}
              className="-my-1.5 py-1.5 text-sm text-muted hover:text-olive"
            >
              {discipline.shortTitle}
            </Link>
          ))}
          {ABOUT.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="-my-1.5 py-1.5 text-sm text-muted hover:text-olive"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="eyebrow text-muted">Visit</h2>
          <p className="text-sm text-muted">{CONTACT.address}</p>
          <a
            href={CONTACT.whatsapp}
            className="-my-1.5 py-1.5 text-sm text-muted hover:text-olive"
          >
            WhatsApp {CONTACT.whatsappLabel}
          </a>
          <a
            href={`mailto:${CONTACT.email}`}
            className="-my-1.5 py-1.5 text-sm text-muted hover:text-olive"
          >
            {CONTACT.email}
          </a>
          <p className="text-sm text-muted">{CONTACT.hours}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-6 py-6 text-xs text-muted sm:px-8">
          <p>© {new Date().getFullYear()} Flex &amp; Flow. All rights reserved.</p>
          <p>Uluwatu · Bali · Indonesia</p>
        </div>
      </div>
    </footer>
  );
}
