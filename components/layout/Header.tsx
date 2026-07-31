import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import { contact, primaryNav, siteConfig } from "@/lib/site";

/**
 * Site header, rebuilt for the studio look: a slim sticky bar rather than the
 * old theme's 184px band with its oversized overhanging logo. Logo left,
 * uppercase nav centre-right, and one solid booking action that stays reachable
 * on every scroll position — the pattern both reference studios use.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-secondary/10 bg-cream/85 backdrop-blur-md">
      <Container className="flex min-h-[76px] items-center gap-6 max-[479px]:min-h-[64px]">
        <Link
          href="/"
          aria-label={siteConfig.name}
          className="shrink-0 rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src={siteConfig.logo}
            alt={siteConfig.name}
            width={861}
            height={861}
            priority
            sizes="56px"
            className="h-14 w-14 object-contain max-[479px]:h-11 max-[479px]:w-11"
          />
        </Link>

        <div className="ml-auto flex items-center gap-7 max-[1180px]:hidden">
          <DesktopNav items={primaryNav} />

          <a
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-[10px] bg-primary px-6 py-3 font-body text-[13px] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-[#6d7932] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Book now
          </a>
        </div>

        {/* Below 1181px the nav collapses to the drawer, with the action kept. */}
        <div className="ml-auto flex items-center gap-3 min-[1181px]:hidden">
          <a
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-[10px] bg-primary px-5 py-2.5 font-body text-[12px] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-[#6d7932] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[380px]:hidden"
          >
            Book
          </a>
          <MobileNav items={primaryNav} />
        </div>
      </Container>
    </header>
  );
}
