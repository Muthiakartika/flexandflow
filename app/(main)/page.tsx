import type { Metadata } from "next";

import BookClose from "@/sections/common/BookClose";
import CompleteWellness from "@/sections/home/CompleteWellness";
import Faqs from "@/sections/home/Faqs";
import Gallery from "@/sections/home/Gallery";
import Hero from "@/sections/home/Hero";
import Practitioners from "@/sections/home/Practitioners";
import PrivateTherapy from "@/sections/home/PrivateTherapy";
import ServiceTicker from "@/sections/home/ServiceTicker";
import Treatments from "@/sections/home/Treatments";
/* Search-facing only — the page's own headings and copy are untouched. Aimed
   at "massage uluwatu" (600 searches a month in Indonesia, KD 12 — Ahrefs,
   2026-10-27), the largest query this studio can realistically win and one
   the old WordPress title ("Flex and Flow - Wellness Studio") never named. */
const title = "Massage & Bodywork Studio in Uluwatu, Bali - Flex and Flow";
const description =
  "Private massage, assisted stretching and recovery bodywork in Uluwatu, " +
  "Bali. One-to-one sessions with expert therapists, at our studio or your villa.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    type: "website",
    images: ["/images/2023/09/slider-png-01.png"],
  },
};

/**
 * Home page, 2026 redesign.
 *
 * The order is the visitor's own sequence: what this is and what it costs, the
 * range on offer, what an hour actually involves, who performs it, the room,
 * the questions, then the hand-off to WhatsApp. Every heading and paragraph is
 * the studio's own copy — the redesign moves structure, not words.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ServiceTicker />
      <Treatments />
      <PrivateTherapy />
      <CompleteWellness />
      <Practitioners />
      <Gallery />
      <Faqs />
      <BookClose />
    </>
  );
}
