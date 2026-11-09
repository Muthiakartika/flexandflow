/**
 * Single source of truth for site-wide constants.
 *
 * Nothing is on WordPress any more. Booking moved into this app in Phase 3;
 * the price list followed, at `/price-list/`, backed by
 * `lib/data/priceList.ts`.
 *
 * **Booking.** The wizard runs inside this app at `bookingUrl`, and since
 * 2026-11-09 (`BOOKING_ENABLED` in `lib/flags.ts`) every marketing "Book …"
 * CTA goes to it, deep-linked to the treatment or therapist where the button
 * knows which (`bookingHref`). With the intake form switched on, CTAs pass
 * through `/intake` first and land on the same wizard URL afterwards. The
 * external booking.flexandflow.fit plugin is the fallback when the switch is
 * off. See `BOOKING-PLAN.md`.
 */

import { ACADEMY_ENABLED, BOOKING_ENABLED, INTAKE_ENABLED } from "./flags";

export const siteConfig = {
  name: "Flex and Flow",
  shortName: "Flex & Flow",
  url: "https://flexandflow.fit",
  locale: "en_US",
  description:
    "One-to-one bodywork studio in Ungasan, Uluwatu, Bali: sports massage, assisted stretching, lymphatic drainage and recovery work, at the studio or your villa.",
  logo: "/images/2025/06/FlexnFlow_new_logo.png",
  copyright: "© 2026 Flex & Flow. All rights reserved.",
} as const;

/**
 * The booking flow — staff, service, date and time, details, summary.
 *
 * Internal. Marketing CTAs reach it through `bookingHref` below, reschedule
 * links directly. The trailing slash is not decoration:
 * `trailingSlash: true` in `next.config.ts` matches the shape WordPress
 * published and Google indexed, and a link without one answers a 308 before
 * it resolves.
 *
 * `/appointment/` on purpose, not `/booking/`: it's the exact slug WordPress
 * published and the one Google has indexed, so the wizard uses it directly
 * instead of making a visitor land somewhere else first.
 */
export const bookingUrl = "/appointment/";

/**
 * The external booking site — a WordPress booking plugin on
 * booking.flexandflow.fit, not a page in this app. Absolute, external, and it
 * reads no query string, so nothing can be preselected on arrival. Only used
 * while `BOOKING_ENABLED` is off; see `bookingDestination`.
 */
export const externalBookingUrl = "https://booking.flexandflow.fit/";

/**
 * Where a visitor books: this app's wizard while `BOOKING_ENABLED`, the
 * external WordPress plugin otherwise. Also where `/intake` sends people once
 * the form is done, and where `next.config.ts` points the held-back routes.
 */
export const bookingDestination = BOOKING_ENABLED
  ? bookingUrl
  : externalBookingUrl;

/**
 * The href for a "Book …" button, deep-linked when the button knows what it is
 * for: `{ service: "sport-massage" }` opens the wizard filtered to that
 * treatment, `{ staff: "ginny" }` opens it with the therapist already chosen.
 *
 * Slugs are the booking catalogue's (`Service.slug`, `Therapist.slug`), which
 * match the treatment pages' and the therapist profiles'. A slug the catalogue
 * does not know — a treatment that is not bookable online, like the home
 * service — is ignored by the wizard, which then opens as an ordinary visit.
 *
 * With the intake form on, the wizard URL rides along as `?next=` so the form
 * lands the visitor on the same treatment afterwards. The external plugin
 * reads no query string, so with `BOOKING_ENABLED` off every button gets the
 * same bare URL.
 */
export function bookingHref(
  target: { service?: string; staff?: string } = {},
): string {
  if (!BOOKING_ENABLED) return INTAKE_ENABLED ? "/intake/" : externalBookingUrl;

  const query = new URLSearchParams();
  if (target.staff) query.set("staff", target.staff);
  if (target.service) query.set("service", target.service);
  const search = query.toString();
  const wizard = search ? `${bookingUrl}?${search}` : bookingUrl;

  if (!INTAKE_ENABLED) return wizard;
  return search ? `/intake/?next=${encodeURIComponent(wizard)}` : "/intake/";
}

