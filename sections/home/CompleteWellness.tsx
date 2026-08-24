import Image from "next/image";

import { BAND, BTN_GHOST, H2, WRAP } from "@/components/ui/tokens";
import { externalBookingUrl } from "@/lib/site";

/* The studio's own list of what every session is aimed at, in source order. */
const points = [
  "Dedicated attention in every session",
  "Relief from pain and stiffness",
  "Improved mobility and body function",
  "Hands-on care focused on lasting results",
  "Personalized treatments for every individual",
];

/**
 * "Complete Wellness" — the range statement. Copy leads on the left this time,
 * reversing the previous band so the page alternates rather than repeating a
 * photo-then-text rhythm all the way down. The photo sits on a small olive
 * offset instead of the theme's scalloped mask: the same brand green, used as
 * depth rather than ornament.
 */
export default function CompleteWellness() {
  return (
    <section className="page-band-line">
      <div className={`${WRAP} ${BAND}`}>
        <div className="grid items-center gap-[clamp(2rem,3.6vw,3.5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <h2 className={`${H2} text-primary`}>Complete Wellness</h2>
            <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              We provide assisted stretching, sports massage, lymphatic
              drainage, pregnancy massage, trauma release massage, and cupping
              therapy. Every session focuses on relieving pain, improving
              mobility, restoring balance, and supporting overall well-being.
            </p>

            <ul className="clover-list mt-6 max-w-[52ch] font-body text-[15px]">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <a
              href={externalBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_GHOST} mt-7`}
            >
              Book Appointment
            </a>
          </div>

          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-[10px] bg-primary/15"
            />
            <Image
              src="/images/2026/08/complete-wellness.jpg"
              alt="A treatment in progress at the Flex &amp; Flow studio"
              width={2400}
              height={1920}
              sizes="(max-width: 1023px) 92vw, 42vw"
              className="relative aspect-[5/4] w-full rounded-[10px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
