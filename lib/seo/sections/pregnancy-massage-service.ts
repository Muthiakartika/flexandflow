/** Sections appended to /uluwatu-bali/pregnancy-massage-service/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Pregnancy massage in Uluwatu: price and session length",
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
        "90 minutes · Therapist",
        "IDR {{price:pregnancy-massage-service:90:standard}}",
        "IDR {{villa:pregnancy-massage-service:90:standard}}",
      ],
      [
        "90 minutes · Ginny, master therapist",
        "IDR {{price:pregnancy-massage-service:90:master}}",
        "IDR {{villa:pregnancy-massage-service:90:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Villa prices include the IDR {{fee}} home service fee per visit. The studio, on Jl. Toya Ning II, Ungasan, is open Monday to Saturday from 09:00 to 17:00 and closed on Sunday. Every treatment is on our [price list](/price-list/).",
  },
  {
    type: "heading",
    level: 2,
    text: "Which trimester, and when to check with your midwife first",
  },
  {
    type: "paragraph",
    text: "Many people book their first pregnancy massage in the second trimester, and the session is adjusted as your pregnancy progresses. Our guide, [Is pregnancy massage safe?](/uluwatu-bali/what-is-a-pregnancy-massage/), sets out what changes in each trimester.",
  },
  {
    type: "paragraph",
    text: "Whatever your stage, tell your therapist how far along you are and about any complications. Check with your midwife or doctor before booking if you have:",
  },
  {
    type: "list",
    items: [
      "A pregnancy complication, or a pregnancy you have been told is high risk",
      "Advice from your midwife or doctor to avoid massage",
      "A blood clot or DVT, now or in the past",
      "A heart or kidney condition",
      "An infection or a fever",
      "Recent surgery or a new injury",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Swollen feet and ankles: pregnancy massage or lymphatic drainage?",
  },
  {
    type: "paragraph",
    text: "Swollen feet and ankles are common in later pregnancy, and Bali's heat can make them feel worse. If swelling is your main concern, book a pregnancy massage rather than a standard [lymphatic drainage](/uluwatu-bali/lymphatic-drainage/) session. It is adapted for pregnancy, with supportive positioning and light pressure, and can include the legs and feet. If you would still like lymphatic work, ask your midwife first.",
  },
  {
    type: "image",
    src: "/images/2026/11/pregnancy-massage-legs.jpg",
    alt: "A Flex & Flow therapist working on a client's calf with both hands, her leg resting on a rolled towel",
    width: 1376,
    height: 768,
  },
  {
    type: "paragraph",
    text: "Some swelling needs a doctor, not a massage. Contact your midwife or doctor straight away if swelling comes on suddenly, particularly in your face or hands, or arrives with a bad headache or problems with your vision. These can be signs of [pre-eclampsia](https://www.nhs.uk/conditions/pre-eclampsia/). The same goes for one calf that is painful, red, warm or swollen.",
  },
  {
    type: "heading",
    level: 2,
    text: "Pregnancy massage in Uluwatu: common questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much does a pregnancy massage cost at Flex & Flow in Uluwatu?",
        answer: "At Flex & Flow in Ungasan, Uluwatu, a 90-minute pregnancy massage costs IDR {{price:pregnancy-massage-service:90:standard}} with a therapist or IDR {{price:pregnancy-massage-service:90:master}} with Ginny, the founder and master therapist. If you would like the therapist to come to your villa or hotel in the Uluwatu area, add the IDR {{fee}} home service fee, which makes it IDR {{villa:pregnancy-massage-service:90:standard}} or IDR {{villa:pregnancy-massage-service:90:master}}.",
      },
      {
        question: "Where can I find a pregnancy massage near me in Uluwatu?",
        answer: "Flex & Flow offers pregnancy massage at its studio on Jl. Toya Ning II, Ungasan, and through [home service](/uluwatu-bali/outcall-home-service-massage/) to villas, hotels and homes in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan. A home visit saves you a trip on the road while pregnant and costs IDR {{fee}} extra. Not sure if you are in range? Ask on WhatsApp.",
      },
      {
        question: "Can pregnancy massage help with back and hip pain?",
        answer: "Many people find gentle pregnancy massage eases the lower back and hip tension that builds as pregnancy progresses. At Flex & Flow in Uluwatu, sessions commonly focus on the lower back, hips, shoulders and legs, using light pressure and supportive positioning. Back pain that is severe or sudden, or comes with bleeding, cramping or a fever, needs your midwife or doctor rather than a massage.",
      },
      {
        question: "Will I lie on my back or front during a pregnancy massage?",
        answer: "Mostly on your side. Pregnancy massage is usually given lying on your side with pillows for support, and a trained therapist does not keep you flat on your back for long in later pregnancy. At Flex & Flow in Uluwatu, positioning is adjusted to your stage of pregnancy and what feels comfortable. Tell your therapist straight away if a position stops feeling right.",
      },
      {
        question: "How do I book a pregnancy massage in Uluwatu?",
        answer: "Book online at [booking.flexandflow.fit](https://booking.flexandflow.fit/) or message Flex & Flow on [WhatsApp](https://wa.me/6285858887777) (+62 858 5888 7777). Choose the studio on Jl. Toya Ning II, Ungasan, or a home visit to your villa in the Uluwatu area. Sessions run Monday to Saturday from 09:00 to 17:00, and the studio is closed on Sunday. Mention how far along you are when you book.",
      },
      {
        question: "Can I ask to change or stop a pregnancy massage partway through?",
        answer: "Yes, at any point. Pregnancy massage at Flex & Flow in Uluwatu is meant to be easy to talk through. You can ask for lighter pressure, a different position, a short break for the toilet or a drink of water, or to stop altogether. Tell your therapist straight away if you feel dizzy, sick, short of breath or simply uncomfortable.",
      },
    ],
  },
];

export default blocks;
