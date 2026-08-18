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
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Flex and Flow - Wellness Studio",
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Flex and Flow - Wellness Studio",
    description: siteConfig.description,
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
