/**
 * Content model for Flex & Flow Academy — redesign branch.
 *
 * Follows the written brief: three disciplines, each taught two ways (online
 * course, two-day onsite course), plus learning materials sold on their own.
 * Onsite runs once a quarter and is capped at six students; registration
 * exists ONLY for onsite, because it is the only thing with a limited supply.
 *
 * What the redesign changes is not the shape of the catalogue but how much a
 * page can tell you before you click. So the model carries more than the
 * original did:
 *   - `modules` are objects with lessons and minutes, not bare strings, so a
 *     curriculum can state its own length.
 *   - `outcomes` is new — the "what you will be able to do" checklist that
 *     Udemy and Coursera put above the fold.
 *   - `requirements` is new, so the entry bar is stated rather than implied.
 *
 * Honesty rules:
 *   - Prices stay `null` until the client confirms them (see `formatPrice`).
 *   - There is no rating or review count in here. The reference platforms
 *     lead with "4.8 · 2,229 ratings"; inventing that would be fabricating
 *     social proof. Metadata rows carry only what the academy knows — hours,
 *     modules, level, cohort size. Add real figures here if they are ever
 *     collected, rather than hard-coding them into a component.
 *   - Lesson minutes are an editorial split of the per-discipline totals the
 *     original model stated ("around 6 hours"). Treat them as provisional.
 */

/** Hard cap on onsite class size — the academy's main selling point. */
export const MAX_SEATS = 6;

/** How long a seat is held once someone reaches the payment step. */
export const SEAT_HOLD_MINUTES = 30;

export const CONTACT = {
  studio: "Flex & Flow Studio",
  address: "Jl. Labuansait, Pecatu, Uluwatu, Bali 80361",
  whatsapp: "https://wa.me/6280000000000",
  whatsappLabel: "+62 800 0000 0000",
  email: "academy@flexandflow.fit",
  hours: "Monday – Sunday, 09:00 – 19:00 WITA",
  /* The studio site is no longer a different origin — it is this app's `(main)`
     route group. A path, not an absolute URL, so the "back to flexandflow.fit"
     links resolve against whatever host is serving (localhost included) rather
     than jumping to production from a dev machine. */
  mainSite: "/",
} as const;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DisciplineSlug =
  | "lymphatic-drainage"
  | "assisted-stretching"
  | "sports-massage";

export type Lesson = { title: string; minutes: number };

export type Module = {
  n: number;
  title: string;
  summary: string;
  lessons: Lesson[];
};

export type Session = {
  id: string;
  /** ISO date of day one. The only field anything sorts on. */
  startDate: string;
  /** Compact form for tables and rows, e.g. "12–13 Sep 2026". */
  label: string;
  /** Long form for headings, e.g. "12–13 September 2026". */
  longLabel: string;
  quarter: string;
  venue: string;
  seatsLeft: number;
};

/** The two course types the brief names. Each has its own page. */
export type CourseType = "online" | "onsite";

export type Discipline = {
  slug: DisciplineSlug;
  title: string;
  shortTitle: string;
  summary: string;
  intro: string;
  photo: string;
  photoAlt: string;
  level: string;
  /** What you will be able to do afterwards. Verbs, not topics. */
  outcomes: string[];
  audience: string[];
  requirements: string[];
  /**
   * Not currently rendered anywhere. The "What it does for your practice"
   * band on the course-type page was removed; these two fields are kept
   * because the copy is written and re-enabling that section is a matter of
   * restoring the band and shifting the tones back. Delete them only if that
   * decision is final.
   */
  whyItMatters: string;
  addsToPractice: string[];
  /** Also unrendered since "Who it is for" was removed. Same reasoning. */
  /** Shared syllabus: the onsite course teaches the same modules. */
  modules: Module[];
  online: {
    format: string;
    price: number | null;
    /**
     * `benefits` is deliberately separate from `includes`. Includes is the
     * contract — what you receive for the money. Benefits is the argument —
     * why that is worth having. Mixing them produces a list that is neither
     * checkable nor persuasive.
     */
    benefits: string[];
    includes: string[];
  };
  onsite: {
    duration: string;
    schedule: string;
    outline: { day: string; items: string[] }[];
    includes: string[];
    benefits: string[];
    sessions: Session[];
    price: number | null;
  };
  ebook: { pages: number; price: number | null; contents: string[] };
};

