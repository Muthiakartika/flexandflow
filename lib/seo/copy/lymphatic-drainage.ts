/**
 * The copy of /uluwatu-bali/lymphatic-drainage/, in place of the panel's.
 * See ./index.ts and the voice notes in ./sport-massage.ts. Facts from the
 * panel copy (light rhythmic technique, puffiness, home service) and the
 * page's own sections (Yuni and Ginny, 60 and 90 minutes).
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "Light, rhythmic lymphatic work for legs that feel heavy, a puffy face after flights, and bodies that need a gentle reset.",
  body: [
    {
      type: "paragraph",
      text: "Lymphatic drainage is the opposite of deep tissue: slow, light, rhythmic strokes that work close to the skin, where the lymphatic vessels run, moving fluid towards the nodes that clear it. It is gentle by design, and most clients find it deeply calming.",
    },
    {
      type: "paragraph",
      text: "Sessions are with Yuni, our Javanese massage and lymphatic specialist, or with our founder [Ginny](/therapist/ginny/), whose own diary is limited. Book at the studio in Ungasan, or have it at your villa in the Uluwatu area.",
    },
    { type: "heading", level: 2, text: "How We Approach Lymphatic Drainage" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "We start with where you feel heavy or puffy, and anything we should know about your health.",
        "Strokes follow the body's drainage routes, towards the nodes, rather than a set routine.",
        "Pressure stays soft and rhythmic: circles, gentle glides and light stretching of the skin.",
        "No deep muscle work, so it suits the days your body wants rest.",
        "60 minutes for one area, such as legs after a long flight.",
        "90 minutes for a broader part of the body, at an unhurried pace.",
      ],
    },
    { type: "heading", level: 2, text: "When People Book It" },
    {
      type: "list",
      items: [
        "**After a long flight:** swollen ankles and legs that feel heavy from sitting.",
        "**Puffiness and fluid retention:** a face, legs or hands that hold water.",
        "**Recovery days:** a gentle session between harder training or surf days.",
        "**A calmer kind of bodywork:** care for the body without deep pressure.",
      ],
    },
  ],
};

export default copy;
