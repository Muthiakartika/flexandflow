/**
 * The copy of /uluwatu-bali/trauma-healing/, in place of the panel's. See
 * ./index.ts and the voice notes in ./sport-massage.ts. The panel's copy
 * here was already careful; this keeps every fact and every caution in it
 * (physical bodywork, not mental health care; boundaries; preparation; why
 * the price differs; limited sessions) and tightens the rest.
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "Slow, deep bodywork for tension that has been held for years, at our studio in Ungasan. A limited number of sessions.",
  body: [
    {
      type: "paragraph",
      text: "Trauma healing is deep, slow bodywork for tension a standard massage never reaches: shoulders, hips, back and neck that have been tight for years. The pressure is sustained, the pace unhurried, and the session is guided by how your body responds, minute by minute.",
    },
    {
      type: "paragraph",
      text: "It draws on traditional Javanese bodywork and years of sports massage and assisted stretching at the studio. It is physical work, not psychological therapy, and you never need to talk about personal experiences unless you choose to.",
    },
    { type: "heading", level: 2, text: "How a Session Works" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "Your physical history, your boundaries and any areas to leave alone.",
        "Nothing personal unless you choose to share it.",
        "Sustained pressure through the areas that hold the most tension.",
        "Pace and pressure adjust as your body responds. Say so any time it is too much.",
        "Strong sensations, tenderness or tiredness afterwards are normal.",
        "Leave yourself time to rest once the session ends.",
      ],
    },
    { type: "heading", level: 2, text: "Before You Book" },
    {
      type: "list",
      items: [
        "**Skip alcohol:** before your appointment.",
        "**Eat light:** enough to be comfortable lying down for the session.",
        "**Wear something easy:** clothes you can change in and out of quickly.",
        "**Tell us first:** recent injuries, surgery, pain or medical concerns.",
        "**Plan to rest:** especially if deeper bodywork is new to you.",
      ],
    },
    { type: "heading", level: 2, text: "Why It Is Priced Differently" },
    {
      type: "paragraph",
      text: "Each session takes more preparation, slower hands-on work and extra time before and after, and the number of these sessions is kept small so each one gets full attention. If you are unsure whether it suits you, message us before booking.",
    },
  ],
};

export default copy;
