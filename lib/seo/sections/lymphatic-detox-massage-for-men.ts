/** Sections appended to /uluwatu-bali/lymphatic-detox-massage-for-men/. See ./index.ts. */
import type { ContentBlock } from "@/types";

const blocks: ContentBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "Men's lymphatic drainage massage in Uluwatu: prices and session length",
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
        "IDR {{price:lymphatic-detox-massage-for-men:60:standard}}",
        "IDR {{villa:lymphatic-detox-massage-for-men:60:standard}}",
      ],
      [
        "90 minutes · Yuni",
        "IDR {{price:lymphatic-detox-massage-for-men:90:standard}}",
        "IDR {{villa:lymphatic-detox-massage-for-men:90:standard}}",
      ],
      [
        "60 minutes · Ginny, master therapist",
        "IDR {{price:lymphatic-detox-massage-for-men:60:master}}",
        "IDR {{villa:lymphatic-detox-massage-for-men:60:master}}",
      ],
      [
        "90 minutes · Ginny, master therapist",
        "IDR {{price:lymphatic-detox-massage-for-men:90:master}}",
        "IDR {{villa:lymphatic-detox-massage-for-men:90:master}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "Sessions run at the studio on Jl. Toya Ning II, Ungasan, Monday to Saturday from 09:00 to 17:00. If you would rather not travel, a therapist can come to your villa or hotel in the Uluwatu area through our [home service](/uluwatu-bali/outcall-home-service-massage/) for an extra IDR {{fee}} per visit.",
  },
  {
    type: "heading",
    level: 2,
    text: "How the men's session differs from standard lymphatic drainage",
  },
  {
    type: "paragraph",
    text: "Both sessions use the same light, slow technique. What changes is how much of you is covered, and the price. Compared with our [standard lymphatic drainage](/uluwatu-bali/lymphatic-drainage/):",
  },
  {
    type: "table",
    head: ["Detail", "Lymphatic drainage", "Lymphatic detox massage for men"],
    rows: [
      [
        "Areas covered",
        "One focused area, such as the legs, or a broader part of the body",
        "Full body, plus face, scalp, head and neck",
      ],
      ["Pressure", "Light and slow", "Light and slow"],
      [
        "60 min",
        "From IDR {{price:lymphatic-drainage:60:standard}}",
        "From IDR {{price:lymphatic-detox-massage-for-men:60:standard}}",
      ],
      [
        "90 min",
        "From IDR {{price:lymphatic-drainage:90:standard}}",
        "From IDR {{price:lymphatic-detox-massage-for-men:90:standard}}",
      ],
    ],
  },
  {
    type: "paragraph",
    text: "The pressure is not firmer for men. Lymphatic work is meant to feel light, so it stays gentle for everyone. If you want deep pressure into tight muscles, book a [sport massage](/uluwatu-bali/sport-massage/) instead.",
  },
  {
    type: "heading",
    level: 2,
    text: "Fitting a lymphatic session around surf, training and travel",
  },
  {
    type: "paragraph",
    text: "Because the pressure is light, the session fits easily into an active week in Uluwatu. A few practical pointers:",
  },
  {
    type: "list",
    items: [
      "**After a long flight**: if your legs feel heavy from hours of sitting, a session in your first days in Bali may help them feel lighter. If one calf is painful, hot or swollen, see a doctor first.",
      "**Between surf or gym sessions**: treat it as a calm reset rather than deep muscle work. For shoulders that are sore from paddling, a sport massage is the better fit.",
      "**Long days at a laptop**: the head, scalp and neck work suits you if that is where you hold tension.",
      "**With a new injury or cut**: a fresh sprain, strain or infected reef cut needs checking by a doctor before any massage.",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "Men's lymphatic massage in Uluwatu: common questions",
  },
  {
    type: "faq",
    items: [
      {
        question: "How much is a men's lymphatic drainage massage in Uluwatu?",
        answer: "At Flex & Flow in Ungasan, Uluwatu, the lymphatic detox massage for men costs IDR {{price:lymphatic-detox-massage-for-men:60:standard}} for 60 minutes or IDR {{price:lymphatic-detox-massage-for-men:90:standard}} for 90 minutes with our therapist, Yuni. With Ginny, the founder and master therapist, it is IDR {{price:lymphatic-detox-massage-for-men:60:master}} for 60 minutes or IDR {{price:lymphatic-detox-massage-for-men:90:master}} for 90 minutes. A home visit to your villa or hotel in the Uluwatu area adds IDR {{fee}}.",
      },
      {
        question: "Is a men's lymphatic massage firmer than a normal lymphatic massage?",
        answer: "No. At Flex & Flow in Uluwatu, the men's session uses the same light, slow strokes as standard lymphatic drainage, because lymphatic work is meant to feel gentle. What changes is the content: full-body lymphatic drainage plus facial, scalp, head and neck work. If you want firm pressure on tight or sore muscles, a sport massage is the better choice.",
      },
      {
        question: "Does a lymphatic detox massage actually remove toxins?",
        answer: "There is no solid evidence that lymphatic massage detoxes the body or removes toxins in healthy people. At Flex & Flow in Uluwatu, the lymphatic detox massage for men is a gentle full-body session with face, scalp, head and neck work, which many men find leaves them feeling lighter and less puffy for a while. Our guide to [what lymphatic drainage can and cannot do](/uluwatu-bali/lymphatic-drainage-massage-what-it-can-do/) explains the evidence.",
      },
      {
        question: "Can I have a lymphatic massage after surfing or the gym?",
        answer: "Yes. The pressure is light, so a men's lymphatic massage at Flex & Flow in Uluwatu can go on the same day as a surf or a workout, or on a rest day. It aims to leave you feeling lighter and calmer rather than to work deep into sore muscles. For soreness after paddling or lifting, a sport massage usually suits better. Get any new injury checked first.",
      },
      {
        question: "Should I book 60 or 90 minutes for a men's lymphatic massage?",
        answer: "The men's session at Flex & Flow in Uluwatu combines full-body lymphatic drainage with face, scalp, head and neck work. Sixty minutes, from IDR {{price:lymphatic-detox-massage-for-men:60:standard}}, suits a first try or a quick reset. Ninety minutes, from IDR {{price:lymphatic-detox-massage-for-men:90:standard}}, gives a slower pace and more time on the areas that feel heaviest. Tell your therapist your priorities at the start of the session.",
      },
      {
        question: "Who gives the men's lymphatic massage at Flex & Flow?",
        answer: "Two therapists offer it at Flex & Flow in Uluwatu. [Yuni](/therapist/yuni/), our Javanese massage and lymphatic specialist, works at the Therapist rate, from IDR {{price:lymphatic-detox-massage-for-men:60:standard}} for 60 minutes. [Ginny](/therapist/ginny/), the founder and master therapist, has a background in nursing, professional fitness training and bodywork, and works at the Master therapist rate, from IDR {{price:lymphatic-detox-massage-for-men:60:master}}. The treatment is the same with either.",
      },
    ],
  },
];

export default blocks;