/**
 * Where a generic "Book now" button points — the header, the mobile drawer,
 * the price list. Spread `bookingCtaProps` onto any plain `<Link>`/`<a>` that
 * uses `bookingHref` — `ButtonLink` opens absolute URLs in a new tab on its own.
 */
export const bookingCtaHref = bookingHref();

/** New tab only when the button leaves this app for the external plugin. */
export const bookingCtaProps =
  BOOKING_ENABLED || INTAKE_ENABLED
    ? {}
    : ({ target: "_blank", rel: "noopener noreferrer" } as const);

/**
 * Where `/intake` sends a visitor once the form is submitted: the `?next=` a
 * deep-linked CTA attached, if it is a wizard URL on this site, otherwise the
 * booking destination. Anything else is ignored — an open redirect off a form
 * that collects health details is not something to leave lying around.
 */
export function intakeNextHref(next: string | null): string {
  if (
    BOOKING_ENABLED &&
    next &&
    next.startsWith(bookingUrl) &&
    !next.startsWith("//")
  ) {
    return next;
  }
  return bookingDestination;
}

/**
 * The training academy used to be a separate deployment on its own domain; it
 * now ships inside this app, mounted at `/academy` under its own root layout.
 * So these are ordinary internal routes — unlike the WordPress pages above,
 * they belong in `next/link` and must not be marked `external`, which would
 * open the academy in a new tab. Course paths mirror the academy's own menu:
 * `/academy/courses/<slug>/<online|onsite>`.
 */
export const academyUrl = "/academy";

const academyCourse = (slug: string, mode: "online" | "onsite") =>
  `${academyUrl}/courses/${slug}/${mode}`;

const academyPage = (label: string, path: string): NavItem => ({
  label,
  href: `${academyUrl}/${path}`,
});

export const contact = {
  address: "Jl. Toya Ning II, Ungasan, Kec. Kuta Sel., Kabupaten Badung, Bali 80361",
  /** The header's one-line form: street and the place people search for. */
  shortAddress: "Jl. Toya Ning II, Ungasan, Uluwatu",
  email: "Flexandflow06@gmail.com",
  phone: "+6285858887777",
  phoneHref: "tel:+6285858887777",
  whatsapp: "https://wa.me/6285858887777",
  instagram:
    "https://www.instagram.com/flex_and_flow.id?igsh=MTZlYW50bHl3Y2c5dA==",
} as const;

export const workingHours = [
  { days: "Monday to Saturday", hours: "09:00 - 17:00 hrs" },
] as const;

/** `workingHours` in the header's compact form. Change it, `workingHours` and
 *  `openingSchedule` together. */
export const shortHours = "Mon–Sat, 09:00–17:00";

/**
 * `workingHours` as data, for the footer's live "Open now" line
 * (`OpenStatus`). Days are 0 = Sunday to 6 = Saturday. Bali keeps WITA,
 * UTC+8, all year, which the IANA zone `Asia/Makassar` names.
 */
export const openingSchedule = {
  timeZone: "Asia/Makassar",
  days: [1, 2, 3, 4, 5, 6],
  opens: "09:00",
  closes: "17:00",
} as const;

/** Directions to the studio, the same search the booking emails link to. */
/** Where a therapist visits, as the contact and home service pages list it. */
export const homeServiceAreas = ["Ungasan", "Pecatu", "Bingin", "Padang Padang", "Balangan"];

