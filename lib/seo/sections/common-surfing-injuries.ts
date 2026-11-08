/** Sections appended to /injury-guide/common-surfing-injuries/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Sport massage, stretching or physio? Matching the problem to the right help",
  },
  {
    type: "paragraph",
    text: "Surf aches around Uluwatu usually need one of a few kinds of help. Flex & Flow offers sport massage, assisted stretching and cupping; it does not diagnose injuries and is not a physiotherapy clinic.",
  },
  {
    type: "table",
    head: ["What you notice", "Where to start"],
    rows: [
      [
        "Tired, tight shoulders and upper back after several days of long paddles",
        "[Sport massage](/uluwatu-bali/sport-massage/), 60 or 90 min",
      ],
      [
        "Stiff hips, hip flexors or lower back, and pop-ups that feel slow",
        "[Assisted stretching](/uluwatu-bali/assisted-stretching/), or the 90-min stretching and massage combo",
      ],
      [
        "One stubborn, tight area on top of general soreness",
        "Sport massage plus 30 min of [cupping](/uluwatu-bali/cupping-therapy/)",
      ],
      [
        "Pain that keeps coming back in the same place, or has not settled after one to two weeks",
        "A physiotherapist for an assessment and rehab plan (see [physio or sport massage?](/uluwatu-bali/physiotherapy/))",
      ],
      [
        "Sharp pain, swelling, numbness, weakness, or a hard hit from the reef or your board",
        "A doctor or clinic first; bodywork only once you have been checked",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Not sure which applies? Describe what you feel on [WhatsApp](https://wa.me/6285858887777) before booking, and the team can tell you whether massage or stretching is a sensible place to start.",
  },
  {
    type: "heading",
    level: 2,
    text: "A recovery routine between surf sessions in Uluwatu",
  },
  {
    type: "paragraph",
    text: "A simple recovery routine between surf sessions in Uluwatu can help stop small aches building into days out of the water. This is the rhythm we suggest, whether you are here for a surf trip or live locally:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "**Straight after the surf:** rinse off with fresh water, check your feet and legs for reef cuts, drink water and eat something.",
      "**The same evening:** spend 10 minutes on easy mobility for the upper back, shoulders and hips, the areas that paddling and pop-ups load most.",
      "**After two or three surf days in a row:** book a 60-minute sport massage or assisted stretching session, at the studio in Ungasan or at your villa.",
      "**On flat or windy days:** keep moving gently with a walk or light stretching, and give tired shoulders a break from paddling.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Recovery prices for surfers in Uluwatu",
  },
  {
    type: "paragraph",
    text: "Recovery sessions for surfers at Flex & Flow are priced by length and therapist level: the therapist rate, or the master therapist rate with Ginny, the founder.",
  },
  {
    type: "table",
    head: ["Session", "Length", "Therapist (IDR)", "Master therapist (IDR)"],
    rows: [
      ["Sport massage", "60 min", "{{price:sport-massage:60:standard}}", "{{price:sport-massage:60:master}}"],
      ["Sport massage", "90 min", "{{price:sport-massage:90:standard}}", "{{price:sport-massage:90:master}}"],
      ["Assisted stretching", "60 min", "{{price:assisted-stretching:60:standard}}", "{{price:assisted-stretching:60:master}}"],
      ["Stretching and massage combo", "90 min", "{{price:combo-stretching-and-massage:90:standard}}", "{{price:combo-stretching-and-massage:90:master}}"],
      ["Cupping", "30 min", "{{price:cupping-therapy:30:standard}}", "{{price:cupping-therapy:30:master}}"],
    ],
  },
  {
    type: "paragraph",
    text: "At your villa or hotel in the Uluwatu area, add IDR {{fee}} per visit for [home service](/uluwatu-bali/outcall-home-service-massage/). Book at [booking.flexandflow.fit](https://booking.flexandflow.fit/).",
  },
  {
    type: "heading",
    level: 2,
    text: "More questions about surfing injuries",
  },
  {
    type: "faq",
    items: [
      {
        question: "Should I keep surfing with a sore shoulder?",
        answer: "General muscle soreness that eases as you warm up is common after a run of surf days in Bali. Stop and get it checked if the pain is sharp, gets worse while you paddle, or comes with weakness or a shoulder that feels unstable. For ordinary tightness, a sport massage or assisted stretching session at Flex & Flow in Uluwatu can help your shoulders feel looser between sessions.",
      },
      {
        question: "When is the best time to get a massage on a surf trip?",
        answer: "A good time is a flat or rest day, or the afternoon after a morning surf, so your body has time to settle before the next session. On a longer trip, a session after every two or three surf days can help stop tightness building. Flex & Flow in Uluwatu runs sessions Monday to Saturday from 09:00 to 17:00, at the Ungasan studio or at your villa.",
      },
      {
        question: "Can a massage therapist come to my villa in Bingin or Padang Padang after a surf?",
        answer: "Yes. Flex & Flow's home service covers villas, hotels and homes in the Uluwatu area, including Bingin, Padang Padang, Balangan, Pecatu and Ungasan, Monday to Saturday from 09:00 to 17:00. Sport massage, assisted stretching, the stretching and massage combo and cupping are all available at home, at studio prices plus IDR {{fee}} per visit.",
      },
      {
        question: "Does Flex & Flow treat surfing injuries?",
        answer: "Flex & Flow does not diagnose or treat injuries and is not a physiotherapy clinic. Its sport massage, assisted stretching and cupping sessions in Uluwatu are for muscle tightness, stiffness and overuse from surfing. If you have sharp pain, swelling, numbness, or pain that has not settled after one to two weeks, see a doctor or a [physical therapist](/uluwatu-bali/physical-therapist/) first, then add bodywork once you have been cleared.",
      },
    ],
  },
];

export default blocks;
