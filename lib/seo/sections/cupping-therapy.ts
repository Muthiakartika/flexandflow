/** Sections appended to /uluwatu-bali/cupping-therapy/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Cupping therapy in Bali: price, length and where to book",
  },
  {
    type: "paragraph",
    text: "Cupping therapy in Bali at Flex & Flow is a **30-minute dry cupping session for IDR {{price:cupping-therapy:30:standard}}**, the same price with Ginny, our founder and master therapist, or with Yuni. You can book it on its own or alongside a massage, at the studio on Jl. Toya Ning II, Ungasan, or at your villa or hotel in the Uluwatu area.",
  },
  /* One way to book per row, so the scannable layout sets it as a price
     menu (`RichText`): studio price, villa price under it. Added to a
     massage it is the cupping price on top of the massage; the home
     service fee is per visit, so it is not charged twice. */
  {
    type: "table",
    head: ["Session", "At the studio", "At your villa"],
    rows: [
      [
        "Cupping on its own, 30 minutes",
        "IDR {{price:cupping-therapy:30:standard}}",
        "IDR {{villa:cupping-therapy:30:standard}}",
      ],
      [
        "Added to a sports massage, 30 minutes",
        "+ IDR {{price:cupping-therapy:30:standard}}",
        "+ IDR {{price:cupping-therapy:30:standard}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Sessions run Monday to Saturday, 09:00 to 17:00. The studio is closed on Sunday. If you searched for cupping near me and you are staying in Ungasan, Pecatu, Bingin, Padang Padang or Balangan, our [home service](/uluwatu-bali/outcall-home-service-massage/) brings cupping to you. Book at [booking.flexandflow.fit](https://booking.flexandflow.fit/) or on [WhatsApp](https://wa.me/6285858887777), and see the [price list](/price-list/) for every rate.",
  },
  {
    type: "heading",
    level: 2,
    text: "Cupping with a sport massage after surfing or training",
  },
  {
    type: "paragraph",
    text: "If you surf or train in Uluwatu, cupping can complement a [sport massage](/uluwatu-bali/sport-massage/). The massage works through the larger muscle groups, and cupping adds focused suction on one or two areas that stay tight, such as the upper back after a week of long paddles.",
  },
  {
    type: "paragraph",
    text: "If stiffness and restricted movement bother you more than sore muscles, [assisted stretching](/uluwatu-bali/assisted-stretching/) may be a better partner. Our guide to [common surfing injuries](/injury-guide/common-surfing-injuries/) explains where surfers in Bali tend to hold tension, and when to see a doctor rather than book bodywork.",
  },
  {
    type: "heading",
    level: 2,
    text: "Who should skip cupping or check with a doctor first",
  },
  {
    type: "paragraph",
    text: "Cupping is not suitable for everyone. Skip it, or talk to your doctor before booking, if any of these apply to you:",
  },
  {
    type: "list",
    items: [
      "Sunburn, fresh reef cuts, a rash, or broken or irritated skin where you want the cups",
      "You take blood-thinning medication or have a bleeding disorder",
      "A history of blood clots or deep vein thrombosis (DVT)",
      "Recent surgery, an acute injury, a fever or an active infection",
      "Pregnancy, a heart or kidney condition, or current cancer treatment",
    ],
  },
  {
    type: "paragraph",
    text: "Tell your practitioner about any health conditions and medication before the session starts. If cupping is not right for you, they can help you choose a treatment that is.",
  },
  {
    type: "heading",
    level: 2,
    text: "Cupping therapy in Uluwatu: frequently asked questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much does cupping therapy cost in Uluwatu?",
        answer: "At Flex & Flow in Ungasan, Uluwatu, cupping therapy costs **IDR {{price:cupping-therapy:30:standard}} for a 30-minute session**. The price is the same with Ginny, the master therapist, or with Yuni. You can book cupping on its own or alongside a sport massage, Monday to Saturday from 09:00 to 17:00, online at booking.flexandflow.fit or on WhatsApp.",
      },
      {
        question: "Does Flex & Flow offer hijama or wet cupping in Bali?",
        answer: "No. Flex & Flow offers **dry cupping only**, which uses suction from the cups and does not involve cutting the skin or drawing blood. Hijama, or wet cupping, uses small cuts to the skin and is not part of our service in Uluwatu. If you want hijama in Bali, look for a qualified practitioner who specialises in it and follows strict hygiene standards.",
      },
      {
        question: "How long do cupping marks last?",
        answer: "Dry cupping often leaves round marks where the cups sat, from light pink to dark purple. They come from suction drawing blood towards the surface of the skin, may feel a little tender, and usually fade within about a week or two. If you have a wedding, photo shoot or beach day coming up, mention it when you book cupping at Flex & Flow so your practitioner can plan which areas to treat.",
      },
      {
        question: "Does cupping hurt?",
        answer: "Most people describe dry cupping as a strong pulling or tightening feeling rather than pain. Areas that have been tight for a long time can feel more intense. At Flex & Flow in Uluwatu, your practitioner explains what to expect before starting and the suction can be adjusted, so say if it feels too strong. The treated area may feel tender for a short time afterwards.",
      },
      {
        question: "Can I have cupping at my villa in Uluwatu?",
        answer: "Yes. Cupping is one of the treatments Flex & Flow offers as a home service. A therapist comes to your villa, hotel or home in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan, Monday to Saturday from 09:00 to 17:00. You pay the studio price of IDR {{price:cupping-therapy:30:standard}} for 30 minutes plus the IDR {{fee}} home service fee per visit.",
      },
      {
        question: "Is there scientific evidence that cupping works?",
        answer: "Research on cupping is limited and of mixed quality, so it should not be seen as a medical treatment. Many people use it because tight areas feel looser and less restricted afterwards. At Flex & Flow in Uluwatu, cupping is used as part of recovery bodywork for muscle tension, not to treat illness. Cleveland Clinic has a plain-language overview of its uses and risks.",
      },
    ],
  },
];

export default blocks;