export const studioMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  contact.address,
)}`;

/**
 * Added once per visit for a treatment at the client's villa, hotel or home.
 * Not a booking price row, so it lives here; `lib/seo/prices.ts` adds it to
 * every `{{villa:…}}` figure. The home service page's own copy states it too.
 */
export const homeServiceFeeIdr = 100_000;

/** The home service page: an article in the panel, a service on the site. */
export const homeServicePath = "/uluwatu-bali/outcall-home-service-massage/";

/**
 * Treatments a therapist will bring to a villa, hotel or home, as the home
 * service page lists them. Trauma healing is studio only, and the two hidden
 * treatments are not offered at all.
 */
export const homeServiceSlugs: ReadonlySet<string> = new Set([
  "sport-massage",
  "lymphatic-drainage",
  "lymphatic-detox-massage-for-men",
  "pregnancy-massage-service",
  "assisted-stretching",
  "cupping-therapy",
]);

export type NavItem = {
  label: string;
  href: string;
  /** Absolute links leave the Next.js app (external sites, socials). */
  external?: boolean;
  children?: NavItem[];
  /** Wide multi-column panel, used where a plain list would not group well. */
  mega?: NavMega;
};

/** One labelled column of a mega menu. */
export type NavMegaGroup = {
  title: string;
  /** Small qualifier under the column title, e.g. "2 days · max 6 students". */
  note?: string;
  items: NavItem[];
};

export type NavMega = {
  groups: NavMegaGroup[];
  /** Optional link along the foot of the panel. */
  footer?: NavItem;
};

/**
 * Primary navigation, in the same order as the WordPress menu.
 *
 * Written out in full, then filtered — see `primaryNav` below. The Academy
 * entry stays here while the academy is unpublished so that turning it back on
 * restores the mega menu exactly as it was, rather than needing it rewritten.
 */
const allNavItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about-us" },
  { label: "Price List", href: "/price-list" },
  {
    label: "Services",
    href: "/services",
    children: [
      {
        label: "Assisted Stretching",
        href: "/uluwatu-bali/assisted-stretching",
      },
      { label: "Cupping Therapy", href: "/uluwatu-bali/cupping-therapy" },
      { label: "Sports Massage", href: "/uluwatu-bali/sport-massage" },
      {
        label: "Home Massage",
        href: "/uluwatu-bali/outcall-home-service-massage",
      },
      { label: "Trauma Healing", href: "/uluwatu-bali/trauma-healing" },
      { label: "Lymphatic Drainage", href: "/uluwatu-bali/lymphatic-drainage" },
      {
        label: "Lymphatic Drainage for Men",
        href: "/uluwatu-bali/lymphatic-detox-massage-for-men",
      },
      {
        label: "Pregnancy Massage",
        href: "/uluwatu-bali/pregnancy-massage-service",
      },
    ],
  },
  {
    label: "Academy",
    href: academyUrl,
    /* Mirrors the academy's own Courses menu: the same three courses in each
       delivery mode, so the two sites agree on what is on offer. */
    mega: {
      groups: [
        {
          title: "Online courses",
          note: "Self-paced · start today",
          items: [
            {
              label: "Lymphatic Drainage",
              href: academyCourse("lymphatic-drainage", "online"),
            },
            {
              label: "Assisted Stretching",
              href: academyCourse("assisted-stretching", "online"),
            },
            {
              label: "Sports Massage",
              href: academyCourse("sports-massage", "online"),
            },
          ],
        },
        {
          title: "Onsite courses",
          note: "2 days · max 6 students",
          items: [
            {
              label: "Lymphatic Drainage",
              href: academyCourse("lymphatic-drainage", "onsite"),
            },
            {
              label: "Assisted Stretching",
              href: academyCourse("assisted-stretching", "onsite"),
            },
            {
              label: "Sports Massage",
              href: academyCourse("sports-massage", "onsite"),
            },
          ],
        },
        {
          /* The academy's own remaining nav, so the whole site is reachable
             from this panel and not only its courses. */
          title: "Plan your course",
          note: "Dates, resources & help",
          items: [
            academyPage("Schedule", "schedule"),
            academyPage("Materials", "materials"),
            academyPage("FAQ", "faq"),
            academyPage("Contact", "contact"),
          ],
        },
      ],
      footer: {
        label: "Compare everything →",
        href: `${academyUrl}/courses`,
      },
    },
  },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact-us" },
];

/**
 * What the header actually renders — every nav consumer reads this, so hiding
 * the academy here hides it from the desktop nav and the mobile drawer at
 * once. See `ACADEMY_ENABLED` in `lib/flags.ts` for the rest of the switch.
 */
export const primaryNav: NavItem[] = allNavItems.filter(
  (item) => ACADEMY_ENABLED || item.href !== academyUrl,
);

/**
 * The off-canvas slide menu's "Our Services" list — thumbnail links, in the
 * original order. Note the theme labels lymphatic drainage "Limphatic".
 */
export const slideMenuServices = [
  {
    label: "Assisted Stretching",
    href: "/uluwatu-bali/assisted-stretching",
    image: "/images/2026/08/assisted-stretching.jpg",
  },
  {
    label: "Sports Massage",
    href: "/uluwatu-bali/sport-massage",
    image: "/images/2026/08/sport-massage.jpg",
  },
  {
    label: "Cupping Service",
    href: "/uluwatu-bali/cupping-therapy",
    image: "/images/2025/02/Cupping-Therapy-new-warm.jpg",
  },
  {
    label: "Limphatic Drainage",
    href: "/uluwatu-bali/lymphatic-drainage",
    image: "/images/2026/08/lymphatic-drainage.jpg",
  },
  {
    label: "Home Service",
    href: "/uluwatu-bali/outcall-home-service-massage",
    image: "/images/2025/05/Home-service.jpg",
  },
  {
    label: "Trauma Healing",
    href: "/uluwatu-bali/trauma-healing",
    image: "/images/2026/08/trauma-healing-new.jpg",
  },
] as const;

/** Footer intro blurb, shared by every page. */
export const footerIntro =
  "Flex & Flow offers personalised treatments designed to support recovery, " +
  "relaxation, and overall wellbeing. From sports massage and lymphatic " +
  "drainage to trauma healing and assisted stretching, each session is " +
  "tailored to help you move better, feel lighter, and restore balance in " +
  "both body and mind.";

/**
 * The footer's one-line intro, as the owner supplied it — kept to a single
 * sentence so the Identity column reads as a complete thought at a height
 * closer to Visit and Newsletter instead of needing a `line-clamp` ellipsis
 * that reads as cut off mid-thought.
 */
export const footerIntroShort =
  "Flex & Flow offers personalised bodywork focused on recovery, movement, " +
  "and relieving physical tension.";

/**
 * The line in the olive closing band above the footer (`BookClose`).
 *
 * Separate from `siteConfig.description` on purpose: that string is also the
 * home page's meta description, and the owner's rewrite was for the band on
 * the page, not for the search result.
 */
export const bookCloseLine =
  "Flex & Flow focuses on bodywork, movement, and recovery, helping improve " +
  "flexibility, ease discomfort, and support better mobility.";

/** The two "Accepted Payments" marks shown in the footer. */
export const paymentIcons = [
  { src: "/images/2023/09/Footer.png", alt: "Mastercard" },
  { src: "/images/2023/09/Footer-visa-1.svg", alt: "Visa" },
] as const;

/** Shared art. */
export const assets = {
  pageHeroBackground: "/images/2024/11/Page-1-Yoga-Class.jpg",
  /* The home hero's studio footage, cut to the shape it is shown in: a 4:3
     strip below 1024px, a square above. The source (`home-hero.mp4`) is a
     1080x1920 portrait clip, 2.4 MB, most of whose frame was cropped away
     on screen; these are 0.46 MB and 0.94 MB (re-encoded 8 Nov 2026). */
  heroVideoNarrow: "/video/home-hero-4x3.mp4",
  heroVideoWide: "/video/home-hero-square.mp4",
} as const;
