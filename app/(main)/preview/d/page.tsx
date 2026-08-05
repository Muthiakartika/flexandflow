import Image from "next/image";
import Link from "next/link";

import Accordion from "@/components/ui/Accordion";
import BenefitIcon, {
  benefitLabels,
  type BenefitIconName,
} from "@/components/ui/BenefitIcon";
import { homeFaqs } from "@/lib/data/home";
import { serviceBySlug } from "@/lib/data/services";
import { therapists } from "@/lib/data/therapists";
import { assets, contact, workingHours } from "@/lib/site";

export const metadata = { title: "Preview D — Studio", robots: { index: false } };

const benefits = Object.keys(benefitLabels) as BenefitIconName[];

const programme = [
  "assisted-stretching",
  "sport-massage",
  "lymphatic-drainage",
  "cupping-therapy",
  "trauma-healing",
  "lymphatic-detox-massage-for-men",
];

const chips = [
  "Assisted Stretching",
  "Sports Massage",
  "Lymphatic Drainage",
  "Cupping Therapy",
  "Trauma Release",
  "Home Service",
];

const wellnessPoints = [
  "Dedicated attention in every session",
  "Relief from pain and stiffness",
  "Improved mobility and body function",
  "Hands-on care focused on lasting results",
  "Personalized treatments for every individual",
];

const gallery = [
  { src: "/images/2026/06/Gallery-1.jpg", w: 1024, h: 621 },
  { src: "/images/2026/06/gallery-2.jpg", w: 1024, h: 840 },
  { src: "/images/2026/06/Gallery-3.jpg", w: 1024, h: 494 },
  { src: "/images/2026/07/Gallery-5-new.jpg", w: 1024, h: 494 },
  { src: "/images/2026/06/Gallery-4-new.jpg", w: 1024, h: 621 },
  { src: "/images/2026/06/gallery-6.jpg", w: 1024, h: 840 },
];

function rateFor(slug: string) {
  const service = serviceBySlug.get(slug);
  const tier = service?.tiers.find((t) => t.label === "Master Therapist");
  if (!service || !tier) return null;
  const amount = Number(tier.price.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    title: service.title,
    excerpt: service.excerpt,
    image: service.image,
    slug: service.slug,
    price: `IDR ${amount.toLocaleString("en-US")}`,
    minutes: tier.duration?.match(/(\d+)\s*min/i)?.[1] ?? null,
  };
}

/* Scale is set against Stretchr, the actual peer: its largest type is 61px and
   its ground stays light. A stretching studio should read calm and precise, not
   like a gym poster — so display tops out near 56px and the page runs denser. */
const WRAP = "mx-auto w-full max-w-[1200px] px-6 max-[640px]:px-5";
const BAND = "py-[clamp(2.25rem,3.6vw,3.25rem)]";
const H2 = "text-[clamp(1.75rem,1.5rem+1.1vw,2.5rem)] leading-[1.08] font-bold";
const LABEL =
  "font-body text-[11px] tracking-[0.18em] text-body-text/55 uppercase";
