"use client";

import Link from "next/link";
import { useState } from "react";

import { FOCUS, LINK } from "@/components/ui/tokens";
import type { TreatmentMenu } from "@/lib/price-menus";
import { formatIdr } from "@/lib/pricing";
import { homeServiceFeeIdr } from "@/lib/site";

export type PriceMenu = TreatmentMenu & {
  name: string;
  href: string;
  /** One line on who it is for. */
  line: string;
  /** WhatsApp with the treatment already named in the message. */
  whatsapp: string;
};

/**
 * The price list's menus: one card per treatment, every session on its own
 * line with a dotted leader to its price, the team's sessions first and
 * Ginny's after.
 *
 * One switch above them answers "studio or villa?" for the whole page, so
 * each line carries one price, as the hero rate card on a treatment page
 * does. Studio-only treatments keep their studio price and say so. The
 * shortcuts beside it jump to each card.
 */
export default function PriceMenus({ menus }: { menus: PriceMenu[] }) {
  const [atVilla, setAtVilla] = useState(false);

  /* Through the smooth scroll, as `PageToc` does: a plain jump fights it and
     lands far past the card. */
  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    const lenis = (window as { __lenis?: { scrollTo: (t: HTMLElement, o: object) => void } }).__lenis;
    if (!target || !lenis) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: -96 });
    history.replaceState(null, "", `#${id}`);
  };

  /* On the cream page, not inside a white card as on a treatment page: a
     white track and an olive pill, so the switch reads as one. */
  const tab = (active: boolean) =>
    `rounded-full px-4 py-2.5 font-body text-[13px] leading-none whitespace-nowrap transition-colors duration-300 ${FOCUS} ${
      active ? "bg-primary-strong font-bold text-white" : "text-body-text/65 hover:text-body-text"
    }`;

  return (
    <>
      <div className="pl-controls">
        <nav aria-label="Treatments" className="pl-jump">
          <ul>
            {menus.map((menu) => (
              <li key={menu.slug}>
                <a href={`#${menu.slug}`} onClick={(event) => go(event, menu.slug)} className={FOCUS}>
                  {menu.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div
          role="group"
          aria-label="Where the session is"
          className="grid shrink-0 grid-cols-2 gap-1 rounded-full border border-secondary/12 bg-white p-1"
        >
          <button type="button" aria-pressed={!atVilla} onClick={() => setAtVilla(false)} className={tab(!atVilla)}>
            At the studio
          </button>
          <button type="button" aria-pressed={atVilla} onClick={() => setAtVilla(true)} className={tab(atVilla)}>
            At your villa
          </button>
        </div>
      </div>

      <p className="pl-where" aria-live="polite">
        {atVilla
          ? `At your villa in the Uluwatu area: the studio price plus ${formatIdr(homeServiceFeeIdr)} per visit, already added below.`
          : "At the studio on Jl. Toya Ning II, Ungasan."}
      </p>

      <div className="pl-grid">
        {menus.map((menu) => (
          <article key={menu.slug} id={menu.slug} className="pl-card">
            <h2 className="pl-name">
              <Link href={menu.href} className={`transition-colors duration-300 hover:text-primary ${FOCUS}`}>
                {menu.name}
              </Link>
            </h2>
            <p className="pl-line">{menu.line}</p>

            <dl className="pl-menu">
              {menu.rows.map((row) => (
                <div key={`${row.session}-${row.who}`} className="pl-row">
                  <dt>
                    {row.session}
                    {row.who ? <span className="pl-who">{row.who}</span> : null}
                  </dt>
                  <span aria-hidden className="pl-leader" />
                  <dd>
                    {row.addOn ? "+ " : ""}
                    {formatIdr(atVilla && row.villa !== null ? row.villa : row.studio)}
                  </dd>
                </div>
              ))}
            </dl>

            {atVilla && !menu.homeService ? (
              <p className="pl-note">Studio only: not on the home service menu.</p>
            ) : null}

            <div className="pl-actions">
              <a
                href={menu.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-[10px] bg-primary-strong px-4 py-2.5 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
              >
                Book on WhatsApp
              </a>
              <Link href={menu.href} className={LINK}>
                What it involves &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
