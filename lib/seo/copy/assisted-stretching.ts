/**
 * The copy of /uluwatu-bali/assisted-stretching/, in place of the panel's.
 * See ./index.ts and the voice notes in ./sport-massage.ts. Facts from the
 * panel copy (PNF, myofascial release, home service) and Ginny's profile.
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "One-to-one assisted stretching for tight hips, hamstrings and shoulders, at our studio in Ungasan or at your villa in Uluwatu.",
  body: [
    {
      type: "paragraph",
      text: "Assisted stretching takes you into ranges you cannot reach on your own. Your therapist holds and moves each limb, so the muscle can let go instead of guarding, and the stretch goes further than it ever does alone on a mat.",
    },
    {
      type: "paragraph",
      text: "We use PNF, where you press gently against the stretch and then relax deeper into it, alongside myofascial release for areas that feel stuck. The studio is in Ungasan, Uluwatu, and the team also comes to villas across the Uluwatu area.",
    },
    { type: "heading", level: 2, text: "How We Approach Assisted Stretching" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "We start with how you move: what feels tight, what you train and where you want more range.",
        "Every stretch is set to your range today, then taken further as the session goes.",
        "Your therapist supports and controls each stretch, so you can relax into positions you could not hold alone.",
        "PNF where a muscle guards, myofascial release where an area feels stuck.",
        "A few stretches to keep doing between sessions.",
        "Regular sessions keep movement easier over time, instead of starting from stiff each visit.",
      ],
    },
    { type: "heading", level: 2, text: "Where Most of the Work Goes" },
    {
      type: "paragraph",
      text: "Every body is different, but the work tends to centre on:",
    },
    {
      type: "list",
      items: [
        "**Hips and hip flexors:** tight from sitting, surfing and running, and often behind an aching lower back.",
        "**Hamstrings and calves:** the backs of the legs, for anyone who can no longer reach the floor with straight knees.",
        "**Shoulders and upper back:** shortened by paddling, desk work and overhead training.",
        "**Spine and rotation:** gentle twists for a back that has stopped turning freely.",
        "**Around training:** lighter stretching before a session, longer holds after one.",
      ],
    },
  ],
};

export default copy;