export type Testimonial = { quote: string; name: string; role: string };
export type Faq = { question: string; answer: string };

/* ------------------------------------------------------------------ */
/* Disciplines                                                         */
/* ------------------------------------------------------------------ */

/** What the onsite fee buys. Contractual — every line is checkable. */
const ONSITE_INCLUDES = [
  "Two full days of teaching",
  "Practice on real bodies, not mannequins",
  `Maximum ${MAX_SEATS} students, so everyone is corrected personally`,
  "The complete online course and manual, included",
  "Certificate of completion",
  "Lunch and refreshments both days",
];

/** Why two days in a room beats watching a video. Persuasive, not a list of goods. */
const ONSITE_BENEFITS = [
  "Someone watches your hands and moves them when they are wrong — the one thing video cannot do",
  "You feel what correct pressure is on a real body, which no description conveys",
  `A room of ${MAX_SEATS} means you are corrected repeatedly, not once`,
  "You leave having run a full session start to finish, observed",
  "You practise on people who give honest feedback, not on a cushion",
  "The certificate is something clients and employers recognise",
];

const ONLINE_INCLUDES = [
  "Every module and lesson, on demand",
  "The complete PDF manual",
  "Lifetime access on phone and laptop",
  "Free updates whenever the material is revised",
];

const ONLINE_BENEFITS = [
  "Start today — nothing to register for and nothing to wait for",
  "Go at your own pace, and repeat the awkward parts as often as you need",
  "Revisit a sequence the night before a client books it",
  "No flights, no time away from your treatment room",
  "What you pay here comes off the onsite fee if you join a course later",
];

