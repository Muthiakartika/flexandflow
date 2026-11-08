/** Sections appended to /uluwatu-bali/outcall-home-service-massage/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "How a home massage in Uluwatu works, step by step",
  },
  {
    type: "paragraph",
    text: "Two messages to book, then it runs like a studio session in your own space.",
  },
  /* A timeline on the scannable layout: short titles, one line each. */
  {
    type: "list",
    ordered: true,
    items: [
      "**Pick your treatment.** Anything in the list above, at the length you want.",
      "**Message us.** [Book online](https://booking.flexandflow.fit/) or [WhatsApp us](https://wa.me/6285858887777) with the day, the time and where you are staying.",
      "**We confirm.** We check you are in our area and lock in the time. Staying outside Ungasan to Balangan? Ask first.",
      "**Your therapist arrives.** Everything comes with them. Before you start, you agree on focus, pressure and anything to avoid.",
    ],
  },
  {
    type: "paragraph",
    text: "In Bahasa Indonesia this is *pijat panggilan*: *pijat panggilan ke villa, hotel dan rumah di area Uluwatu, Senin sampai Sabtu, 09.00 sampai 17.00.* [WhatsApp us](https://wa.me/6285858887777) to book.",
  },
  {
    type: "heading",
    level: 2,
    text: "When to book a mobile massage: after surfing, around flights and in pregnancy",
  },
  {
    type: "paragraph",
    text: "Mobile massage visits in Uluwatu run Monday to Saturday between 09:00 and 17:00, so there are no evening or Sunday appointments. Within those hours, three moments are worth planning around:",
  },
  {
    type: "list",
    items: [
      "**After a morning surf.** A [sport massage](/uluwatu-bali/sport-massage/) or [assisted stretching](/uluwatu-bali/assisted-stretching/) at your villa in the late morning or afternoon means no extra scooter ride after a long paddle.",
      "**Before or after a long flight.** [Lymphatic drainage](/uluwatu-bali/lymphatic-drainage/) may help legs feel less heavy and puffy after hours of sitting. If one leg is swollen, painful, warm or red after a flight, see a doctor before any massage, as it can be a sign of a blood clot ([NHS: DVT](https://www.nhs.uk/conditions/deep-vein-thrombosis-dvt/)).",
      "**Later in pregnancy.** A [pregnancy massage](/uluwatu-bali/pregnancy-massage-service/) at your villa saves a trip when moving around is less comfortable. Check with your midwife or doctor first, and tell your therapist how far along you are and about any complications.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "What a home visit costs: worked examples",
  },
  {
    type: "paragraph",
    text: "A home service massage in Uluwatu costs the studio price plus a home service fee of IDR {{fee}} per visit. A few examples:",
  },
  /* The treatment pages' price menu: studio price, then the villa price
     under it. Ginny's session last, as the step up. */
  {
    type: "table",
    head: ["Session", "At the studio", "At your villa"],
    rows: [
      [
        "Cupping · 30 minutes",
        "IDR {{price:cupping-therapy:30:standard}}",
        "IDR {{villa:cupping-therapy:30:standard}}",
      ],
      [
        "Sports massage · 60 minutes · Therapist",
        "IDR {{price:sport-massage:60:standard}}",
        "IDR {{villa:sport-massage:60:standard}}",
      ],
      [
        "Pregnancy massage · 90 minutes · Therapist",
        "IDR {{price:pregnancy-massage-service:90:standard}}",
        "IDR {{villa:pregnancy-massage-service:90:standard}}",
      ],
      [
        "Sports massage · 60 minutes · Ginny",
        "IDR {{price:sport-massage:60:master}}",
        "IDR {{villa:sport-massage:60:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Every other home service treatment follows the same rule. The [price list](/price-list/) has every rate.",
  },
  {
    type: "heading",
    level: 2,
    text: "More questions about home service massage",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much does a home massage in Uluwatu cost in total?",
        answer: "At Flex & Flow, a home massage in Uluwatu costs the same as the studio treatment plus a home service fee of IDR {{fee}} per visit. For example, a 60-minute lymphatic drainage at your villa comes to IDR {{villa:lymphatic-drainage:60:standard}} with a therapist or IDR {{villa:lymphatic-drainage:60:master}} with Ginny, the master therapist. A 60-minute assisted stretching session comes to IDR {{villa:assisted-stretching:60:standard}} or IDR {{villa:assisted-stretching:60:master}}.",
      },
      {
        question: "Can I book a home massage on a Sunday or in the evening?",
        answer: "No. Flex & Flow's home service in Uluwatu runs Monday to Saturday from 09:00 to 17:00, the same hours as the studio in Ungasan, so there are no Sunday or evening visits. If you surf early, a late-morning or afternoon appointment at your villa fits well. Book online at booking.flexandflow.fit or on WhatsApp at +62 858 5888 7777.",
      },
      {
        question: "Do you offer outcall massage outside Uluwatu, for example in Canggu or Seminyak?",
        answer: "No. Flex & Flow's outcall massage is only available in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan. Places further away, such as Canggu or Seminyak, are outside the service area. If you are staying near the edge of Uluwatu and are not sure whether you are in range, send a WhatsApp message before booking.",
      },
      {
        question: "Can I get a pregnancy massage at my villa in Uluwatu?",
        answer: "Yes. Pregnancy massage is part of Flex & Flow's home service in the Uluwatu area. It is a 90-minute session costing IDR {{price:pregnancy-massage-service:90:standard}} with a therapist or IDR {{price:pregnancy-massage-service:90:master}} with Ginny, plus the IDR {{fee}} home service fee. Check with your midwife or doctor first, and tell your therapist how far along you are and about any complications.",
      },
      {
        question: "Can I ask for Ginny to come to my villa?",
        answer: "Yes, subject to availability. Flex & Flow home visits in Uluwatu use the same two price levels as the studio: the master therapist rate for Ginny, the founder, whose background covers nursing, professional fitness training and bodywork, and the lower therapist rate for Yuni, the Javanese massage and lymphatic specialist. Say who you would like when you book online or on WhatsApp.",
      },
    ],
  },
];

export default blocks;
