import Image from "next/image";
import Link from "next/link";

import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import { primaryNav, siteConfig } from "@/lib/site";

/**
 * Site header, rebuilt for the studio look: a slim sticky bar rather than the
 * old theme's 184px band with its oversized overhanging logo. Logo left,
 * uppercase nav centre-right, and one solid booking action that stays reachable
 * on every scroll position — the pattern both reference studios use.
 *
 * That action used to open WhatsApp, because there was nowhere on this site to
 * send anyone. There is now: it goes to `/intake` first — every booking CTA on
 * the site does, since a visitor has to complete the client intake & consent
 * form before reaching the external booking site — which is why it is a
 * `Link` and no longer opens a new tab. WhatsApp is still one tap away from the
 * closing band and the mobile drawer for people who would rather just message.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-secondary/10 bg-white/95 backdrop-blur-md">
      <div className="page-wrap flex min-h-[76px] items-center gap-6 max-[479px]:min-h-[64px]">
        <Link
          href="/"
          aria-label={siteConfig.name}
          className="flex shrink-0 items-center gap-3 rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src={siteConfig.logo}
            alt=""
            width={861}
            height={861}
            priority
            sizes="56px"
            className="h-14 w-14 object-contain max-[479px]:h-11 max-[479px]:w-11"
          />
          {/* Wordmark in the academy's lockup: the studio name on the display
              face, what it does tracked out underneath. */}
          <span
            aria-hidden
            className="font-display text-[30px] leading-none whitespace-nowrap text-body-text max-[479px]:text-[24px]"
          >
            {siteConfig.shortName}
            {/* 9px on tighter tracking keeps the longer second line close to
                the width of the name above it. */}
            <span className="mt-1 block font-body text-[9px] leading-none font-bold tracking-[0.14em] text-subtle uppercase">
             Body Work and Movement
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-7 max-[1180px]:hidden">
          <DesktopNav items={primaryNav} />

          <Link
            href="/intake"
            className="inline-flex items-center rounded-[10px] bg-primary-strong px-6 py-3 font-body text-[13px] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Book now
          </Link>
        </div>

        {/* Below 1181px the nav collapses to the drawer, with the action kept. */}
        <div className="ml-auto flex items-center gap-3 min-[1181px]:hidden">
          <Link
            href="/intake"
            className="inline-flex items-center rounded-[10px] bg-primary-strong px-5 py-2.5 font-body text-[12px] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[380px]:hidden"
          >
            Book
          </Link>
          <MobileNav items={primaryNav} />
        </div>
      </div>
    </header>
  );
}
