/**
 * What Google shows for every treatment and article: the title, the
 * description, and whether the page may be indexed at all.
 *
 * **For the pages listed here, this file is the source of truth, not the
 * panel.** `lib/cms/read.ts` lays these values over whatever the database
 * holds, so the panel’s "Search results" and "Search engine visibility"
 * fields are ignored for these pages, and the editor shows them read-only
 * with a pointer back here. A change goes branch → pull request → Vercel
 * preview → review → merge, like any other change to the site.
 *
 * Everything else about a page (its heading, body copy, pictures and rates)
 * still comes from the panel, which is what the owner edits.
 *
 * A published page **not** listed here falls back to the panel’s values, so a
 * new article the owner publishes is never left without a title.
 * `npm run check:seo` reports every such page, and checks lengths and
 * duplicates; with a URL it also checks what that deployment actually serves.
 *
 * Keys are the canonical path, with the trailing slash, exactly as the page’s
 * `<link rel="canonical">` prints it.
 *
 * Seeded on 4 Nov 2026 from what the live site served, so moving SEO into
 * code changed nothing a visitor or Google could see.
 */
import type { Seo } from "@/types";

export type PageSeo = {
  title: string;
  description: string;
  /** Out of Google, the sitemap, the JSON-LD and the sidebar lists. */
  noindex?: boolean;
  /** Only changes the robots meta tag. */
  nofollow?: boolean;
};

