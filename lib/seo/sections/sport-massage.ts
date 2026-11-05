/** Sections appended to /uluwatu-bali/sport-massage/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Sports Massage in Bali: Prices and Session Length",
  },
  {
    type: "paragraph",
    text: "A sports massage at Flex & Flow costs from IDR {{price:sport-massage:60:standard}} for 60 minutes. You choose the length and the price level: **Therapist**, or **Master therapist** with our founder [Ginny](/therapist/ginny/), who specialises in sport massage and has a background in nursing and professional fitness training. Prices as of 4 November 2026.",
  },
  {
    type: "table",
    head: ["Session", "Therapist", "Master therapist (Ginny)"],
    rows: [
      [
        "Sport massage, 60 min",
        "IDR {{price:sport-massage:60:standard}}",
        "IDR {{price:sport-massage:60:master}}",
      ],
      [
        "Sport massage, 90 min",
        "IDR {{price:sport-massage:90:standard}}",
        "IDR {{price:sport-massage:90:master}}",
      ],
      ["Home service fee, per visit", "+ IDR {{fee}}", "+ IDR {{fee}}"],
      [
        "Sport massage at your villa, 60 min (incl. fee)",
        "IDR {{villa:sport-massage:60:standard}}",
        "IDR {{villa:sport-massage:60:master}}",
      ],
      [
        "Sport massage at your villa, 90 min (incl. fee)",
        "IDR {{villa:sport-massage:90:standard}}",
        "IDR {{villa:sport-massage:90:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "**60 minutes** suits one or two problem areas, such as shoulders and upper back after a week of paddling. **90 minutes** leaves time for legs, hips, back and shoulders without rushing, which suits a full-body session after a big surf week, a long hike or a heavy training block.",
  },
  {
    type: "heading",
    level: 2,
    text: "Where to Get a Sports Massage in Bali: Studio or Villa",
  },
  {
    type: "paragraph",
    text: "If you are looking for a sports massage in Bali, Flex & Flow is a bodywork and recovery studio in Ungasan, Uluwatu, on the island's southern Bukit Peninsula. The address is Jl. Toya Ning II, Ungasan, Kec. Kuta Sel., Kabupaten Badung, Bali 80361, and we are open Monday to Saturday, 09:00 to 17:00.",
  },
  {
    type: "list",
    items: [
      "**At the studio:** anyone can book, wherever in Bali you are staying.",
      "**At your villa or hotel:** a therapist comes to you in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan, at the studio price plus IDR {{fee}}. Read how [home service massage](/uluwatu-bali/outcall-home-service-massage/) works.",
      "**Staying further away**, for example in Canggu, Seminyak or Ubud: home visits do not reach you, so the studio is the way to book. Not sure if you are in range? [Message us on WhatsApp](https://wa.me/6285858887777).",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "When to Book a Sports Massage Around Surfing",
  },
  {
    type: "list",
    items: [
      "**After a surf:** rinse off, eat and drink water first. If you surf in the morning, an afternoon slot fits easily into studio hours.",
      "**On a rest day:** the best time for deeper work, because you do not need fresh shoulders for the water the same day.",
      "**Before a big swell or an event:** keep it shorter and lighter, and say so when you book.",
      "**After a wipeout or reef impact:** if you have sharp pain, swelling or a cut, see a doctor first. Our guide to [common surfing injuries](/injury-guide/common-surfing-injuries/) explains what to watch for.",
    ],
  },
  {
    type: "paragraph",
    text: "If stiffness rather than soreness is the problem, [assisted stretching](/uluwatu-bali/assisted-stretching/) or the 90-minute stretching and massage combo may suit you better.",
  },
  {
    type: "heading",
    level: 2,
    text: "Sports Massage in Bali: Frequently Asked Questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much is a sports massage in Bali at Flex & Flow?",
        answer: "At Flex & Flow in Ungasan, Uluwatu, a 60-minute sports massage costs IDR {{price:sport-massage:60:standard}} with a therapist or IDR {{price:sport-massage:60:master}} with master therapist Ginny. A 90-minute session costs IDR {{price:sport-massage:90:standard}} or IDR {{price:sport-massage:90:master}}. Home visits in the Uluwatu area cost the same plus a home service fee of IDR {{fee}} per visit. Prices as of 4 November 2026; see the full [price list](/price-list/).",
      },
      {
        question: "Where can I get a sports massage in Bali if I am not staying in Uluwatu?",
        answer: "You can come to the Flex & Flow studio on Jl. Toya Ning II, Ungasan, open Monday to Saturday from 09:00 to 17:00. Home visits only cover the Uluwatu area, such as Ungasan, Pecatu, Bingin, Padang Padang and Balangan, so if you are staying elsewhere in Bali the studio is the way to book. [Book online](https://booking.flexandflow.fit/) or message us on WhatsApp.",
      },
      {
        question: "Should I get a sports massage before or after surfing?",
        answer: "Usually after: later the same day once you have eaten and rehydrated, or on a rest day. Before a big session, keep the massage shorter and lighter so your muscles do not feel heavy in the water. At Flex & Flow in Uluwatu, tell your therapist when you next plan to surf and the pressure and focus can be adjusted to suit.",
      },
      {
        question: "Is sports massage the same as deep tissue massage?",
        answer: "Not quite. Deep tissue massage describes slow, firm pressure on deeper muscle layers. Sports massage is defined by its goal: recovery and easier movement for active people. It often uses deeper pressure, but adds stretching and mobility work and focuses on the areas your sport loads. A relaxation massage uses lighter, flowing strokes mainly to help you unwind. At Flex & Flow in Uluwatu, sport massage pressure is adjusted to how your body responds.",
      },
      {
        question: "Is sports massage painful?",
        answer: "It can feel firm, and very tight areas may feel intense for a moment, but it should not be painful. Tell your therapist if the pressure is too much; at Flex & Flow in Uluwatu the work is adjusted to how your body responds. Some people feel a little tender for a day or two after deeper work. Sharp pain during or after a session is a reason to stop and get checked.",
      },
      {
        question: "How often should I get a sports massage on a surf trip in Bali?",
        answer: "There is no fixed rule. On a one- or two-week surf trip, a practical approach is one session midway, when your shoulders and lower back start to feel the paddling, and another before you fly home. On a longer stay with daily surfing or training, a weekly session is a sensible rhythm. Your therapist at Flex & Flow in Uluwatu can also share simple recovery guidance for between sessions.",
      },
      {
        question: "When should I not book a sports massage?",
        answer: "See a doctor first if you have a new or acute injury, sharp or worsening pain, recent surgery, a blood clot or DVT, a heart or kidney condition, an active infection or fever, or are having cancer treatment. Avoid massage over open reef cuts until they heal. For an injury that needs a diagnosis, see a [physio first](/uluwatu-bali/physiotherapy/). If unsure, message Flex & Flow on WhatsApp before booking.",
      },
    ],
  },
];

export default blocks;
