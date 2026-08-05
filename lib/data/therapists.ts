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
    portrait: "/images/2023/10/Ginny-1.jpg",
    sceneImage: "/images/2023/10/ginnys-theraphy-section-new.jpg",
    specializedIn:
      "Bodywork Therapy • Healing Massage • Sports Massage • Assisted Stretching • Lymphatic Drainage",
    about: [
      "I am a specialist bodywork and healing therapist with a strong fitness background and Active IQ Level 2 & 3 certifications.",
      "I combine movement and energy-based techniques to support deep physical and emotional release. My approach integrates trauma-informed healing massage, sports massage, assisted stretching, and lymphatic drainage.",
      "My sessions are designed to be grounding, restorative, and tailored to each client’s unique needs.",
    ],
    approach:
      "Integrating fitness-based techniques with intuitive healing to support recovery, flexibility, and emotional release.",
    instagram: "https://www.instagram.com/ginnyasih?igsh=MW9saGJoZDExbGc5NA==",
    hours: "Monday to Friday : 08:00 - 17:00 hrs",
    seoTitle: "Ginny - Flex and Flow",
  },
  {
    slug: "yuni",
    name: "Yuni",
    role: "Javanese Massage & Lymphatic Specialist",
    teamRole: "Javanese Massage Therapist",
    portrait: "/images/2023/10/Yuni.jpg",
    sceneImage: "/images/2025/11/yunis-theraphy-section.jpg",
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
