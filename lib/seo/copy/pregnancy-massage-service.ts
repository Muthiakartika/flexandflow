/**
 * The copy of /uluwatu-bali/pregnancy-massage-service/, in place of the
 * panel's. See ./index.ts and the voice notes in ./sport-massage.ts. Facts
 * from the panel copy (gentle controlled pressure, supportive positioning,
 * adapted by stage, studio or home service) and the page's own sections
 * (90 minutes; Ginny's nursing background). The page's photo is in
 * `lib/seo/photos.ts`.
 */
import type { PageCopy } from "./index";

const copy: PageCopy = {
  excerpt:
    "Gentle, carefully positioned massage for each stage of pregnancy, 90 minutes at our studio in Ungasan or at your villa.",
  body: [
    {
      type: "paragraph",
      text: "Pregnancy changes where the body carries its weight, and with it where it aches: the lower back, the hips, tired legs and swollen feet. Our pregnancy massage works on exactly those areas, with light, controlled pressure and positioning that keeps you comfortable and supported throughout.",
    },
    {
      type: "paragraph",
      text: "Every session is 90 minutes, at the studio in Ungasan or at your villa in the Uluwatu area if you would rather not travel. Sessions are with one of our therapists, or with our founder [Ginny](/therapist/ginny/), whose background is in nursing; her own diary is limited.",
    },
    { type: "heading", level: 2, text: "How We Approach Pregnancy Massage" },
    /* Three cards on the scannable layout, grouped by `COLUMN_GROUPS`. */
    {
      type: "columns",
      items: [
        "We ask how far along you are and how you are feeling before we start.",
        "Pressure, focus and positioning change with each stage of pregnancy.",
        "Positioned and cushioned so you can relax, with no strain on the bump.",
        "Gentle, controlled pressure rather than deep work.",
        "Pressure adjusted the moment you ask.",
        "Calm, private and unhurried, start to finish.",
      ],
    },
    { type: "heading", level: 2, text: "Where the Session Focuses" },
    {
      type: "list",
      items: [
        "**Lower back:** the ache that grows as the bump does.",
        "**Hips and glutes:** tightness from carrying, and from sleeping on one side.",
        "**Shoulders and neck:** tension from a changing posture.",
        "**Legs and feet:** heavy legs and puffy ankles, worked with lighter strokes.",
      ],
    },
    {
      type: "image",
      src: "/images/2026/11/pregnancy-massage-hips.jpg",
      alt: "A Flex & Flow therapist's hands on the hip and bump of a pregnant client lying on her side, a rolled towel under her",
      width: 1376,
      height: 768,
    },
  ],
};

export default copy;