export const DISCIPLINES: Discipline[] = [
  {
    slug: "lymphatic-drainage",
    title: "Lymphatic Drainage Massage",
    shortTitle: "Lymphatic Drainage",
    summary:
      "Gentle, rhythmic work that supports the lymphatic system — the treatment clients ask for by name.",
    intro:
      "Lymphatic drainage is the most requested treatment on our studio menu, and the one most therapists are taught badly. This programme rebuilds the technique from the anatomy up: where the fluid actually goes, how little pressure it takes, and how to sequence a full session that leaves a client feeling lighter rather than worked over.",
    photo: "/photos/lymphatic-drainage.jpg",
    photoAlt: "Therapist performing lymphatic drainage massage on a client",
    level: "All levels — no experience required",
    outcomes: [
      "Trace where lymph actually travels, and work with it rather than against it",
      "Use the very light pressure the technique needs, and hold it for a full hour",
      "Run a complete full-body sequence from neck to limbs",
      "Adapt the sequence for post-operative and oedema clients",
      "Recognise the contraindications that mean you do not treat at all",
      "Build a 60-minute session a client will book again next month",
    ],
    audience: [
      "Massage and spa therapists adding a signature treatment",
      "Wellness professionals working with post-operative or oedema clients",
      "Beginners who want a low-pressure technique to start with",
    ],
    requirements: [
      "No prior training — the programme starts from the anatomy",
      "For the onsite course: clothes you can work in for two full days",
      "A partner to practise on between sessions helps, but is not required",
    ],
    whyItMatters:
      "It is the treatment clients ask for by name, and the one most therapists have never been taught properly. Because it needs almost no pressure, it is also the treatment you can still deliver at the end of a long day — which matters more to a working practice than it sounds.",
    addsToPractice: [
      "A signature treatment that gets requested rather than recommended",
      "Almost no physical load on you, so it fits late in a full day",
      "Opens post-operative and oedema clients, who rebook on a schedule",
      "Needs no equipment beyond a table you already own",
    ],
    modules: [
      {
        n: 1,
        title: "The lymphatic system, without the textbook",
        summary:
          "Where the fluid goes and why direction matters more than force.",
        lessons: [
          { title: "Nodes, vessels and the routes between them", minutes: 22 },
          { title: "Why the neck is always cleared first", minutes: 16 },
          { title: "What the system does when you push too hard", minutes: 18 },
          { title: "Reading swelling: fluid, fat or inflammation", minutes: 20 },
        ],
      },
      {
        n: 2,
        title: "Pressure, rhythm and direction",
        summary:
          "The three variables that decide whether the treatment works at all.",
        lessons: [
          { title: "Calibrating to the weight of a coin", minutes: 18 },
          { title: "Setting a rhythm you can hold for an hour", minutes: 16 },
          { title: "Stretch and release, not glide", minutes: 20 },
          { title: "Protecting your hands over a full day", minutes: 14 },
        ],
      },
      {
        n: 3,
        title: "The full-body sequence",
        summary: "Every region demonstrated in the order it must be worked.",
        lessons: [
          { title: "Neck and clavicular clearing", minutes: 24 },
          { title: "Face and scalp", minutes: 18 },
          { title: "Torso, abdomen and the deep pathways", minutes: 26 },
          { title: "Arms and hands", minutes: 20 },
          { title: "Legs and feet", minutes: 22 },
        ],
      },
      {
        n: 4,
        title: "Contraindications and referral",
        summary:
          "The clients you should not treat, and how to say so without alarming them.",
        lessons: [
          { title: "Absolute contraindications", minutes: 18 },
          { title: "Post-surgical timing and clearance", minutes: 20 },
          { title: "How to refer out and keep the relationship", minutes: 14 },
        ],
      },
      {
        n: 5,
        title: "Building a repeatable 60-minute session",
        summary:
          "Turning a sequence into a treatment clients rebook on a schedule.",
        lessons: [
          { title: "Intake questions that change the plan", minutes: 16 },
          { title: "Structuring the hour", minutes: 20 },
          { title: "Aftercare and the rebook conversation", minutes: 18 },
        ],
      },
    ],
    online: {
      format:
        "Self-paced digital learning materials you can work through on a phone or laptop, with lifetime access.",
      price: null,
      benefits: ONLINE_BENEFITS,
      includes: ONLINE_INCLUDES,
    },
    onsite: {
      duration: "2 full days",
      schedule: "09:00 – 16:00 both days",
      outline: [
        {
          day: "Day one",
          items: [
            "Anatomy walkthrough on a live model",
            "Pressure calibration drills in pairs",
            "The neck and torso sequence",
          ],
        },
        {
          day: "Day two",
          items: [
            "Limb sequences and oedema adaptations",
            "Full 60-minute session, observed and corrected",
            "Client intake, aftercare and safety",
          ],
        },
      ],
      includes: ONSITE_INCLUDES,
      benefits: ONSITE_BENEFITS,
      sessions: [
        {
          id: "ld-2026-q3",
          startDate: "2026-09-12",
          label: "12–13 Sep 2026",
          longLabel: "12–13 September 2026",
          quarter: "Q3 2026",
          venue: "Uluwatu studio",
          seatsLeft: 4,
        },
        {
          id: "ld-2026-q4",
          startDate: "2026-12-05",
          label: "5–6 Dec 2026",
          longLabel: "5–6 December 2026",
          quarter: "Q4 2026",
          venue: "Uluwatu studio",
          seatsLeft: 6,
        },
      ],
      price: null,
    },
    ebook: {
      pages: 68,
      price: null,
      contents: [
        "Anatomy basics, explained simply",
        "Step-by-step technique photography",
        "Session templates you can print",
        "Client safety and contraindications",
      ],
    },
  },

  {
    slug: "assisted-stretching",
    title: "Assisted Stretching",
    shortTitle: "Assisted Stretching",
    summary:
      "Table-based stretching for clients who sit all day — quick to add to your menu, and in constant demand.",
    intro:
      "Assisted stretching is the fastest treatment to add to an existing menu and the easiest to do carelessly. The programme covers how to read a body before you touch it, how to move a limb without fighting it, and how to build a session that a desk-bound client will rebook every fortnight.",
    photo: "/photos/assisted-stretching.jpg",
    photoAlt: "Therapist guiding a client through an assisted stretch",
    level: "All levels — no experience required",
    outcomes: [
      "Read posture and restriction before you put a hand on anyone",
      "Position and leverage a limb without fighting it or hurting yourself",
      "Run the full position library, joint by joint, from ankle to neck",
      "Sequence a 60-minute session a desk-bound client will rebook",
      "Adapt safely for hypermobile clients and old injuries",
      "Recognise the red flags that mean stop and refer out",
    ],
    audience: [
      "Therapists working with office and desk-bound clients",
      "Personal trainers and movement coaches",
      "Anyone wanting a treatment that needs no oil or table linen",
    ],
    requirements: [
      "No prior training — the programme starts from the anatomy",
      "For the onsite course: clothes you can move and be moved in",
      "A partner to practise on between sessions helps, but is not required",
    ],
    whyItMatters:
      "Every desk worker in Bali is a candidate, and most of them have never been offered it. It is the quickest treatment to add to an existing menu because it needs no oil, no linen and no shower afterwards — a client can book it in work clothes on a lunch break.",
    addsToPractice: [
      "No oil, no linen, no laundry — the cheapest treatment you can run",
      "Clients come in ordinary clothes, so it fits into a working day",
      "Desk-bound clients rebook fortnightly rather than occasionally",
      "Pairs naturally with massage you already offer, as a shorter add-on",
    ],
    modules: [
      {
        n: 1,
        title: "Reading a body before you touch it",
        summary:
          "What to look at, what to ask, and what should stop you before the session starts.",
        lessons: [
          { title: "Standing and seated postural assessment", minutes: 18 },
          { title: "The five questions worth asking every client", minutes: 12 },
          { title: "Restriction versus tightness versus guarding", minutes: 16 },
          { title: "Red flags and when to refer out", minutes: 14 },
        ],
      },
      {
        n: 2,
        title: "Positioning, leverage and your own mechanics",
        summary:
          "How to move someone heavier than you without bracing, and without wrecking your own back.",
        lessons: [
          {
            title: "Table height, stance and where your weight goes",
            minutes: 15,
          },
          { title: "Using bodyweight instead of arm strength", minutes: 17 },
          { title: "Securing a limb so the client can let go", minutes: 14 },
          {
            title: "Protecting your wrists, shoulders and lower back",
            minutes: 12,
          },
        ],
      },
      {
        n: 3,
        title: "The position library",
        summary:
          "Every position demonstrated joint by joint, with the common errors shown alongside.",
        lessons: [
          { title: "Ankle, calf and hamstring", minutes: 22 },
          { title: "Hip, glute and adductor", minutes: 24 },
          { title: "Lumbar and thoracic rotation", minutes: 20 },
          { title: "Shoulder girdle and chest", minutes: 21 },
          { title: "Neck, and why it is last", minutes: 15 },
        ],
      },
      {
        n: 4,
        title: "Sequencing a 60-minute session",
        summary:
          "Turning a library of positions into a treatment with a beginning, a middle and a reason to rebook.",
        lessons: [
          { title: "Opening: what the first ten minutes are for", minutes: 14 },
          { title: "Building the middle around the assessment", minutes: 18 },
          { title: "Closing, aftercare and the rebook conversation", minutes: 13 },
        ],
      },
      {
        n: 5,
        title: "Hypermobility, injury and adaptation",
        summary:
          "The clients where the standard sequence is the wrong answer, and what to do instead.",
        lessons: [
          {
            title: "Spotting hypermobility, and stretching less not more",
            minutes: 16,
          },
          { title: "Working around a healed injury", minutes: 15 },
          { title: "Pregnancy, age and range expectations", minutes: 14 },
        ],
      },
    ],
    online: {
      format:
        "Self-paced digital learning materials you can work through on a phone or laptop, with lifetime access.",
      price: null,
      benefits: ONLINE_BENEFITS,
      includes: ONLINE_INCLUDES,
    },
    onsite: {
      duration: "2 full days",
      schedule: "09:00 – 16:00 both days",
      outline: [
        {
          day: "Day one",
          items: [
            "Assessment: what to look for and what to ask",
            "Lower body positions and transitions",
            "Partner drills with hands-on correction",
          ],
        },
        {
          day: "Day two",
          items: [
            "Upper body, neck and shoulder work",
            "Full session run-through, observed and corrected",
            "Adapting for hypermobility and old injuries",
          ],
        },
      ],
      includes: ONSITE_INCLUDES,
      benefits: ONSITE_BENEFITS,
      sessions: [
        {
          id: "as-2026-q4",
          startDate: "2026-10-17",
          label: "17–18 Oct 2026",
          longLabel: "17–18 October 2026",
          quarter: "Q4 2026",
          venue: "Uluwatu studio",
          seatsLeft: 6,
        },
        {
          id: "as-2027-q1",
          startDate: "2027-01-23",
          label: "23–24 Jan 2027",
          longLabel: "23–24 January 2027",
          quarter: "Q1 2027",
          venue: "Uluwatu studio",
          seatsLeft: 6,
        },
      ],
      price: null,
    },
    ebook: {
      pages: 54,
      price: null,
      contents: [
        "Reading posture before you touch",
        "Photographed position library",
        "Building a 60-minute session",
        "When to stop and refer out",
      ],
    },
  },

  {
    slug: "sports-massage",
    title: "Sports Massage",
    shortTitle: "Sports Massage",
    summary:
      "Pre-event, post-event and recovery work for active clients and weekend athletes.",
    intro:
      "Sports massage is less about pressure than about timing. This programme covers the three protocols — before, after and between events — and, more importantly, the assessment questions that tell you which one a client in front of you actually needs.",
    photo: "/photos/sports-massage.jpg",
    photoAlt: "Therapist working on an athlete's leg during a sports massage",
    level: "All levels — no experience required",
    outcomes: [
      "Ask the questions that decide which protocol a client actually needs",
      "Work pre-event without leaving an athlete slow off the line",
      "Run post-event and recovery sequences at the right depth",
      "Plan treatment across a training season, not just one appointment",
      "Handle back, shoulder and lower-limb work at speed",
      "Spot injury red flags and refer before you make something worse",
    ],
    audience: [
      "Therapists working with athletes and active clients",
      "Studio therapists wanting a deeper-pressure offering",
      "Practitioners supporting events and race days",
    ],
    requirements: [
      "No prior training — the programme starts from the anatomy",
      "For the onsite course: clothes you can work in for two full days",
      "A partner to practise on between sessions helps, but is not required",
    ],
    whyItMatters:
      "Bali runs on surfers, cyclists, runners and gym clients, and they book around events rather than around moods. That makes sports massage the most predictable work in the calendar — but only if you can tell which of the three protocols someone in front of you actually needs.",
    addsToPractice: [
      "Clients book around a calendar, so the work is predictable",
      "Justifies a higher rate than general relaxation massage",
      "Event and race-day work brings in clients you would never meet otherwise",
      "Athletes rebook through a whole season, not once",
    ],
    modules: [
      {
        n: 1,
        title: "Assessment: choosing the right protocol",
        summary:
          "Three protocols exist; picking the wrong one is worse than doing nothing.",
        lessons: [
          { title: "The intake that takes four minutes", minutes: 20 },
          { title: "Where the athlete is in their week", minutes: 18 },
          { title: "Pain, soreness and the difference", minutes: 22 },
          { title: "Deciding: before, after, or between", minutes: 16 },
        ],
      },
      {
        n: 2,
        title: "Pre-event work",
        summary: "Short, brisk and specific — and what never to do beforehand.",
        lessons: [
          { title: "Timing it against the start line", minutes: 18 },
          { title: "Depth limits and why they matter here", minutes: 20 },
          { title: "The 15-minute pre-event routine", minutes: 24 },
          { title: "What to avoid entirely", minutes: 14 },
        ],
      },
      {
        n: 3,
        title: "Post-event and recovery",
        summary: "Flushing, settling and getting an athlete back to training.",
        lessons: [
          { title: "The first hour after an event", minutes: 22 },
          { title: "Recovery sequences, lower limb", minutes: 26 },
          { title: "Recovery sequences, back and shoulder", minutes: 24 },
          { title: "Delayed onset soreness: what helps", minutes: 18 },
        ],
      },
      {
        n: 4,
        title: "Working across a season",
        summary:
          "Treatment planned around a calendar rather than one appointment at a time.",
        lessons: [
          { title: "Building a season map with a client", minutes: 22 },
          { title: "Maintenance work between events", minutes: 24 },
          { title: "Tapering, peaking and the quiet weeks", minutes: 20 },
        ],
      },
      {
        n: 5,
        title: "Injury red flags and referral",
        summary:
          "The presentations that are not yours to treat, and what to do with them.",
        lessons: [
          { title: "Acute injury: what not to touch", minutes: 20 },
          { title: "Overuse patterns worth flagging", minutes: 22 },
          { title: "Referral, record keeping and follow-up", minutes: 20 },
        ],
      },
    ],
    online: {
      format:
        "Self-paced digital learning materials you can work through on a phone or laptop, with lifetime access.",
      price: null,
      benefits: ONLINE_BENEFITS,
      includes: ONLINE_INCLUDES,
    },
    onsite: {
      duration: "2 full days",
      schedule: "09:00 – 16:00 both days",
      outline: [
        {
          day: "Day one",
          items: [
            "Assessment and treatment planning",
            "Lower limb and hip sequences",
            "Depth and pacing drills in pairs",
          ],
        },
        {
          day: "Day two",
          items: [
            "Back, shoulder and upper limb work",
            "Pre- and post-event protocols, timed",
            "Red flags, referral and record keeping",
          ],
        },
      ],
      includes: ONSITE_INCLUDES,
      benefits: ONSITE_BENEFITS,
      sessions: [
        {
          id: "sm-2026-q4",
          startDate: "2026-11-21",
          label: "21–22 Nov 2026",
          longLabel: "21–22 November 2026",
          quarter: "Q4 2026",
          venue: "Uluwatu studio",
          seatsLeft: 0,
        },
      ],
      price: null,
    },
    ebook: {
      pages: 72,
      price: null,
      contents: [
        "Pre- and post-event protocols",
        "Photographed technique sequences",
        "Recovery planning across a season",
        "Injury red flags and referral",
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* People and questions                                                */
/* ------------------------------------------------------------------ */

export const INSTRUCTOR = {
  name: "Ginny Asih",
  role: "Lead Instructor",
  photo: "/photos/instructor-portrait.jpg",
  bio: "Ginny has run the treatment room at Flex & Flow since the studio opened, and has taught lymphatic drainage and assisted stretching to therapists across Bali. She teaches the way she treats — quietly, and with her hands on your work until it is right.",
  credentials: [
    "12 years in practice",
    "Trains the studio's own therapists",
    "Teaches every onsite course personally",
  ],
} as const;

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Six people in the room meant she actually watched my hands. I have been to trainings with thirty students where nobody corrected me once.",
    name: "Maya Pradnyani",
    role: "Spa therapist, Canggu",
  },
  {
    quote:
      "I took the online materials first and the onsite course three months later. The two days were where it clicked — but arriving already knowing the sequence made them worth twice as much.",
    name: "Daniel Reyes",
    role: "Massage therapist, Seminyak",
  },
  {
    quote:
      "I came in as a complete beginner and left able to run a full session. The manual is the thing I still use every week.",
    name: "Sari Lestari",
    role: "Wellness practitioner, Ubud",
  },
];

export const FAQS: Faq[] = [
  {
    question: "Do I need experience to join?",
    answer:
      "No. Every programme starts from the anatomy and builds up, and each intake usually includes both working therapists and complete beginners. If you are unsure which programme suits you, message us on WhatsApp and we will tell you honestly.",
  },
  {
    question: `Why are onsite courses limited to ${MAX_SEATS} students?`,
    answer:
      "Because hands-on correction is the entire point. With six students the instructor can watch every pair of hands and adjust them individually. Above that number a course becomes a demonstration, which is what the online materials are for.",
  },
  {
    question: "Do I need to register for the online courses?",
    answer:
      "No. Registration exists only for onsite courses, where seats are limited to six. Online courses and learning materials are bought directly and are available immediately after payment.",
  },
  {
    question: "How often do onsite courses run?",
    answer:
      "Each discipline runs once per quarter, so roughly every three months, and each one is two full days. Dates for the current and next quarter are listed on the schedule page, and seats usually go within a few weeks of opening.",
  },
  {
    question: "What is included in the onsite fee?",
    answer:
      "Two full days of teaching, practice on real bodies, the complete digital learning pack for that discipline, and a certificate of completion. Lunch and refreshments on both days are included as well.",
  },
  {
    question: "Do I get a certificate?",
    answer:
      "Yes, for onsite courses. You receive a Flex & Flow Academy certificate of completion at the end of day two. Online courses and learning materials are not certified.",
  },
  {
    question: "What if I need to cancel my seat?",
    answer:
      "Tell us more than 14 days before the course and we will move you to the next quarter or refund you in full. Inside 14 days we can move your seat once, but cannot refund it, because the seat is held out of a room of six.",
  },
  {
    question: "Can I buy the learning materials on their own?",
    answer:
      "Yes. Each discipline has a complete manual you can buy and download without taking a course. If you later join the onsite course for that discipline, the manual is included in the fee.",
  },
];

/* ------------------------------------------------------------------ */
/* Lookups and derived data                                            */
/* ------------------------------------------------------------------ */

export function getDiscipline(slug: string): Discipline | undefined {
  return DISCIPLINES.find((discipline) => discipline.slug === slug);
}

export const COURSE_TYPES = ["online", "onsite"] as const;

export function isCourseType(value: string): value is CourseType {
  return (COURSE_TYPES as readonly string[]).includes(value);
}

/**
 * Everything that differs between the two course types, in one place.
 *
 * The alternative was a `type === "onsite" ? … : …` at every point of a long
 * page. Pulling it here means the two pages share one template and cannot
 * drift apart — and adding a third type later is an entry in this object
 * rather than an audit of every file.
 */
export function courseTypeMeta(discipline: Discipline, type: CourseType) {
  const open = openSessions(discipline);
  return type === "onsite"
    ? {
        name: "Onsite course",
        tagline: "Two days in the room, with your hands corrected as you work.",
        price: discipline.onsite.price,
        benefits: discipline.onsite.benefits,
        includes: discipline.onsite.includes,
        certificate: true,
        /** Registration exists only here — this is the limited resource. */
        needsRegistration: true,
        href: `/academy/register/${discipline.slug}`,
        action: open.length ? "Secure a spot" : "Join the waitlist",
        available: open.length > 0,
        commitment: `${discipline.onsite.duration}, ${discipline.onsite.schedule}`,
        cohort: `Maximum ${MAX_SEATS} students`,
        other: "online" as CourseType,
      }
    : {
        name: "Online course",
        tagline: "Work through it at your own pace, from anywhere.",
        price: discipline.online.price,
        benefits: discipline.online.benefits,
        includes: discipline.online.includes,
        certificate: false,
        needsRegistration: false,
        href: `/academy/materials/${discipline.slug}`,
        action: "Buy and start now",
        available: true,
        commitment: `${formatDuration(totalMinutes(discipline))} of material`,
        cohort: "No class — work alone",
        other: "onsite" as CourseType,
      };
}

/** A session is open only while it still has seats. */
export function isOpen(session: Session): boolean {
  return session.seatsLeft > 0;
}

export function openSessions(discipline: Discipline): Session[] {
  return discipline.onsite.sessions.filter(isOpen);
}

/** Every session across every discipline, earliest first, for the schedule. */
export const ALL_SESSIONS: { session: Session; discipline: Discipline }[] =
  DISCIPLINES.flatMap((discipline) =>
    discipline.onsite.sessions.map((session) => ({ session, discipline })),
  ).sort((a, b) => a.session.startDate.localeCompare(b.session.startDate));

export function lessonCount(discipline: Discipline): number {
  return discipline.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export function totalMinutes(discipline: Discipline): number {
  return discipline.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((i, l) => i + l.minutes, 0),
    0,
  );
}

export function moduleMinutes(module: Module): number {
  return module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
}

/** "6h 15m" for totals, "22m" for anything under an hour. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * Prices are unconfirmed, so every one of them renders as a phrase rather
 * than a number. Kept identical to the original model so the wording does not
 * drift between branches.
 */
export function formatPrice(price: number | null): string {
  if (price === null) return "Price on request";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}
