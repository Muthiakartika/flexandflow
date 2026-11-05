/** Sections appended to /uluwatu-bali/assisted-stretching/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Assisted Stretching in Bali: Prices and Which Session to Book",
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
        "60 minutes · Therapist",
        "IDR {{price:assisted-stretching:60:standard}}",
        "IDR {{villa:assisted-stretching:60:standard}}",
      ],
      [
        "Combo with massage, 90 minutes · Therapist",
        "IDR {{price:combo-stretching-and-massage:90:standard}}",
        "IDR {{villa:combo-stretching-and-massage:90:standard}}",
      ],
      [
        "60 minutes · Ginny, master therapist",
        "IDR {{price:assisted-stretching:60:master}}",
        "IDR {{villa:assisted-stretching:60:master}}",
      ],
      [
        "Combo with massage, 90 minutes · Ginny",
        "IDR {{price:combo-stretching-and-massage:90:master}}",
        "IDR {{villa:combo-stretching-and-massage:90:master}}",
      ],
    ],
  },
  {
    type: "heading",
    level: 3,
    text: "Stretching, Massage or the Combo?",
  },
  {
    type: "list",
    items: [
      "**Assisted stretching, 60 min:** your main problem is range. Hips, hamstrings or shoulders feel short and stay tight even when you stretch.",
      "**[Sport massage](/uluwatu-bali/sport-massage/):** your muscles feel sore, knotted or overworked after surfing or training.",
      "**Stretching and massage combo, 90 min:** you have both, for example tight hips and a sore upper back after a week of paddling.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "What Happens in an Assisted Stretching Session",
  },
  {
    type: "paragraph",
    text: "For most of the session you relax while your therapist does the work. A typical session runs like this:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "You say where you feel tight and mention any injuries, recent surgery or health conditions.",
      "Your therapist moves one area at a time into a stretch and holds it, watching how your body responds.",
      "For some stretches you push gently against your therapist's hand for a few seconds, then relax as they take you a little further. This is PNF stretching.",
      "You give feedback throughout. A stretch should feel strong, never sharp.",
      "Your therapist can share a few simple stretches to keep up between sessions.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Who Assisted Stretching Suits",
  },
  {
    type: "list",
    items: [
      "**Surfers:** shoulders, upper back and hips that tighten from paddling, duck dives and pop-ups.",
      "**Laptop workers:** hip flexors, upper back and neck after long days sitting. Our guide to [making long sitting less painful](/injury-guide/how-to-make-sitting-too-long-less-painful/) has a daily routine.",
      "**Gym-goers and runners:** hamstrings, hips and calves that limit your squat or stride.",
      "**Anyone who feels stiff** after a long flight, a scooter commute or a busy week.",
    ],
  },
  {
    type: "paragraph",
    text: "If you want to build a stretching habit of your own, read [what flexibility training involves](/uluwatu-bali/flexibility-training/), or see how assisted stretching compares with [yoga in Uluwatu](/uluwatu-bali/yoga/).",
  },
  {
    type: "heading",
    level: 2,
    text: "Assisted Stretching in Bali: Frequently Asked Questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "Can I book assisted stretching at my villa in Uluwatu?",
        answer: "Yes. Flex & Flow brings assisted stretching to villas, hotels and homes in the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan, Monday to Saturday from 09:00 to 17:00. You pay the studio price, from IDR {{price:assisted-stretching:60:standard}} for 60 minutes, plus a [home service](/uluwatu-bali/outcall-home-service-massage/) fee of IDR {{fee}} per visit. Not sure if you are in range? Message us on [WhatsApp](https://wa.me/6285858887777).",
      },
      {
        question: "What should I wear for assisted stretching?",
        answer: "Wear loose, comfortable clothes you can move freely in, such as shorts or leggings and a T-shirt, and avoid jeans or anything tight around the hips. Assisted stretching is generally done fully clothed. Skip a heavy meal just before your session, and bring water, especially if you are coming to the Flex & Flow studio in Uluwatu straight from the beach.",
      },
      {
        question: "Should assisted stretching hurt?",
        answer: "No. A good assisted stretch feels strong and deep, but never sharp, pinching or numb. At Flex & Flow in Uluwatu your therapist controls each stretch, works within your current range and adjusts as you give feedback. Tell them straight away if anything feels wrong. Some people feel mild tightness the next day after deeper work; sharp or lasting pain is a reason to get checked.",
      },
      {
        question: "How many assisted stretching sessions do I need?",
        answer: "One session can leave you feeling looser, but lasting change in flexibility comes from repetition. A common approach is a few sessions close together to work on your tightest areas, then one every few weeks to maintain them, with simple stretches at home in between. At Flex & Flow in Uluwatu, a 60-minute session costs IDR {{price:assisted-stretching:60:standard}} with a therapist or IDR {{price:assisted-stretching:60:master}} with Ginny.",
      },
      {
        question: "Is assisted stretching good for surfers?",
        answer: "It can be. Paddling, duck dives and pop-ups tend to tighten the shoulders, upper back and hips, and those areas are hard to stretch well on your own. A rest day is a good time to book assisted stretching at Flex & Flow in Uluwatu, so you feel looser for your next surf. If sore muscles are the main complaint rather than tightness, a sport massage may suit you better.",
      },
      {
        question: "Who should not book assisted stretching?",
        answer: "Check with a doctor first if you have a new or acute injury, recent surgery, a blood clot or DVT, a heart condition, an active infection, or are having cancer treatment. Stop and get checked if a stretch causes numbness, tingling or sharp pain. Flex & Flow is a bodywork studio in Uluwatu, not a physiotherapy clinic, so tell your therapist about any health condition before your session.",
      },
    ],
  },
];

export default blocks;
