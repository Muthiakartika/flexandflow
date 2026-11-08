/**
 * The copy of /uluwatu-bali/cupping-therapy/, in place of the panel's. See
 * ./index.ts and the voice notes in ./sport-massage.ts. Facts from the panel
 * copy (controlled suction, hygiene, use alongside massage) and the page's
 * own sections (30-minute dry cupping, studio or villa).
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "Dry cupping for knotted backs and tight shoulders, 30 minutes on its own or added to a massage, at the studio or your villa.",
  body: [
    {
      type: "paragraph",
      text: "Cupping works by lifting rather than pressing. The suction draws the skin and the tissue beneath it up into the cup and brings blood to the area, which suits spots that stay tight through even a firm massage, like the upper back after a run of paddling.",
    },
    {
      type: "paragraph",
      text: "Sessions are 30 minutes of dry cupping, on their own or added to a sports massage, at our studio in Ungasan or at your villa in the Uluwatu area. The round marks it leaves are normal and fade over the following days.",
    },
    { type: "heading", level: 2, text: "How We Approach Cupping" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "We start with where you hold tension and what you have been doing.",
        "Cups go on the areas that need them, not in a set pattern.",
        "Professional equipment and proper hygiene, every session.",
        "Your therapist explains what you will feel before the first cup goes on.",
        "Add it to a sports massage or a stretching session for a fuller reset.",
        "Or book it on its own when one area needs the attention.",
      ],
    },
    { type: "heading", level: 2, text: "Where Cupping Earns Its Place" },
    {
      type: "list",
      items: [
        "**Upper back and shoulders:** the knots between the shoulder blades that paddling and desk work build.",
        "**Lower back:** broad muscles where several cups can work at once.",
        "**Thighs and glutes:** after hiking, running or a heavy leg day.",
        "**After training or surfing:** a practical add-on when muscles feel worked rather than injured.",
      ],
    },
  ],
};

export default copy;
