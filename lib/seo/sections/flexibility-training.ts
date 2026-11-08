/** Sections appended to /uluwatu-bali/flexibility-training/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "What Does a Simple Weekly Flexibility Plan Look Like?",
  },
  {
    type: "paragraph",
    text: "A simple weekly flexibility plan is two or three short static stretching sessions, a quick dynamic warm-up before activity, and rest days in between. This version fits a surf or training week in Bali and uses the five stretches above.",
  },
  {
    type: "table",
    head: ["Day", "What to do", "Time"],
    rows: [
      [
        "Monday",
        "Static session: the five stretches above, 30 to 60 seconds each side",
        "15 min",
      ],
      [
        "Tuesday and Friday",
        "Dynamic warm-up before surfing or training: leg swings, arm circles, cat-cow",
        "5 min",
      ],
      ["Wednesday", "Rest, or an easy walk", "None"],
      [
        "Thursday",
        "Static session, with extra time on your tightest area",
        "15 to 20 min",
      ],
      [
        "Saturday",
        "Static session, or an assisted stretching session every few weeks",
        "15 to 60 min",
      ],
      ["Sunday", "Rest", "None"],
    ],
  },
  {
    type: "paragraph",
    text: "In Bali's heat, stretch in the cooler early morning or late afternoon, drink water, and keep every stretch gentle. Progress comes from repeating the plan week after week, not from pushing harder on one day.",
  },
  {
    type: "heading",
    level: 2,
    text: "Can Assisted Stretching Help You Get More Flexible Faster?",
  },
  {
    type: "paragraph",
    text: "It can help, as long as you keep stretching between sessions. Passive and PNF stretching, two of the types in the table above, are the hardest to do well alone because they need a partner. In an assisted stretching session at Flex & Flow in Uluwatu, your therapist:",
  },
  {
    type: "list",
    items: [
      "holds you in positions you cannot reach, or relax into, by yourself",
      "uses PNF, where you briefly push against their hand before moving a little deeper",
      "finds the areas that limit you most, including differences between your left and right side",
      "can suggest which stretches to prioritise in your weekly plan",
    ],
  },
  {
    type: "paragraph",
    text: "Read more about [assisted stretching in Uluwatu](/uluwatu-bali/assisted-stretching/), including home visits to villas in the area.",
  },
  {
    type: "heading",
    level: 2,
    text: "When to Get Help Instead of Stretching More",
  },
  {
    type: "paragraph",
    text: "Stretching should feel like mild to moderate tension. Stop and get checked by a doctor or physiotherapist if you notice:",
  },
  {
    type: "list",
    items: [
      "sharp, pinching or burning pain during a stretch",
      "numbness, tingling, or pain that travels down an arm or leg",
      "a joint that feels unstable, locks or gives way",
      "swelling, bruising or pain after a fall, a wipeout or a sudden twist",
      "stiffness that keeps getting worse, or comes with fever or feeling unwell",
      "no improvement after several weeks of regular stretching",
    ],
  },
  {
    type: "paragraph",
    text: "Our guides to [choosing a physical therapist in Uluwatu](/uluwatu-bali/physical-therapist/) and [common surfing injuries](/injury-guide/common-surfing-injuries/) explain the next steps. Flex & Flow is a bodywork studio, not a physiotherapy clinic.",
  },
  {
    type: "heading",
    level: 2,
    text: "More Questions About Flexibility Training",
  },
  {
    type: "faq",
    items: [
      {
        question: "How long does it take to become more flexible?",
        answer: "It depends on your age, starting point and how consistent you are. With two or three stretching sessions a week, many people notice small gains within a few weeks, while bigger changes, such as touching your toes for the first time, usually take a few months. Regular, gentle stretching tends to work better than occasional hard sessions.",
      },
      {
        question: "Can you do flexibility training while travelling in Bali?",
        answer: "Yes. Flexibility training needs no equipment, so a towel on your villa floor is enough for the five beginner stretches in this guide. Aim for two or three 15-minute sessions a week, save long static holds for after surfing, and drink plenty of water in the heat. If you are in Uluwatu and feel stuck, Flex & Flow offers one-to-one assisted stretching at its Ungasan studio or your villa.",
      },
      {
        question: "Can you be too flexible?",
        answer: "Some people have very mobile joints, known as joint hypermobility. If that is you, more stretching is not always the answer, and building strength and control around the joints often matters more. If your flexible joints often ache, click painfully or feel as if they slip, ask a doctor or physiotherapist for advice before starting an intensive stretching programme.",
      },
      {
        question: "Do I need to be flexible to book assisted stretching?",
        answer: "No. Assisted stretching is designed for people who feel stiff. At Flex & Flow in Uluwatu, your therapist starts within your current range and adjusts each stretch to how your body responds, so very tight beginners are welcome. A 60-minute session costs IDR {{price:assisted-stretching:60:standard}} with a therapist or IDR {{price:assisted-stretching:60:master}} with master therapist Ginny.",
      },
      {
        question: "Are there flexibility classes in Uluwatu?",
        answer: "Flex & Flow does not run group flexibility classes or courses. Instead, we offer one-to-one assisted stretching at our studio on Jl. Toya Ning II, Ungasan, open Monday to Saturday from 09:00 to 17:00, or at your villa in the Uluwatu area. If you prefer a group setting, a yoga class is the closest option; our guide to [yoga or assisted stretching](/uluwatu-bali/yoga/) compares the two.",
      },
      {
        question: "Does flexibility training help with lower back stiffness?",
        answer: "It may. Tight hip flexors, hamstrings and glutes can add to a stiff lower back, and many people feel more comfortable when they stretch these areas alongside strength work. Stretching is not a treatment for sharp pain, pain that travels down a leg, numbness, or pain after an injury, so see a doctor first. The NHS has practical [back pain advice](https://www.nhs.uk/conditions/back-pain/).",
      },
    ],
  },
];

export default blocks;