const CARD = "rounded-[10px] border border-secondary/12 bg-white";
const BTN =
  "inline-flex items-center rounded-[10px] bg-primary px-6 py-3 font-body " +
  "text-[15px] text-white transition-colors duration-300 hover:bg-[#6d7932] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function PreviewD() {
  const programmes = programme.map(rateFor).filter((p) => p !== null);
  const hourly = programmes.filter((p) => p.minutes === "60");
  const cheapestHour = Math.min(
    ...hourly.map((p) => Number(p.price.replace(/[^\d]/g, ""))),
  );

  return (
    <>
      {/* ── Hero: compact split, rates stated beside the claim ────────── */}
      <section
        className={`${WRAP} pt-[clamp(1.75rem,3vw,2.75rem)] pb-[clamp(2rem,3.4vw,3rem)]`}
      >
        <div className="grid items-center gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div>
            <p className={LABEL}>Uluwatu &middot; Bali</p>
            <h1 className="mt-3 max-w-[17ch] text-[clamp(2.125rem,1.5rem+2.6vw,3.5rem)] leading-[1.02] font-bold">
              Wellness &amp; Recovery Studio in Uluwatu, Bali
            </h1>
            <p className="mt-4 max-w-[54ch] font-body text-[16px] leading-[1.65] text-body-text/80">
              Welcome to Flex &amp; Flow, we are a small wellness centre based
              in Uluwatu focused on deep release therapeutic bodywork, recovery,
              and long-term wellness.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN}
              >
                Book on WhatsApp
              </a>
              <Link
                href="/services"
                className="inline-flex items-center rounded-[10px] border border-secondary/20 px-6 py-3 font-body text-[15px] transition-colors duration-300 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                All treatments
              </Link>
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-3 sm:max-w-[26rem]">
              <div className={`${CARD} px-4 py-3`}>
                <dt className={LABEL}>In studio</dt>
                <dd className="mt-1 font-body text-[17px] font-bold tabular-nums">
                  IDR {cheapestHour.toLocaleString("en-US")}
                </dd>
                <dd className="font-body text-[12px] text-body-text/60">
                  60 mins
                </dd>
              </div>
              <div className={`${CARD} px-4 py-3`}>
                <dt className={LABEL}>Home service</dt>
                <dd className="mt-1 font-body text-[17px] font-bold">
                  Available
                </dd>
                <dd className="font-body text-[12px] text-body-text/60">
                  Across Uluwatu
                </dd>
              </div>
            </dl>
          </div>

          <video
            className="aspect-[4/3] w-full rounded-[10px] object-cover lg:aspect-[5/6]"
            src={assets.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />
        </div>
      </section>

      {/* ── Chip bar ──────────────────────────────────────────────────── */}
      <section className="border-y border-secondary/12">
        <ul className={`${WRAP} flex flex-wrap items-center gap-x-6 gap-y-2 py-3`}>
          {chips.map((chip) => (
            <li key={chip} className={LABEL}>
              {chip}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Treatments as a compact card grid ─────────────────────────── */}
      <section className={`${WRAP} ${BAND}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={LABEL}>Come &amp; Explore</p>
            <h2 className={`mt-2 ${H2}`}>MORE TREATMENTS FOR&nbsp;YOU</h2>
          </div>
          <Link
            href="/services"
            className="font-body text-[14px] underline underline-offset-[5px] transition-colors duration-300 hover:text-primary"
          >
            Full price list
          </Link>
        </div>
        <p className="mt-3 max-w-[70ch] font-body text-[15px] leading-[1.65] text-body-text/75">
          Experience a variety of services at our wellness and recovery studio
          in Uluwatu. Treatments that are designed to enhance flexibility and
          performance and support your overall wellbeing. Let our experts guide
          you to a healthier, more balanced you.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/uluwatu-bali/${p.slug}`}
                className={`group flex h-full flex-col overflow-hidden ${CARD} transition-colors duration-300 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
              >
                <Image
                  src={p.image}
                  alt=""
                  aria-hidden
                  width={600}
                  height={420}
                  sizes="(max-width: 640px) 92vw, 30vw"
                  className="aspect-[16/10] w-full object-cover"
                />
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-display text-[1.5rem] leading-[1.15] font-bold transition-colors duration-300 group-hover:text-primary">
                    {p.title}
                  </span>
                  <span className="mt-1 line-clamp-2 font-body text-[13px] leading-[1.55] text-body-text/70">
                    {p.excerpt}
                  </span>
                  <span className="mt-3 flex items-baseline gap-2 border-t border-secondary/10 pt-3">
                    <span className="font-body text-[15px] font-bold tabular-nums">
                      {p.price}
                    </span>
                    {p.minutes ? (
                      <span className="font-body text-[12px] text-body-text/60">
                        {p.minutes} mins
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── One on One Private Therapy ────────────────────────────────── */}
      <section className="border-t border-secondary/12">
        <div className={`${WRAP} ${BAND}`}>
          <div className="grid items-center gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Image
              src="/images/2026/06/theraphy-section-with-client-ginny.jpg"
              alt="A one-to-one session in progress"
              width={1300}
              height={1100}
              sizes="(max-width: 1023px) 92vw, 40vw"
              className="aspect-[5/4] w-full rounded-[10px] object-cover"
            />

            <div>
              <p className={LABEL}>Our Solution For Your Body Needs</p>
              <h2 className={`mt-2 ${H2}`}>
                One on One Private Therapy Available
              </h2>
              <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.65] text-body-text/80">
                Experience a custom-designed session tailored to your
                body&rsquo;s needs. Our expert practitioner will guide you
                through gentle stretches, helping you move better and feel your
                best.
              </p>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {benefits.map((name) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="text-primary">
                      <BenefitIcon name={name} className="h-8 w-8" />
                    </span>
                    <span className="font-body text-[14px] leading-snug">
                      {benefitLabels[name]}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BTN}
                >
                  WhatsApp
                </a>
                <span>
                  <span className="block font-body text-[12px] text-body-text/60">
                    Chat Us Anytime
                  </span>
                  <a
                    href={contact.phoneHref}
                    className="font-body text-[15px] font-bold transition-colors duration-300 hover:text-primary"
                  >
                    {contact.phone}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Complete Wellness ─────────────────────────────────────────── */}
      <section className="border-t border-secondary/12">
        <div className={`${WRAP} ${BAND}`}>
          <div className="grid items-center gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div>
              <h2 className={`${H2} text-primary`}>Complete Wellness</h2>
              <p className="mt-3 max-w-[54ch] font-body text-[15px] leading-[1.65] text-body-text/80">
                We provide assisted stretching, sports massage, lymphatic
                drainage, pregnancy massage, trauma release massage, and cupping
                therapy. Every session focuses on relieving pain, improving
                mobility, restoring balance, and supporting overall well-being.
              </p>
              <ul className="clover-list mt-5 max-w-[52ch] text-[15px]">
                {wellnessPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <Image
              src="/images/2026/06/Complete-Wellness-homepage-new.jpg"
              alt="Treatment at the Flex &amp; Flow studio"
              width={1300}
              height={752}
              sizes="(max-width: 1023px) 92vw, 40vw"
              className="aspect-[5/4] w-full rounded-[10px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Therapists ────────────────────────────────────────────────── */}
      <section className="border-t border-secondary/12">
        <div className={`${WRAP} ${BAND}`}>
          <h2 className={H2}>Your therapists</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {therapists.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/therapist/${t.slug}`}
                  className={`group flex items-center gap-4 ${CARD} p-3 transition-colors duration-300 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                >
                  <Image
                    src={t.portrait}
                    alt=""
                    aria-hidden
                    width={300}
                    height={300}
                    sizes="88px"
                    className="h-[88px] w-[88px] shrink-0 rounded-[8px] object-cover object-top"
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-[1.5rem] leading-[1.1] font-bold transition-colors duration-300 group-hover:text-primary">
                      {t.name}
                    </span>
                    <span className="mt-0.5 block font-body text-[13px] text-body-text/70">
                      {t.role}
                    </span>
                    <span className="mt-1 line-clamp-1 block font-body text-[12px] text-body-text/60">
                      {t.specializedIn}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Gallery ───────────────────────────────────────────────────── */}
      <section className="border-t border-secondary/12">
        <div className={`${WRAP} ${BAND}`}>
          <h2 className={H2}>The studio</h2>
          <ul className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {gallery.map((photo) => (
              <li key={photo.src}>
                <Image
                  src={photo.src}
                  alt=""
                  aria-hidden
                  width={photo.w}
                  height={photo.h}
                  sizes="(max-width: 640px) 46vw, 30vw"
                  className="aspect-[4/3] w-full rounded-[10px] object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQs beside Visit, to keep the page short ─────────────────── */}
      <section className="border-t border-secondary/12">
        <div className={`${WRAP} ${BAND}`}>
          <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <h2 className={H2}>FAQs</h2>
              <Accordion items={homeFaqs} className="mt-4" />
            </div>

            <div className={`${CARD} h-fit p-5`}>
              <h2 className="font-display text-[1.75rem] leading-[1.1] font-bold">
                Visit us
              </h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className={LABEL}>Studio</dt>
                  <dd className="mt-1 font-body text-[15px] leading-[1.6]">
                    {contact.address}
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Hours</dt>
                  {workingHours.map((slot) => (
                    <dd key={slot.days} className="mt-1 font-body text-[15px]">
                      {slot.days} &middot; {slot.hours}
                    </dd>
                  ))}
                </div>
                <div>
                  <dt className={LABEL}>Bookings</dt>
                  <dd className="mt-1">
                    <a
                      href={contact.phoneHref}
                      className="font-body text-[15px] font-bold transition-colors duration-300 hover:text-primary"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BTN} mt-5 w-full justify-center`}
              >
                Book on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