export const PAGE_SEO: Record<string, PageSeo> = {
  // ── Treatments ─────────────────────────────────────────────────────────
  "/uluwatu-bali/assisted-stretching/": {
    title: "Assisted Stretching in Uluwatu, Bali | Flex & Flow",
    description:
      "One-to-one assisted stretching in Uluwatu, Bali. A therapist guides deep stretches to free tight muscles and improve mobility. 60 min from IDR 500,000.",
  },
  "/uluwatu-bali/sport-massage/": {
    title: "Sports Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Sports massage in Uluwatu, Bali to ease sore muscles, improve mobility and recover faster after surfing or training. 60 min from IDR 500,000.",
  },
  /* Hidden from search at the owner’s request (27 Oct 2026). Still answers
     at its address; leave it hidden unless the owner says otherwise. */
  "/uluwatu-bali/facial-massage/": {
    title: "Facial Massage in Uluwatu Bali - Flex and Flow",
    description:
      "Experience rejuvenating facial massage in Uluwatu, Bali with Flex & Flow. Relax, refresh, and glow with our expert therapist.",
    noindex: true,
    nofollow: true,
  },
  "/uluwatu-bali/cupping-therapy/": {
    title: "Cupping Therapy in Uluwatu, Bali | Flex & Flow",
    description:
      "Cupping therapy in Uluwatu, Bali to release deep muscle tension and improve blood flow. 30 min for IDR 300,000, on its own or alongside a massage.",
  },
  "/uluwatu-bali/lymphatic-drainage/": {
    title: "Lymphatic Drainage Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Gentle lymphatic drainage massage in Uluwatu to ease swelling and help your body feel lighter. 60 min from IDR 500,000, at our studio or your villa.",
  },
  "/uluwatu-bali/trauma-healing/": {
    title: "Trauma Healing & Release in Uluwatu, Bali | Flex & Flow",
    description:
      "Deep therapeutic bodywork in Uluwatu, Bali for releasing chronic tension and stored physical stress, more focused than a massage. 90 min, IDR 1,800,000.",
  },
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": {
    title: "Men's Lymphatic Drainage Massage in Uluwatu | Flex & Flow",
    description:
      "Lymphatic detox massage for men in Uluwatu, Bali to reduce swelling, improve circulation and leave your body feeling lighter. 60 min from IDR 600,000.",
  },
  "/uluwatu-bali/pregnancy-massage-service/": {
    title: "Pregnancy Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Gentle pregnancy massage in Uluwatu, Bali to help mums-to-be relax, ease tension and feel more comfortable. 90 min from IDR 750,000.",
  },
  /* Hidden from search at the owner’s request (27 Oct 2026). Still answers
     at its address; leave it hidden unless the owner says otherwise. */
  "/uluwatu-bali/full-body-massage/": {
    title: "Full Body Massage in Uluwatu, Bali - Flex & Flow",
    description:
      "Experience ultimate relaxation with our full-body relaxing massage that relieves tension and leaves you feeling rejuvenated and stress-free.",
    noindex: true,
    nofollow: true,
  },

  // ── Articles ───────────────────────────────────────────────────────────
  "/uluwatu-bali/what-is-a-pregnancy-massage/": {
    title: "Is Pregnancy Massage Safe? Trimester Guide & Uluwatu Prices | Flex & Flow",
    description:
      "Pregnancy massage is generally safe with a trained therapist. What it helps, when to check with your doctor first, each trimester, and Uluwatu prices.",
  },
  "/injury-guide/common-surfing-injuries/": {
    title: "Common Surfing Injuries in Bali (Uluwatu) and How to Avoid Them | Flex & Flow",
    description:
      "Shoulder, lower back, neck, hip and reef injuries are the most common surfing problems in Bali. Why they happen around Uluwatu, prevention, and recovery.",
  },
  "/injury-guide/how-to-make-sitting-too-long-less-painful/": {
    title: "How to Make Sitting Less Painful: Setup, Breaks & Stretches | Flex & Flow",
    description:
      "Make long sitting less painful with a better desk setup, movement breaks every 30 to 45 minutes, gentle stretches and simple strength work. When to get checked.",
  },
  "/uluwatu-bali/outcall-home-service-massage/": {
    title: "Home & Outcall Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Home massage at your villa or hotel in Uluwatu, Bali: sports, lymphatic, pregnancy, cupping and stretching. Prices, areas covered and how to book.",
  },
  "/uluwatu-bali/physiotherapy/": {
    title: "Physio or Sport Massage in Uluwatu? How to Choose | Flex & Flow",
    description:
      "Physiotherapy treats injuries; sport massage treats tightness. How to tell which you need in Uluwatu, when to see a physio first, and Flex & Flow prices.",
  },
  "/uluwatu-bali/yoga/": {
    title: "Yoga or Assisted Stretching in Uluwatu? How to Choose | Flex & Flow",
    description:
      "Flex & Flow does not run yoga classes. How yoga and one-to-one assisted stretching compare, which suits you, and assisted stretching prices in Uluwatu.",
  },
  "/uluwatu-bali/physical-therapist/": {
    title: "How to Choose a Physical Therapist in Uluwatu, Bali | Flex & Flow",
    description:
      "What to check before booking a physical therapist in Uluwatu: STR registration, assessment, exercise plan, price and home visits. Plus when massage is enough.",
  },
  "/uluwatu-bali/flexibility-training/": {
    title: "What Is Flexibility Training? Benefits, Types & 5 Exercises | Flex & Flow",
    description:
      "Flexibility training improves how far your muscles and joints move. The benefits, five types of stretching compared, five beginner exercises, and how often to train.",
  },
  "/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/": {
    title: "Does Lymphatic Drainage Massage Work? What It Can and Can’t Do | Flex & Flow",
    description:
      "Lymphatic drainage massage works for lymphoedema swelling, not detox or weight loss. What the evidence says, who should avoid it, and Bali prices.",
  },
};

export function pageSeoFor(canonicalPath: string): PageSeo | undefined {
  return PAGE_SEO[canonicalPath];
}

/**
 * The page with this file’s SEO laid over the panel’s.
 *
 * The panel’s `noindex` and `nofollow` are dropped rather than merged: for a
 * page listed here, an index switch left on in the panel must not hide it.
 * `canonicalPath` and `ogImage` stay the panel’s, because they follow the
 * page’s address and picture, which the panel owns.
 */
export function withPageSeo<T extends { seo: Seo }>(entry: T): T {
  const code = PAGE_SEO[entry.seo.canonicalPath];
  if (!code) return entry;

  const { canonicalPath, ogImage } = entry.seo;
  return {
    ...entry,
    seo: {
      title: code.title,
      description: code.description,
      canonicalPath,
      ...(ogImage ? { ogImage } : {}),
      ...(code.noindex ? { noindex: true } : {}),
      ...(code.nofollow ? { nofollow: true } : {}),
    },
  };
}
