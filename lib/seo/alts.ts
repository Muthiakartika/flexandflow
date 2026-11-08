/**
 * What each studio photo shows, for its `alt` text where it is content: a
 * treatment page's or a guide's main photo, the photos in an article's margin
 * and the home page's studio mosaic. Written from the photos themselves
 * (8 Nov 2026), so they say what is in the frame rather than repeat the
 * page's heading.
 *
 * Small card thumbnails stay `alt=""` on purpose: each sits inside a link
 * whose text already names the treatment or guide, and a screen reader would
 * read the name twice. The same goes for portraits beside a printed name.
 *
 * Keys are the `src` the page renders: a path under `public/`, or the full
 * URL for a photo on the media host. A photo missing here renders with an
 * empty alt, which `npm run check:seo` reports for the main photos.
 */
export const IMAGE_ALT: Record<string, string> = {
  // ── Treatments ───────────────────────────────────────────────────────────
  "/images/2026/08/assisted-stretching.jpg":
    "A Flex & Flow therapist guiding a client through a lying hip and back stretch on a green mat",
  "/images/2026/08/sport-massage.jpg":
    "A therapist working her forearm into a client's shoulder during a sports massage",
  "/images/2025/02/Cupping-Therapy-new-warm.jpg":
    "Four glass cups on a client's upper back during cupping therapy",
  "/images/2026/08/lymphatic-drainage.jpg":
    "A therapist's hands moving gently over a client's stomach during lymphatic drainage massage",
  "/images/2026/08/trauma-healing-new.jpg":
    "A therapist resting her hands on the shoulders and chest of a client lying under a dark blanket",
  "/images/2025/11/Lymphatic-Detox-Massage-for-Men.jpg":
    "A therapist massaging a man's neck and shoulder",
  "/images/2026/11/pregnancy-massage-side-lying.jpg":
    "A Flex & Flow therapist massaging the back of a pregnant client lying on her side, a sarong over her legs",
  "/images/2026/11/pregnancy-massage-hips.jpg":
    "A Flex & Flow therapist's hands on the hip and bump of a pregnant client lying on her side, a rolled towel under her",
  "/images/2026/11/pregnancy-massage-legs.jpg":
    "A Flex & Flow therapist working on a client's calf with both hands, her leg resting on a rolled towel",
  "/images/2026/08/home-service.jpg":
    "A therapist working on a client's neck and upper back on a portable massage table",
  "/images/2026/08/about-studio.jpg":
    "The Flex & Flow studio in Ungasan: a wooden floor, a surfboard against the wall and the studio logo painted in green",

  // ── Guides ───────────────────────────────────────────────────────────────
  "https://media.flexandflow.fit/uploads/a192dd465696-surfing-injuries-ed8fe79c.jpg":
    "A gloved hand cleaning a cut on a surfer's knee on the beach, a first aid kit beside him",
  "/images/2026/05/how-to-make-sitting-too-long-less-painful.png":
    "A woman stretching her arms overhead beside her desk and laptop in a bright home office",
  "/images/2025/03/physiotherapy.jpg":
    "A therapist stretching a client's shoulder and arm as he lies on a green mat",
  "/images/2025/01/yoga-in-uluwatu.jpg":
    "A group of women in a seated butterfly stretch on yoga mats in a bright studio",
  "/images/2025/01/Physical-Theraphy-new.jpg":
    "A therapist drawing a seated client's arms back to stretch his chest and shoulders",
  "/images/2025/01/flexibilty-Training-new.jpg":
    "The studio's movement room: a green mat on a wooden floor in front of two mirrors",
  "https://media.flexandflow.fit/uploads/c7e5110c22b3-lymphatic-drainage-164384c2.jpg":
    "A therapist's hands on the neck and collarbone of a woman lying on a massage table",

  // ── The studio and sessions (margins and the home mosaic) ────────────────
  "/images/2026/08/gallery-1.jpg":
    "The Flex & Flow studio: a folded mat on a wooden floor, mirrors and the logo on the wall under a lime-green ceiling",
  "/images/2026/08/gallery-2.jpg": "A therapist's hands pressing into a client's upper back",
  "/images/2026/08/gallery-3.jpg": "A Flex & Flow therapist supporting a client's head as she works on his neck and shoulder",
  "/images/2026/08/gallery-4.jpg": "A therapist's hands on the face and jaw of a client lying with her eyes closed",
  "/images/2026/08/gallery-5.jpg": "A treatment room with a massage table and rolled towels",
  "/images/2026/08/gallery-6.jpg":
    "The movement room at the studio: mats on a wooden floor, mirrors and a lime-green ceiling",
  "/images/2026/06/studio-new.jpg": "The Flex & Flow logo painted on the studio wall",
  "/images/2026/08/ginny-session.jpg": "Ginny working on a client's neck and shoulders",
  "/images/2026/08/yuni-session.jpg": "Yuni working with a client",
  "/images/2026/06/theraphy-section-ginny.jpg":
    "A therapist stretching a seated client's arms back on a mat in the studio",
  "/images/2025/02/sport-massage-new-warm.jpg":
    "A therapist pressing her fingers into the muscles beside a client's shoulder blade",
  "/images/2026/08/book-close.jpg": "A Flex & Flow therapist concentrating as she works on a client",
  "/images/2026/08/trauma-healing.jpg": "A therapist resting her hands on a client lying under a dark blanket",
  "/images/2026/08/complete-wellness.jpg":
    "A therapist pressing on a client's hip as she lies on her side on a green mat",
  "/images/2025/02/assistant-stretch-new-.jpg":
    "A therapist stretching a client's back and shoulders over her knee on a green mat",
  "/images/2026/08/private-therapy.jpg": "A one-to-one session in progress at the studio",
  "/images/2026/08/private-therapy-inset.jpg":
    "A therapist pressing a client's raised leg back into a deep hip stretch on a green mat",
};

/** The alt text for a content photo, or `""` when it has none written. */
export function altFor(src: string | undefined): string {
  return src ? (IMAGE_ALT[src] ?? "") : "";
}
