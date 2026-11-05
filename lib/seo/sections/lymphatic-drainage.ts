/** Sections appended to /uluwatu-bali/lymphatic-drainage/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Lymphatic drainage massage in Uluwatu, Bali: prices and session length",
  },
  /* The therapist-or-Ginny choice that opens this section on the redesign
     is `TierChooser`, placed under this heading by `ServiceArticle` from the
     rate card. */
  /* One session per row, team first and Ginny after, so the scannable layout
     sets it as a price menu (`RichText`): studio price, villa price under it. */
  {
    type: "table",
    head: ["Session", "At the studio", "At your villa"],
    rows: [
      [
        "60 minutes · Yuni",
        "IDR {{price:lymphatic-drainage:60:standard}}",
        "IDR {{villa:lymphatic-drainage:60:standard}}",
      ],
      [
        "90 minutes · Yuni",
        "IDR {{price:lymphatic-drainage:90:standard}}",
        "IDR {{villa:lymphatic-drainage:90:standard}}",
      ],
      [
        "60 minutes · Ginny, master therapist",
        "IDR {{price:lymphatic-drainage:60:master}}",
        "IDR {{villa:lymphatic-drainage:60:master}}",
      ],
      [
        "90 minutes · Ginny, master therapist",
        "IDR {{price:lymphatic-drainage:90:master}}",
        "IDR {{villa:lymphatic-drainage:90:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Choose **60 minutes** if one area bothers you, such as legs that feel heavy after a long flight or a day on your feet. Choose **90 minutes** if you would like a broader part of the body covered at an unhurried pace. Prices are the same at our studio on Jl. Toya Ning II, Ungasan, and at your villa or hotel in the Uluwatu area, where an IDR {{fee}} home service fee is added per visit.",
  },
  {
    type: "heading",
    level: 2,
    text: "Lymphatic drainage or sport massage: which should you book?",
  },
  {
    type: "paragraph",
    text: "The two treatments do very different jobs, so start with how your body feels rather than with the menu.",
  },
  {
    type: "list",
    items: [
      "**Lymphatic drainage**: light, slow strokes close to the skin. A good fit for puffiness, heavy legs, or when you simply want calm, gentle bodywork.",
      "**[Sport massage](/uluwatu-bali/sport-massage/)**: firmer work into the muscles. A better fit for stiffness and soreness after surfing or training.",
      "**[Lymphatic detox massage for men](/uluwatu-bali/lymphatic-detox-massage-for-men/)**: full-body lymphatic work plus face, scalp, head and neck, from IDR {{price:lymphatic-detox-massage-for-men:60:standard}} for 60 minutes.",
      "**[Pregnancy massage](/uluwatu-bali/pregnancy-massage-service/)**: if you are pregnant, this 90-minute session is the one adapted for pregnancy. Check with your midwife or doctor first.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Who lymphatic drainage suits, and when to wait",
  },
  {
    type: "paragraph",
    text: "Lymphatic drainage suits most healthy adults who want gentle bodywork. It is a wellness treatment, not medical care. If you have been diagnosed with lymphoedema, your treatment should be led by a doctor or specialist service (see the [NHS guide to lymphoedema](https://www.nhs.uk/conditions/lymphoedema/)), so ask them before booking any massage.",
  },
  {
    type: "paragraph",
    text: "Speak to your doctor before booking if you have:",
  },
  {
    type: "list",
    items: [
      "A blood clot or deep vein thrombosis (DVT)",
      "A heart or kidney condition",
      "An active infection or a fever",
      "Current cancer treatment",
      "A pregnancy complication",
      "Recent surgery, including cosmetic surgery",
      "An acute injury, such as a new sprain",
    ],
  },
  {
    type: "paragraph",
    text: "For an honest look at the evidence, read [what lymphatic drainage massage can and cannot do](/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/).",
  },
  {
    type: "heading",
    level: 2,
    text: "Lymphatic drainage in Uluwatu: common questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much is a lymphatic drainage massage in Uluwatu?",
        answer: "At Flex & Flow in Ungasan, Uluwatu, lymphatic drainage costs IDR {{price:lymphatic-drainage:60:standard}} for 60 minutes or IDR {{price:lymphatic-drainage:90:standard}} for 90 minutes with our therapist, Yuni. With Ginny, the founder and master therapist, it is IDR {{price:lymphatic-drainage:60:master}} for 60 minutes or IDR {{price:lymphatic-drainage:90:master}} for 90 minutes. For a session at your villa or hotel in the Uluwatu area, add an IDR {{fee}} home service fee per visit.",
      },
      {
        question: "Where can I get a lymphatic massage near me in Bali?",
        answer: "Flex & Flow offers lymphatic drainage massage at its studio on Jl. Toya Ning II, Ungasan, in Uluwatu, Monday to Saturday from 09:00 to 17:00 (closed Sunday). If you are staying in the Uluwatu area, a therapist can come to you instead. You can [book online](https://booking.flexandflow.fit/) or message us on [WhatsApp](https://wa.me/6285858887777) on +62 858 5888 7777.",
      },
      {
        question: "Can I have lymphatic drainage at my villa in Uluwatu?",
        answer: "Yes. Through Flex & Flow's [home service](/uluwatu-bali/outcall-home-service-massage/), a therapist comes to your villa, hotel or home in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan, Monday to Saturday from 09:00 to 17:00. You pay the normal treatment price plus IDR {{fee}} per visit. If you are not sure whether you are in range, message us on WhatsApp.",
      },
      {
        question: "Can lymphatic drainage focus on just my legs?",
        answer: "Yes. A lymphatic drainage session at Flex & Flow in Uluwatu can focus on one area where fluid tends to collect or that feels heavy, such as the legs, or cover a broader part of the body. A 60-minute session suits one focused area. Choose 90 minutes if you would like more of the body covered at a slower pace. Tell your therapist what you want at the start.",
      },
      {
        question: "Is one lymphatic drainage session enough?",
        answer: "For a healthy person there is no research-based number of sessions. A sensible approach is to book one session at Flex & Flow in Uluwatu, see how it feels, and come back occasionally if you enjoy it. Any lighter feeling in puffy areas tends to be temporary. If you have lymphoedema, your doctor or lymphoedema specialist should decide how many treatments you need.",
      },
      {
        question: "Do I need a doctor's referral for lymphatic drainage massage?",
        answer: "Not if you are healthy and booking for comfort. Flex & Flow in Uluwatu offers wellness lymphatic drainage, not medical treatment. Speak to your doctor first if you have lymphoedema, a blood clot, a heart or kidney condition, an infection, current cancer treatment, recent surgery or a pregnancy complication. Your therapist will also ask about your health before the session starts.",
      },
      {
        question: "Is drainage lymphatique the same as lymphatic drainage massage?",
        answer: "Yes. *Drainage lymphatique* is the French name for lymphatic drainage massage. If you are looking for drainage lymphatique in Uluwatu, Flex & Flow in Ungasan offers 60 and 90-minute sessions from IDR {{price:lymphatic-drainage:60:standard}}, at the studio or at your villa in the Uluwatu area. The pressure is light and slow, quite different from a firm or deep tissue massage.",
      },
    ],
  },
];

export default blocks;
