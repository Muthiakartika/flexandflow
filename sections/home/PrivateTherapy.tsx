import Image from "next/image";

import BenefitIcon, {
  benefitLabels,
  type BenefitIconName,
} from "@/components/ui/BenefitIcon";
import { contact } from "@/lib/site";
import { BAND, BTN_SOLID, CARD, FOCUS, H2, WRAP } from "@/components/ui/tokens";

const benefits = Object.keys(benefitLabels) as BenefitIconName[];

/**
 * "One on One Private Therapy Available" — the mechanism section, shared by the
 * home and About pages, which differ only in the eyebrow.
 *
 * The original stacked three photos into an Elementor collage with decorative
 * botanicals behind it. Here two frames overlap instead: the room, and the
 * hands working in it. The four benefit glyphs the theme already owns become a
 * plain 2x2 under hairlines rather than four boxed tiles.
 */
export default function PrivateTherapy({
  eyebrow = "Our Solution For Your Body Needs",
}: {
  eyebrow?: string;
}) {
  return (
    <section className="page-band-line">
      <div className={`${WRAP} ${BAND}`}>
        <div className="grid items-center gap-[clamp(2rem,3.6vw,3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* ── Two overlapping frames ─────────────────────────────────── */}
          <div className="relative">
            <Image
              src="/images/2026/08/private-therapy.jpg"
              alt="A one-to-one session in progress at the studio"
              width={2400}
              height={1920}
              sizes="(max-width: 1023px) 92vw, 42vw"
              className="aspect-[5/4] w-full rounded-[10px] object-cover"
            />

            <Image
              src="/images/2026/08/private-therapy-inset.jpg"
              alt=""
              aria-hidden
              width={800}
              height={1000}
              sizes="150px"
              className="absolute right-4 -bottom-6 hidden h-[190px] w-[150px] rounded-[10px] border-4 border-cream object-cover sm:block lg:-right-6"
            />
          </div>

          {/* ── What the hour is for ───────────────────────────────────── */}
          <div className="mt-8 lg:mt-0">
            <p className="page-label">{eyebrow}</p>
            <h2 className={`mt-2 ${H2}`}>
              One on One Private Therapy Available
            </h2>
            <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[1.7] text-body-text/80">
              Experience a custom-designed session tailored to your body&rsquo;s
              needs. Our expert practitioner will guide you through gentle
              stretches, helping you move better and feel your best.
            </p>

            <ul className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {benefits.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-3 border-t border-secondary/10 pt-4"
                >
                  <span className="text-primary">
                    <BenefitIcon name={name} className="h-9 w-9" />
                  </span>
                  <span className="font-body text-[14px] leading-snug">
                    {benefitLabels[name]}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className={`mt-7 flex flex-wrap items-center justify-between gap-4 ${CARD} p-4`}
            >
              <span>
                <span className="page-label">Chat Us Anytime</span>
                <a
                  href={contact.phoneHref}
                  className={`mt-1.5 block font-body text-[16px] leading-none font-bold tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                >
                  {contact.phone}
                </a>
              </span>

              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN_SOLID}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
