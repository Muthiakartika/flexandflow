/**
 * Single source of truth for site-wide constants.
 *
 * Nothing is on WordPress any more. Booking moved into this app in Phase 3;
 * the price list followed, at `/price-list/`, backed by
 * `lib/data/priceList.ts`.
 *
 * **Booking is split two ways.** The wizard itself still runs inside this app
 * at `bookingUrl` — reschedule links and anything mid-flow use that, through
 * `next/link` like any other internal route. But every marketing "Book now" /
 * "Book Appointment" / "Book with <therapist>" CTA points visitors at
 * `externalBookingUrl` instead: a separate booking.flexandflow.fit
 * deployment, absolute like `wordpressUrls` and opened the same way — new
 * tab, no client-side router. See `BOOKING-PLAN.md`.
 */

import { ACADEMY_ENABLED } from "./flags";

export const siteConfig = {
  name: "Flex and Flow",
  shortName: "Flex & Flow",
  url: "https://flexandflow.fit",
  locale: "en_US",
  description:
    "Join wellness journeys with Flex and Flow. Our services focus on improving flexibility, reducing discomfort, and enhancement of well-being.",
  logo: "/images/2025/06/FlexnFlow_new_logo.png",
  copyright: "All Right Reserved © 2026 Flex&Flow",
} as const;

/**
 * The booking flow — staff, service, date and time, details, summary.
 *
 * Internal, and every CTA on the site points here. The trailing slash is not
 * decoration: `trailingSlash: true` in `next.config.ts` matches the shape
 * WordPress published and Google indexed, and a link without one answers a 308
 * before it resolves.
 *
 * `/appointment/` — the WordPress URL this replaced, and the one that is in
 * Google's index — is redirected here permanently by `next.config.ts`.
 */
export const bookingUrl = "/booking/";

/**
 * The booking flow with a therapist already chosen.
 *
 * Sessions are priced by who performs them, so "Book with Ginny" is a decision
 * the visitor has already made by the time they click it. Asking it again as
 * step one is a step that can only be got wrong. The wizard reads `staff`,
 * selects that therapist and opens on the treatment.
 *
 * The slug, not the database id: this link is rendered from
 * `lib/data/therapists.ts`, which has never heard of the booking tables, and a
 * URL somebody might read aloud should say `ginny` rather than a cuid.
 */
/**
 * Where every marketing "Book now" / "Book Appointment" / "Book with
 * <therapist>" CTA points — a separate booking.flexandflow.fit deployment,
 * not a page in this app. Treat it like `wordpressUrls`: absolute, external,
 * new tab. It's a WordPress booking plugin and reads no query string, so
 * every CTA uses this same bare URL — there is no per-therapist variant, and
 * "Book with Ginny" doesn't preselect anything on arrival. `bookingUrl` above
 * still matters: the wizard's own reschedule links stay on it.
 */
export const externalBookingUrl = "https://booking.flexandflow.fit/";

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
  address: "Jl. Toya Ning II, Ungasan, Kec. Kuta Sel., Denpasar, Bali",
  email: "Flexandflow06@gmail.com",
  phone: "+6285858887777",
  phoneHref: "tel:+6285858887777",
  whatsapp: "https://wa.me/6285858887777",
  instagram:
    "https://www.instagram.com/flex_and_flow.id?igsh=MTZlYW50bHl3Y2c5dA==",
} as const;

export const workingHours = [
  { days: "Monday to Friday", hours: "08:00 - 17:00 hrs" },
] as const;

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
      { label: "Assisted Stretching", href: "/uluwatu-bali/assisted-stretching" },
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
    label: "Sport Massage",
    href: "/uluwatu-bali/sport-massage",
    image: "/images/2026/08/sport-massage.jpg",
  },
  {
    label: "Facial Massage",
    href: "/uluwatu-bali/facial-massage",
    image: "/images/2025/03/Facial-Massage.jpg",
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
    image: "/images/2026/08/trauma-healing.jpg",
  },
] as const;

/** Footer intro blurb, shared by every page. */
export const footerIntro =
  "Flex & Flow offers personalised treatments designed to support recovery, " +
  "relaxation, and overall wellbeing. From sports massage and lymphatic " +
  "drainage to trauma healing and assisted stretching, each session is " +
  "tailored to help you move better, feel lighter, and restore balance in " +
  "both body and mind.";

/** The two "Accepted Payments" marks shown in the footer. */
export const paymentIcons = [
  { src: "/images/2023/09/Footer.png", alt: "Mastercard" },
  { src: "/images/2023/09/Footer-visa-1.svg", alt: "Visa" },
] as const;

/** Shared art. */
export const assets = {
  pageHeroBackground: "/images/2024/11/Page-1-Yoga-Class.jpg",
  heroVideo: "/video/home-hero.mp4",
} as const;
