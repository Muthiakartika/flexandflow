/**
 * How the scannable layout groups a page's two-column bullet list into
 * cards, each under a short title.
 *
 * `first` is the start of the list's first point, so the grouping applies
 * only to the list it was written for. If that list is rewritten (in the
 * panel or in `lib/seo/copy`) and the grouping is not, the match fails and
 * the page falls back to plain benefit cards.
 * `items` are zero-based positions in the panel's list.
 */
export type ColumnGroups = {
  first: string;
  groups: { title: string; items: number[] }[];
};

export const COLUMN_GROUPS: Record<string, ColumnGroups> = {
  "/uluwatu-bali/outcall-home-service-massage/": {
    first: "Villas, hotels and homes across the Uluwatu area",
    groups: [
      { title: "Where we come", items: [0, 1] },
      { title: "What we bring", items: [2, 3] },
      { title: "Easy to book", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/assisted-stretching/": {
    first: "We start with how you move",
    groups: [
      { title: "Assessed first", items: [0, 1] },
      { title: "Hands-on and controlled", items: [2, 3] },
      { title: "Built to last", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/cupping-therapy/": {
    first: "We start with where you hold tension",
    groups: [
      { title: "Placed with purpose", items: [0, 1] },
      { title: "Clean and careful", items: [2, 3] },
      { title: "On its own or paired", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/lymphatic-drainage/": {
    first: "We start with where you feel heavy",
    groups: [
      { title: "Mapped first", items: [0, 1] },
      { title: "Light on purpose", items: [2, 3] },
      { title: "Focused or full body", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": {
    first: "A short consultation on where you feel heavy",
    groups: [
      { title: "Talk first", items: [0, 1] },
      { title: "Full body", items: [2, 3] },
      { title: "Face, scalp and neck", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/pregnancy-massage-service/": {
    first: "We ask how far along you are",
    groups: [
      { title: "Adapted to your stage", items: [0, 1] },
      { title: "Supported throughout", items: [2, 3] },
      { title: "Easy to speak up", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/trauma-healing/": {
    first: "Your physical history, your boundaries",
    groups: [
      { title: "Talk first", items: [0, 1] },
      { title: "Slow, deep work", items: [2, 3] },
      { title: "Time after", items: [4, 5] },
    ],
  },
  "/uluwatu-bali/sport-massage/": {
    first: "Every session opens with what you have been doing",
    groups: [
      { title: "Assessed first", items: [0, 1] },
      { title: "Massage and stretching together", items: [2, 3] },
      { title: "Between sessions", items: [4, 5] },
    ],
  },
};

/** The grouping, when it covers exactly the list it was written for. */
export function groupsFor(items: string[], layout: ColumnGroups | undefined) {
  if (!layout || !items[0]?.startsWith(layout.first)) return null;
  const used = layout.groups.flatMap((group) => group.items).sort((a, b) => a - b);
  const complete = used.length === items.length && used.every((n, i) => n === i);
  return complete ? layout.groups : null;
}

/** One photo in the right margin beside a pilot article (`RailPhotos`). */
export type RailPhoto = {
  src: string;
  width: number;
  height: number;
  /** A few words on the photo's tag. */
  caption: string;
  /** `object-position` for the tall crop, when the subject is off centre. */
  position?: string;
};

/**
 * The tall photos beside each pilot article, one per section in the order
 * of its h2s: the reader sees the photo for the section they are reading.
 * Fewer photos than sections and the last one stays for the rest.
 */
export const RAIL_PHOTOS: Record<string, RailPhoto[]> = {
  "/uluwatu-bali/outcall-home-service-massage/": [
    { src: "/images/2026/08/yuni-session.jpg", width: 1800, height: 1800, caption: "Same team, your space", position: "22% center" },
    { src: "/images/2026/08/gallery-2.jpg", width: 1800, height: 900, caption: "Pressure set to you", position: "40% center" },
    { src: "/images/2026/11/pregnancy-massage-legs.jpg", width: 1376, height: 768, caption: "Tired legs, light strokes", position: "40% center" },
    { src: "/images/2026/08/gallery-4.jpg", width: 1200, height: 857, caption: "Unhurried, start to finish", position: "50% center" },
    { src: "/images/2026/08/ginny-session.jpg", width: 1800, height: 1800, caption: "The studio's approach", position: "30% center" },
  ],
  "/uluwatu-bali/assisted-stretching/": [
    { src: "/images/2026/08/private-therapy-inset.jpg", width: 800, height: 1000, caption: "Every stretch supported" },
    { src: "/images/2025/02/assistant-stretch-new-.jpg", width: 1300, height: 1200, caption: "Further than you go alone", position: "45% center" },
    { src: "/images/2026/08/private-therapy.jpg", width: 1920, height: 1536, caption: "Hips and hamstrings", position: "42% center" },
    { src: "/images/2026/08/complete-wellness.jpg", width: 1920, height: 1536, caption: "Room to move", position: "38% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  "/uluwatu-bali/cupping-therapy/": [
    { src: "/images/2026/08/gallery-2.jpg", width: 1800, height: 900, caption: "Where the tension sits", position: "40% center" },
    { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900, caption: "Clean, calm, private", position: "45% center" },
    { src: "/images/2026/08/book-close.jpg", width: 1600, height: 1200, caption: "Our therapists", position: "38% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  "/uluwatu-bali/lymphatic-drainage/": [
    { src: "/images/2026/08/gallery-4.jpg", width: 1200, height: 857, caption: "Light, rhythmic, close to the skin", position: "50% center" },
    { src: "/images/2026/08/yuni-session.jpg", width: 1800, height: 1800, caption: "Yuni, our lymphatic specialist", position: "22% center" },
    { src: "/images/2026/08/gallery-3.jpg", width: 1200, height: 857, caption: "Unhurried, start to finish", position: "55% center" },
    { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900, caption: "A calm room", position: "45% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  "/uluwatu-bali/lymphatic-detox-massage-for-men/": [
    { src: "/images/2026/08/trauma-healing.jpg", width: 1920, height: 1080, caption: "A full-body session", position: "50% center" },
    { src: "/images/2026/08/yuni-session.jpg", width: 1800, height: 1800, caption: "Yuni, our lymphatic specialist", position: "22% center" },
    { src: "/images/2026/08/gallery-4.jpg", width: 1200, height: 857, caption: "Face, scalp and neck", position: "50% center" },
    { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900, caption: "A calm room", position: "45% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  /* The studio's own pregnancy photos are the hero and two photos in the
     copy, so the margins carry the studio's other photos: nothing twice. */
  "/uluwatu-bali/pregnancy-massage-service/": [
    { src: "/images/2026/08/gallery-2.jpg", width: 1800, height: 900, caption: "Gentle, controlled pressure", position: "40% center" },
    { src: "/images/2026/08/ginny-session.jpg", width: 1800, height: 1800, caption: "Shoulders and neck, too", position: "30% center" },
    { src: "/images/2026/08/home-service.jpg", width: 1920, height: 1080, caption: "Or at your villa", position: "55% center" },
    { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900, caption: "Calm and private", position: "45% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  "/uluwatu-bali/trauma-healing/": [
    { src: "/images/2026/08/trauma-healing.jpg", width: 1920, height: 1080, caption: "Slow, sustained work", position: "50% center" },
    { src: "/images/2026/08/ginny-session.jpg", width: 1800, height: 1800, caption: "Paced to your body", position: "30% center" },
    { src: "/images/2026/08/gallery-3.jpg", width: 1200, height: 857, caption: "Time and attention", position: "55% center" },
    { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900, caption: "A private room", position: "45% center" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
  /* Not the hero's photo or the two in the studio-or-villa pair: nothing
     on screen twice. Five photos for six sections; the FAQ keeps the last. */
  "/uluwatu-bali/sport-massage/": [
    { src: "/images/2026/08/ginny-session.jpg", width: 1800, height: 1800, caption: "Listen first, then work", position: "30% center" },
    { src: "/images/2025/02/sport-massage-new-warm.jpg", width: 1300, height: 1200, caption: "Shoulders after a week of paddling", position: "45% center" },
    { src: "/images/2026/08/yuni-session.jpg", width: 1800, height: 1800, caption: "Our therapists", position: "22% center" },
    { src: "/images/2026/06/theraphy-section-ginny.jpg", width: 430, height: 700, caption: "The studio · Ungasan" },
    { src: "/images/2026/06/studio-new.jpg", width: 1300, height: 1200, caption: "Stretch · Release · Recover", position: "50% center" },
  ],
};
