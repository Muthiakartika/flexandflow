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
import { homeServicePath } from "@/lib/site";
import type { Seo } from "@/types";

export type PageSeo = {
  title: string;
  description: string;
  /** Out of Google, the sitemap, the JSON-LD and the sidebar lists. */
  noindex?: boolean;
  /** Only changes the robots meta tag. */
  nofollow?: boolean;
  /**
   * The page's visible `<h1>`, when it should carry the search phrase the
   * panel's title leaves out. On a treatment only the hero reads it; the
   * menu, cards and breadcrumb keep the panel's shorter title. On a guide it
   * is the title everywhere (`withGuideTitle`).
   */
  h1?: string;
};

export const PAGE_SEO: Record<string, PageSeo> = {
  // ── Treatments ─────────────────────────────────────────────────────────
  "/uluwatu-bali/assisted-stretching/": {
    title: "Assisted Stretching in Uluwatu, Bali | Flex & Flow",
    description:
      "A therapist takes you into deep stretches you cannot reach alone, for tight hips, hamstrings and shoulders. Uluwatu studio or villa, 60 min from IDR 500,000.",
    h1: "Assisted Stretching in Uluwatu, Bali",
  },
  "/uluwatu-bali/sport-massage/": {
    title: "Sports Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Firm, focused work on the muscles surfing and training load, with stretching so you move freely again. Sports massage in Uluwatu, 60 min from IDR 500,000.",
    h1: "Sports Massage in Uluwatu, Bali",
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
      "Glass cups lift and loosen deep muscle tension. Cupping therapy in Uluwatu, 30 min for IDR 300,000, on its own or with a massage, at the studio or your villa.",
    h1: "Cupping Therapy in Uluwatu, Bali",
  },
  "/uluwatu-bali/lymphatic-drainage/": {
    title: "Lymphatic Drainage Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Light, rhythmic lymphatic drainage for heavy legs, puffiness after flights and bodies needing a gentle reset. Uluwatu studio or villa, 60 min from IDR 500,000.",
    h1: "Lymphatic Drainage Massage in Uluwatu, Bali",
  },
  "/uluwatu-bali/trauma-healing/": {
    title: "Trauma Healing & Release in Uluwatu, Bali | Flex & Flow",
    description:
      "Slow, deep bodywork for chronic tension and stored physical stress, more focused than a massage. Trauma healing with Ginny in Uluwatu, 90 min, IDR 1,800,000.",
    h1: "Trauma Healing in Uluwatu, Bali",
  },
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": {
    title: "Men's Lymphatic Drainage Massage in Uluwatu | Flex & Flow",
    description:
      "Full-body lymphatic drainage for men, with face, scalp and neck work, to ease swelling and leave you lighter. Uluwatu studio or villa, 60 min from IDR 600,000.",
    h1: "Lymphatic Detox Massage for Men in Uluwatu",
  },
  "/uluwatu-bali/pregnancy-massage-service/": {
    title: "Pregnancy Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Gentle side-lying massage for the back, hips and swollen feet, with pillows for support. Pregnancy massage in Uluwatu, 90 min from IDR 750,000, studio or villa.",
    h1: "Pregnancy Massage in Uluwatu, Bali",
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
  /* The guides' titles carry no "| Flex & Flow": Google prints the site's
     name above every result, and the 14 characters went to the search
     phrase instead, which Google would otherwise cut at about 60. The
     treatments keep it; their phrases are short. */
  "/uluwatu-bali/what-is-a-pregnancy-massage/": {
    title: "Is Pregnancy Massage Safe? Trimester Guide & Uluwatu Prices",
    description:
      "Pregnancy massage is generally safe with a trained therapist. What it helps, when to check with your doctor first, each trimester, and Uluwatu prices.",
    /* The panel's "Thinking About a Pregnancy Massage? Here's The Answer"
       named no question; the title's is the one people search. */
    h1: "Is Pregnancy Massage Safe? A Guide, Trimester by Trimester",
  },
  "/injury-guide/common-surfing-injuries/": {
    title: "Common Surfing Injuries in Bali & How to Avoid Them",
    description:
      "Shoulder, lower back, neck, hip and reef injuries are the most common surfing problems in Bali. Why they happen around Uluwatu, prevention, and recovery.",
  },
  "/injury-guide/how-to-make-sitting-too-long-less-painful/": {
    title: "How to Make Sitting Less Painful: Setup, Breaks & Stretches",
    description:
      "Make long sitting less painful with a better desk setup, movement breaks every 30 to 45 minutes, gentle stretches and simple strength work. When to get checked.",
    /* The panel's "How to Make Sitting Too Long Less Painful" (the address). */
    h1: "How to Make Sitting Less Painful",
  },
  "/uluwatu-bali/outcall-home-service-massage/": {
    title: "Home & Outcall Massage in Uluwatu, Bali | Flex & Flow",
    description:
      "Home massage at your villa or hotel in Uluwatu, Bali: sports, lymphatic, pregnancy, cupping and stretching. Prices, areas covered and how to book.",
    h1: "Home & Villa Massage in Uluwatu, Bali",
  },
  "/uluwatu-bali/physiotherapy/": {
    title: "Physio or Sport Massage in Uluwatu? How to Choose",
    description:
      "Physiotherapy treats injuries; sport massage treats tightness. How to tell which you need in Uluwatu, when to see a physio first, and what each costs.",
  },
  "/uluwatu-bali/yoga/": {
    title: "Yoga or Assisted Stretching in Uluwatu? How to Choose",
    description:
      "Flex & Flow does not run yoga classes. How yoga and one-to-one assisted stretching compare, which suits you, and assisted stretching prices in Uluwatu.",
  },
  "/uluwatu-bali/physical-therapist/": {
    title: "How to Choose a Physical Therapist in Uluwatu, Bali",
    description:
      "What to check before booking a physical therapist in Uluwatu: STR registration, assessment, exercise plan, price and home visits. Plus when massage is enough.",
  },
  "/uluwatu-bali/flexibility-training/": {
    title: "What Is Flexibility Training? Benefits, Types & 5 Exercises",
    description:
      "Flexibility training improves how far your muscles and joints move. The benefits, five types of stretching, five beginner exercises and how often to train.",
  },
  "/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/": {
    title: "Does Lymphatic Drainage Work? What It Can and Can’t Do",
    description:
      "Lymphatic drainage massage works for lymphoedema swelling, not detox or weight loss. What the evidence says, who should avoid it, and Bali prices.",
    /* The panel's "Lymphatic Drainage Massage: What It Can Do" left out the
       half the article is about. */
    h1: "Does Lymphatic Drainage Massage Work? What It Can and Can’t Do",
  },
};

export function pageSeoFor(canonicalPath: string): PageSeo | undefined {
  return PAGE_SEO[canonicalPath];
}

/**
 * A guide under the `h1` this file gives it, everywhere it is named: its
 * heading, the blog's cards, the breadcrumb, the previous / next links and
 * the `BlogPosting` headline. A guide's panel title is its headline rather
 * than a short label, so a weak one is replaced outright instead of being
 * kept for the menus as a treatment's is. The home service page, a post in
 * the panel but a treatment to the visitor (`HomeServiceArticle`), keeps
 * its own.
 */
export function withGuideTitle<T extends { title: string; seo: Seo }>(post: T): T {
  const h1 = PAGE_SEO[post.seo.canonicalPath]?.h1;
  return h1 && post.seo.canonicalPath !== homeServicePath ? { ...post, title: h1 } : post;
}

/**
 * The page with this file’s SEO laid over the panel’s.
 *
 * The panel’s `noindex` and `nofollow` are dropped rather than merged: for a
 * page listed here, an index switch left on in the panel must not hide it.
 * `canonicalPath` and `ogImage` stay the entry’s, because they follow the
 * page’s address and picture: the panel’s, or for a picture in
 * `lib/seo/photos.ts`, that one.
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
