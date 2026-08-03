/**
 * Single source of truth for site-wide constants.
 *
 * Price List and Booking are intentionally NOT cloned into this Next.js app —
 * they stay on WordPress, so every link to them must be an absolute URL to
 * `wordpressUrls`. Never route those through `next/link`.
 */

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
 * Pages that remain on WordPress. Verified against the live site:
 * `/price-list/` and `/appointment/` return 200, while the `/pricelist/` and
 * `/booking/` paths named in the brief both 404.
 */
export const wordpressUrls = {
  priceList: "https://flexandflow.fit/price-list/",
  booking: "https://flexandflow.fit/appointment/",
} as const;

/**
 * The training academy is a separate app on its own domain. Same rule as the
 * WordPress pages: absolute URLs only, never `next/link` routes. Course paths
 * mirror the academy's own menu — `/courses/<slug>/<online|onsite>`.
 */
export const academyUrl = "https://flexnflow-academy.vercel.app";

const academyCourse = (slug: string, mode: "online" | "onsite") =>
  `${academyUrl}/courses/${slug}/${mode}`;

const academyPage = (label: string, path: string): NavItem => ({
  label,
  href: `${academyUrl}/${path}`,
  external: true,
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
  /** Absolute links leave the Next.js app (WordPress pages, socials). */
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

/** Primary navigation, in the same order as the WordPress menu. */
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about-us" },
  { label: "Price List", href: wordpressUrls.priceList, external: true },
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
    external: true,
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
              external: true,
            },
            {
              label: "Assisted Stretching",
              href: academyCourse("assisted-stretching", "online"),
              external: true,
            },
            {
              label: "Sports Massage",
              href: academyCourse("sports-massage", "online"),
              external: true,
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
              external: true,
            },
            {
              label: "Assisted Stretching",
              href: academyCourse("assisted-stretching", "onsite"),
              external: true,
            },
            {
              label: "Sports Massage",
              href: academyCourse("sports-massage", "onsite"),
              external: true,
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
        external: true,
      },
    },
  },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact-us" },
];

/**
 * The off-canvas slide menu's "Our Services" list — thumbnail links, in the
 * original order. Note the theme labels lymphatic drainage "Limphatic".
 */
export const slideMenuServices = [
  {
    label: "Assisted Stretching",
    href: "/uluwatu-bali/assisted-stretching",
    image: "/images/2025/02/assistant-stretch-new-.jpg",
  },
  {
    label: "Sport Massage",
    href: "/uluwatu-bali/sport-massage",
    image: "/images/2025/02/sport-massage-new-warm.jpg",
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
    image: "/images/2024/11/Lymphatic-Drainage.jpg",
  },
  {
    label: "Home Service",
    href: "/uluwatu-bali/outcall-home-service-massage",
    image: "/images/2025/05/Home-service.jpg",
  },
  {
    label: "Trauma Healing",
    href: "/uluwatu-bali/trauma-healing",
    image: "/images/2025/06/lomi-lomi-massage.jpg",
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
  heroVideo: "/video/home-banner.mp4",
} as const;
