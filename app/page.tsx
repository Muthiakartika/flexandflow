import type { Metadata } from "next";

import BookClose from "@/sections/home/BookClose";
import Faqs from "@/sections/home/Faqs";
import Gallery from "@/sections/home/Gallery";
import Hero from "@/sections/home/Hero";
import Practitioners from "@/sections/home/Practitioners";
import Session from "@/sections/home/Session";
import Tiers from "@/sections/home/Tiers";
import Treatments from "@/sections/home/Treatments";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Flex and Flow - Assisted Stretching Studio",
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Flex and Flow - Assisted Stretching Studio",
    description: siteConfig.description,
    url: "/",
    type: "website",
    images: ["/images/2023/09/slider-png-01.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Practitioners />
      <Tiers />
      <Treatments />
      <Session />
      <Gallery />
      <Faqs />
      <BookClose />
    </>
  );
}
