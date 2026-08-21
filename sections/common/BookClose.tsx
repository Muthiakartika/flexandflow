import Image from "next/image";

import { contact, siteConfig } from "@/lib/site";
import { BAND, WRAP } from "@/components/ui/tokens";

/* On the olive region the shared olive focus ring would be invisible, so the
   two links here take a white one. */
const FOCUS_ON_OLIVE =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * The closing hand-off. One olive region anchors the end of the scroll — the
 * only saturated band on the page, so it reads as an ending rather than as
 * another section.
 *
 * The olive is `--color-primary-strong`: the brand green one step down, because
 * white body copy on `#7f8c3a` is 3.67:1 and fails AA. Nothing here is written
 * for the occasion — the line is the site's own description, and the studio has
 * no reviews to quote yet.
 *
 * A photograph carries the right-hand half. Text and two links alone left the
 * band mostly empty olive, which read as an unfinished section rather than a
 * deliberate ending; the picture is a session rather than an empty room,
 * because this block is asking for a booking.
 *
 * The logo is NOT filtered here. It is a white disc with the mark knocked out
 * of it in olive, so `brightness-0 invert` — the usual trick for putting a dark
 * logo on a dark ground — flattened the whole disc into a plain white circle
 * and destroyed the mark. On this olive it already has all the contrast it
 * needs.
 */
export default function BookClose() {
  return (
    <section className={WRAP}>
      <div className={`${BAND} my-[clamp(2rem,3vw,3rem)] rounded-[10px] bg-primary-strong px-[clamp(1.5rem,3vw,3rem)]`}>
        <div className="grid items-center gap-[clamp(1.75rem,3.5vw,3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
          <div>
            <Image
              src={siteConfig.logo}
              alt=""
              aria-hidden
              width={861}
              height={861}
              sizes="64px"
              className="h-16 w-16 object-contain"
            />
            <h2 className="mt-4 text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)] leading-[1.06] font-bold text-white">
              {siteConfig.shortName}
            </h2>
            <p className="mt-3 max-w-[44ch] font-body text-[15px] leading-[1.7] text-white">
              {siteConfig.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center rounded-[10px] bg-white px-6 py-3 font-body text-[15px] leading-none font-bold text-primary-strong transition-colors duration-300 hover:bg-cream ${FOCUS_ON_OLIVE}`}
              >
                Book on WhatsApp
              </a>
              <a
                href={contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-body text-[15px] text-white underline decoration-white/50 underline-offset-[5px] transition-colors duration-300 hover:decoration-white ${FOCUS_ON_OLIVE}`}
              >
                Instagram
              </a>
            </div>
          </div>

          <Image
            src="/images/2026/08/book-close.jpg"
            alt=""
            aria-hidden
            width={1600}
            height={1200}
            sizes="(max-width: 1023px) 92vw, 560px"
            className="aspect-[4/3] w-full rounded-[10px] object-cover"
          />
        </div>
      </div>
    </section>
  );
}
