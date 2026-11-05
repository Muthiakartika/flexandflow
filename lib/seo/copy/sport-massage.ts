/**
 * The copy of /uluwatu-bali/sport-massage/, in place of the panel's. See
 * ./index.ts.
 *
 * Written for clients who already know what a sports massage is and are
 * choosing where to have one: what gets worked on and how, not what massage
 * is for. Ginny is the name the studio is known by, but her diary is full,
 * so the copy carries her approach over to the team and keeps the team the
 * easy booking; her own sessions are the limited, higher-priced step up.
 * Every claim about the studio's way of working comes from its own pages
 * (Ginny's profile, About, the old panel copy).
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "Hands-on recovery for people who surf, train and hike hard, at our studio in Ungasan or at your villa in Uluwatu.",
  body: [
    {
      type: "paragraph",
      text: "Paddling, pop-ups and training load the same muscles day after day. Left alone, that load turns into tight shoulders, a stiff lower back and hips that stop moving well, and it shows in the water and in the gym. Sports massage at Flex & Flow works on where it has built up, at a pressure your body can use, with stretching and mobility work alongside the massage.",
    },
    {
      type: "paragraph",
      text: "The studio is in Ungasan, Uluwatu, and the team also comes to villas across the Uluwatu area. Every session follows the approach [Ginny](/therapist/ginny/) built the studio on: listen first, then work on what your body is actually telling us.",
    },
    { type: "heading", level: 2, text: "How We Approach Sports Massage" },
    /* Three cards on the scannable layout, two points each, grouped by
       `COLUMN_GROUPS` in `lib/seo/layouts.ts`. */
    {
      type: "columns",
      items: [
        "Every session opens with what you have been doing, where you feel it and when you next plan to surf or train.",
        "The focus and the pressure follow from that, and change as your body responds.",
        "Deeper massage where a muscle needs it, assisted stretching and mobility work where a joint has stiffened up.",
        "A tight area is released, then taken through its range, so you leave moving better rather than only feeling looser.",
        "Simple things to do on your own, so the work holds until your next session.",
        "A rhythm that fits your stay: midway through a surf trip, or weekly on a longer one.",
      ],
    },
    { type: "heading", level: 2, text: "Built Around How You Train" },
    {
      type: "paragraph",
      text: "Where the work goes depends on what you have been doing. For surfers and anyone training hard, it usually means:",
    },
    {
      type: "list",
      items: [
        "**Paddling shoulders:** lats, rotator cuff, upper traps and neck, after a run of long sessions or a big swell.",
        "**Lower back and hips:** the arch you hold to paddle and the load of every pop-up, worked as one chain rather than only where it aches.",
        "**Legs:** calves, hamstrings, quads and glutes after hiking, running or a heavy training block.",
        "**Before a comp or a big swell:** shorter and lighter, so you paddle out loose rather than heavy.",
        "**Long-standing tightness:** slower, deeper work with stretching and mobility built in, often over more than one session.",
      ],
    },
  ],
};

export default copy;
