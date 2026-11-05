/** Sections appended to /injury-guide/how-to-make-sitting-too-long-less-painful/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Working from cafés and villas in Uluwatu: a setup that travels",
  },
  {
    type: "paragraph",
    text: "If you work remotely in Bali, your desk can change every day, and so does the strain. A café table, a villa sofa and the scooter ride between them all add up to long sitting. A small kit and a few habits help:",
  },
  {
    type: "list",
    items: [
      "**Raise the laptop.** A folding stand with a small keyboard and mouse lets you lift the screen towards eye level wherever you work.",
      "**Pick the right seat.** Choose a chair with a back, at a table around elbow height. Low sofas and bean bags are fine for a break, not a work block.",
      "**Bring back support.** A rolled towel or sarong behind your lower back works on most chairs.",
      "**Walk before you ride.** After a long work block, take a few minutes on foot before getting on a scooter, so you are not going straight from one seat to another.",
      "**Keep a water bottle on the table.** It is easy to get dehydrated in the heat, and each refill is a reason to stand up.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Massage or assisted stretching for desk stiffness: which to book?",
  },
  {
    type: "paragraph",
    text: "Massage and assisted stretching may both help with stiffness from long sitting, but they suit different problems. Use this as a rough guide at Flex & Flow in Uluwatu:",
  },
  {
    type: "table",
    head: ["What you feel", "Session to try", "Therapist / Ginny"],
    rows: [
      [
        "Tight, achy neck, shoulders and upper back from laptop work",
        "[Sport massage](/uluwatu-bali/sport-massage/), 60 min",
        "IDR {{price:sport-massage:60:standard}} / IDR {{price:sport-massage:60:master}}",
      ],
      [
        "Stiff hips and hamstrings, hard to stand up straight after sitting",
        "[Assisted stretching](/uluwatu-bali/assisted-stretching/), 60 min",
        "IDR {{price:assisted-stretching:60:standard}} / IDR {{price:assisted-stretching:60:master}}",
      ],
      [
        "Both, or stiffness that keeps coming back",
        "Stretching and massage combo, 90 min",
        "IDR {{price:combo-stretching-and-massage:90:standard}} / IDR {{price:combo-stretching-and-massage:90:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Prices at our studio on Jl. Toya Ning II, Ungasan, open Monday to Saturday, 09:00 to 17:00. A therapist can also come to your villa through our [home service](/uluwatu-bali/outcall-home-service-massage/) for an extra IDR {{fee}}. Bodywork is most useful alongside the breaks and strength work above, not as a replacement. If pain spreads down a leg or comes with numbness, see a doctor, or read [when to choose a physio](/uluwatu-bali/physiotherapy/).",
  },
  {
    type: "heading",
    level: 2,
    text: "More questions about sitting and back pain",
  },
  {
    type: "faq",
    items: [
      {
        question: "How do I stop my back hurting on a long flight?",
        answer: "Choose an aisle seat if you can, put a small pillow or rolled jumper behind your lower back, and stand up and walk when it is safe to. In your seat, do ankle circles and calf raises regularly, and drink water. If a calf becomes painful, hot or swollen after a flight, see a doctor straight away, as this can be a sign of a blood clot ([NHS guide to DVT](https://www.nhs.uk/conditions/deep-vein-thrombosis-dvt/)).",
      },
      {
        question: "Can massage help neck and shoulder pain from working on a laptop?",
        answer: "Many people find that a sport massage eases tight neck and shoulder muscles after long laptop days. It is most useful alongside a raised screen and regular breaks. See a doctor or physio if the pain spreads into your arm or comes with numbness, tingling or weakness. At Flex & Flow in Uluwatu, a 60-minute sport massage costs IDR {{price:sport-massage:60:standard}}, or IDR {{price:sport-massage:60:master}} with our master therapist, Ginny.",
      },
      {
        question: "Is a standing desk better than sitting all day?",
        answer: "Not on its own. Standing for hours can become uncomfortable too. What tends to help is changing position often: sit, stand, walk and repeat through the day. If you work from cafés or a villa in Bali, a kitchen counter or high table can be your standing spot for calls and email, so you switch position without needing special furniture.",
      },
      {
        question: "How long does it take for stiffness from sitting to improve?",
        answer: "It varies, but many people notice a change after a few weeks of regular movement breaks, a better setup and short strength sessions two to four times a week. A single stretch or massage can feel good on the day; the lasting change usually comes from repeating the basics. If nothing has improved after a few weeks, get checked by a doctor or physiotherapist.",
      },
      {
        question: "Do I need a physio for back pain from sitting?",
        answer: "Usually not at first. Mild stiffness from sitting often improves with breaks, a better setup and strength work. See a physiotherapist or doctor if pain is severe, spreads down a leg with numbness or tingling, stops you doing normal things, or has not improved after a few weeks. Flex & Flow in Uluwatu is a bodywork studio, not a physio clinic; our [physio or sport massage guide](/uluwatu-bali/physiotherapy/) explains the difference.",
      },
    ],
  },
];

export default blocks;
