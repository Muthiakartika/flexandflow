/**
 * The copy of /uluwatu-bali/outcall-home-service-massage/, in place of the
 * panel's. See ./index.ts and the voice notes in ./sport-massage.ts. Facts
 * from the panel copy (areas, hours, what the therapist brings, how to
 * prepare) and `homeServiceSlugs` (what can be booked at home). Every price
 * is a token, so the villa figures follow the rate card.
 *
 * The page's own sections (`lib/seo/sections`) follow: how a visit works
 * step by step, when to book, worked costs and the FAQ.
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "A therapist comes to your villa, hotel or home across Uluwatu: the same treatments and prices as the studio, plus one visit fee.",
  body: [
    {
      type: "paragraph",
      text: "Home service means the studio comes to you. A therapist brings everything the session needs to your villa, hotel or home in the Uluwatu area, so after a long surf, a flight or a day on your feet, the only thing left to do is lie down.",
    },
    {
      type: "paragraph",
      text: "You get the same treatments, the same team and the same prices as at our studio in Ungasan, plus IDR {{fee}} per visit. Visits run Monday to Saturday, 09:00 to 17:00.",
    },
    { type: "heading", level: 2, text: "What You Can Book at Home" },
    {
      type: "paragraph",
      text: "Every price below is at your villa, with the visit fee already in it. Trauma healing stays at the studio.",
    },
    {
      type: "list",
      items: [
        "**Sports massage:** 60 or 90 minutes, from IDR {{villa:sport-massage:60:standard}}. [See the treatment](/uluwatu-bali/sport-massage/).",
        "**Lymphatic drainage:** 60 or 90 minutes, from IDR {{villa:lymphatic-drainage:60:standard}}. [See the treatment](/uluwatu-bali/lymphatic-drainage/).",
        "**Men's lymphatic detox:** 60 or 90 minutes, from IDR {{villa:lymphatic-detox-massage-for-men:60:standard}}. [See the treatment](/uluwatu-bali/lymphatic-detox-massage-for-men/).",
        "**Pregnancy massage:** 90 minutes, from IDR {{villa:pregnancy-massage-service:90:standard}}. [See the treatment](/uluwatu-bali/pregnancy-massage-service/).",
        "**Assisted stretching:** 60 minutes from IDR {{villa:assisted-stretching:60:standard}}, or the 90-minute combo with massage. [See the treatment](/uluwatu-bali/assisted-stretching/).",
        "**Cupping:** 30 minutes, IDR {{villa:cupping-therapy:30:standard}} on its own, or IDR {{price:cupping-therapy:30:standard}} more added to a massage. [See the treatment](/uluwatu-bali/cupping-therapy/).",
      ],
    },
    { type: "heading", level: 2, text: "How We Do Home Visits" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "Villas, hotels and homes across the Uluwatu area: Ungasan, Pecatu, Bingin, Padang Padang and Balangan.",
        "Not sure you are in range? Message us before you book.",
        "Everything the session needs, set up in your space.",
        "The same therapists, the same approach and the same pressure as at the studio.",
        "Book online, or on WhatsApp with the treatment and where you are staying.",
        "We confirm the time and come to you.",
      ],
    },
    { type: "heading", level: 2, text: "Before We Arrive" },
    {
      type: "list",
      items: [
        "**The room:** quiet and private, with space to work around you and good airflow.",
        "**You:** comfortable clothes, a warm shower if you like, and no heavy meal just before.",
        "**Access:** make sure your therapist can get into the villa or hotel easily.",
        "**Tell us:** areas of tension, recent activity and anything to avoid, before the session starts.",
      ],
    },
  ],
};

export default copy;
