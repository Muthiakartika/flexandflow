import type { Metadata } from "next";

import StickyBookBar from "@/components/content/StickyBookBar";
import { listServices } from "@/lib/cms/read";
import { formatIdr, lowestHourlyRate } from "@/lib/pricing";
import Approach from "@/sections/home/Approach";
import Faqs from "@/sections/home/Faqs";
import Gallery from "@/sections/home/Gallery";
import Guides from "@/sections/home/Guides";
import Hero from "@/sections/home/Hero";
import Reviews from "@/sections/home/Reviews";
import Treatments from "@/sections/home/Treatments";
import WhoTreatsYou from "@/sections/home/WhoTreatsYou";

import "./home.css";

/* Search-facing only, and kept with the h1 when the page copy was rewritten. Aimed
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
 * Home page, in the language of the redesigned treatment pages.
 *
 * The order is the visitor's own: what this is and what it costs, the
 * treatments with their rates, how an hour runs, who does the work, what
 * Google's reviewers say, the room (or the villa), the questions. The footer
 * is the booking sign-off, as on a treatment page, so the olive `BookClose`
 * band no longer sits on top of it; on a phone `StickyBookBar` keeps one
 * booking button in reach once the hero has gone. Copy is written for
 * clients who already know what they are booking (DESIGN.md, copy rule).
 */
export default async function HomePage() {
  const services = await listServices();
  const from = lowestHourlyRate(services);

  return (
    <>
      <Hero from={from} />
      <Treatments services={services} />
      <Approach />
      <WhoTreatsYou services={services} />
      <Reviews />
      <Gallery />
      <Guides />
      <Faqs />
      <StickyBookBar from={from !== null ? formatIdr(from) : null} />
    </>
  );
}
