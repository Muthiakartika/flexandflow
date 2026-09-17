/**
 * Therapist profiles. These pages are linked from the About page but excluded
 * from the WordPress sitemap; copy is reproduced verbatim.
 */
export type Therapist = {
  slug: string;
  name: string;
  /** Role shown under the name on the About page and profile. */
  role: string;
  /** Shorter role label used in the About page team grid. */
  teamRole: string;
  portrait: string;
  sceneImage: string;
  specializedIn: string;
  about: string[];
  approach: string;
  instagram?: string;
  hours: string;
  seoTitle: string;
};

export const therapists: Therapist[] = [
  {
    slug: "ginny",
    name: "Ginny",
    role: "Founder & Bodywork Specialist",
    teamRole: "Founder & Bodywork Specialist",
    portrait: "/images/2026/08/ginny-portrait.jpg",
    sceneImage: "/images/2026/08/ginny-session.jpg",
    specializedIn:
      "Bodywork Therapy • Healing Massage • Sports Massage • Assisted Stretching • Lymphatic Drainage",
    about: [
      "I’m the founder of Flex&Flow, with a background in nursing, professional fitness training, and bodywork.",
      "My approach developed through years of working with clients dealing with stiffness, restricted movement, muscular tension, demanding lifestyles, sports-related tightness, and recovery needs. It was also shaped by my own experience with injury and the frustration of not finding recovery work that paid enough attention to the details.",
      "That experience changed the way I work with people. I take time to listen, pay close attention to what your body is telling me, and adjust my focus before deciding how to approach each session.",
    ],
    approach:
      "I combine assisted stretching, therapeutic massage, movement-based techniques, and recovery work, with each session guided by what I observe and what you tell me.",
    instagram: "https://www.instagram.com/ginnyasih?igsh=MW9saGJoZDExbGc5NA==",
    hours: "Monday to Friday : 08:00 - 17:00 hrs",
    seoTitle: "Ginny - Flex and Flow",
  },
  {
    slug: "yuni",
    name: "Yuni",
    role: "Javanese Massage & Lymphatic Specialist",
    teamRole: "Javanese Massage Therapist",
    portrait: "/images/2026/08/yuni-portrait.jpg",
    sceneImage: "/images/2026/08/yuni-session.jpg",
    specializedIn:
      "Traditional Javanese Massage • Lymphatic Drainage • Deep Relaxation",
    about: [
      "I am an experienced Javanese massage therapist, passionate about sharing the authentic art of Indonesian healing. My sessions combine traditional techniques with modern understanding of the body to help you release tension, improve circulation, and restore balance.",
    ],
    approach:
      "Integrating fitness-based techniques with intuitive healing to support recovery, flexibility, and emotional release.",
    hours: "Monday to Friday : 08:00 - 17:00 hrs",
    seoTitle: "Yuni - Flex and Flow",
  },
];

export const therapistBySlug = new Map(therapists.map((t) => [t.slug, t]));
