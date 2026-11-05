/** Sections appended to /uluwatu-bali/physiotherapy/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Physio in Uluwatu or Sport Massage? Common Situations",
  },
  {
    type: "paragraph",
    text: "If you are looking for a physio in Uluwatu, start by matching what you feel to the right first step. These situations are common for surfers, remote workers and travellers. If you are unsure, see a physiotherapist or doctor first.",
  },
  {
    type: "table",
    head: ["Situation", "Start with"],
    rows: [
      [
        "Shoulders and upper back ache after a week of paddling, but your arm moves fully",
        "Sport massage or assisted stretching",
      ],
      [
        "Your shoulder catches, clicks painfully or feels weak when you lift your arm",
        "Physiotherapist",
      ],
      [
        "You rolled an ankle or twisted a knee and it is swollen",
        "Physiotherapist, or a doctor if you cannot put weight on it",
      ],
      [
        "A scooter fall or a hit on the reef, with a lot of pain, swelling or an open wound",
        "Doctor first",
      ],
      [
        "Lower back and hips feel stiff after flights and long laptop days",
        "Assisted stretching or sport massage",
      ],
      [
        "Back pain that spreads down a leg with tingling or numbness",
        "Physiotherapist or doctor",
      ],
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "What a Physio Does That a Massage Therapist Does Not",
  },
  {
    type: "paragraph",
    text: "A registered physiotherapist works out why something hurts and plans your recovery. That includes things a bodywork studio like Flex & Flow does not do:",
  },
  {
    type: "list",
    items: [
      "**Diagnosis.** Movement and strength tests to find the likely cause, and advice on when you need a doctor or a scan.",
      "**A rehab programme.** Exercises that progress as you get stronger, with regular checks on how you are doing.",
      "**Return-to-sport advice.** When it is reasonable to paddle out, train or run again after an injury.",
      "**Dry needling.** Some physiotherapists insert thin, solid needles into tight muscle. Flex & Flow does not offer dry needling. Our [cupping therapy](/uluwatu-bali/cupping-therapy/) uses suction cups, which is a different technique.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "How to Combine Physio and Sport Massage",
  },
  {
    type: "paragraph",
    text: "If you are already seeing a physiotherapist, sport massage or stretching can fit around your rehab. A simple way to do it:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "Get assessed first, so you know what the injury is.",
      "Ask your physio which areas are fine to massage or stretch, and which to leave alone for now.",
      "Tell your Flex & Flow therapist what your physio said before the session starts.",
      "Keep up your rehab exercises. Massage may ease tightness, but the exercises are what rebuild strength.",
      "If pain changes or gets worse after a session, tell your physio.",
    ],
  },
  {
    type: "paragraph",
    text: "A 60-minute [sport massage](/uluwatu-bali/sport-massage/) costs IDR {{price:sport-massage:60:standard}} with a therapist or IDR {{price:sport-massage:60:master}} with our master therapist, Ginny, and 90 minutes costs IDR {{price:sport-massage:90:standard}} or IDR {{price:sport-massage:90:master}}. A 60-minute [assisted stretching](/uluwatu-bali/assisted-stretching/) session costs IDR {{price:assisted-stretching:60:standard}} or IDR {{price:assisted-stretching:60:master}}. Surfers can also read our guide to [common surfing injuries](/injury-guide/common-surfing-injuries/).",
  },
  {
    type: "heading",
    level: 2,
    text: "More Questions About Physio and Sport Massage",
  },
  {
    type: "faq",
    items: [
      {
        question: "Does Flex & Flow offer dry needling in Uluwatu?",
        answer: "No. Flex & Flow is a bodywork studio in Ungasan, Uluwatu, with no physiotherapist on the team, so we do not offer dry needling. Some physiotherapists offer it, so ask a registered physio clinic whether it suits your problem. We offer dry cupping, which uses suction rather than needles: a 30-minute session costs IDR {{price:cupping-therapy:30:standard}}.",
      },
      {
        question: "How do I find a physio near me in Uluwatu?",
        answer: "Look for a clinic with a registered physiotherapist (in Indonesia, they hold an STR), ask what the first session includes, and check whether they visit villas if you cannot ride a scooter. Our guide to [choosing a physical therapist in Uluwatu](/uluwatu-bali/physical-therapist/) has a checklist and questions to ask. Flex & Flow is not a physio clinic, but our sport massage and stretching can sit alongside physio.",
      },
      {
        question: "What should I tell my massage therapist if I am seeing a physio?",
        answer: "Tell them what your physio diagnosed, which areas to avoid, which exercises you are doing and how the injury feels today. Mention any recent surgery, and any medicine that makes you bleed or bruise more easily. At Flex & Flow in Uluwatu, this helps your therapist adjust the pressure and leave alone any area your physio wants rested.",
      },
      {
        question: "Should I see a physio for shoulder pain from surfing?",
        answer: "If your shoulder is tight and achy after a lot of paddling but moves fully, sport massage or assisted stretching may be enough. See a physiotherapist if it hurts to lift your arm, feels weak, catches or clicks painfully, or has not improved after one to two weeks. Flex & Flow in Uluwatu can help with the tightness; a physio assesses the joint.",
      },
      {
        question: "Is assisted stretching safe after an injury?",
        answer: "It can be, once a physiotherapist or doctor has checked the injury and agrees stretching will help. At Flex & Flow, your therapist supports each stretch and controls the movement. Tell them straight away if you feel sharp pain, pinching, numbness or tingling. A 60-minute assisted stretching session in Uluwatu costs IDR {{price:assisted-stretching:60:standard}}, or IDR {{price:assisted-stretching:60:master}} with our master therapist, Ginny.",
      },
      {
        question: "Can a massage therapist come to my villa if I am injured?",
        answer: "Yes, for bodywork, as long as your physiotherapist or doctor agrees massage is suitable. Flex & Flow's [home service](/uluwatu-bali/outcall-home-service-massage/) covers the Uluwatu area, including Ungasan, Pecatu, Bingin, Padang Padang and Balangan, Monday to Saturday, 09:00 to 17:00. Treatment prices are the same as at the studio, plus a home service fee of IDR {{fee}} per visit.",
      },
    ],
  },
];

export default blocks;
