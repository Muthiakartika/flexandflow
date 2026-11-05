/**
 * Home page FAQ copy.
 *
 * Rewritten in November 2026 for clients who already know the treatments
 * and are choosing where to book; the WordPress accordion's answers ("all
 * levels, from beginners to athletes") are in git history. Every claim is
 * one the studio's own pages make, and the fee and the hours are read from
 * `lib/site.ts`, never typed.
 */
import type { AccordionItem } from "@/components/ui/Accordion";
import { formatIdr } from "@/lib/pricing";
import { homeServiceFeeIdr, openingSchedule, workingHours } from "@/lib/site";

export const homeFaqs: AccordionItem[] = [
  {
    question: "The team or Ginny: what’s the difference?",
    answer:
      "The same approach either way. The team has the most open slots and is the easiest to book. Ginny founded the studio; her own sessions are limited and priced higher, so book those well ahead.",
  },
  {
    question: "Do you come to villas?",
    answer: `Yes, around Uluwatu, for every treatment except trauma healing, which stays at the studio. ${formatIdr(homeServiceFeeIdr)} is added to the session price per visit.`,
  },
  {
    question: "How long is a session?",
    answer:
      "Most run 60 minutes. Each treatment page lists its own lengths and rates, and the price list has all of them in one place.",
  },
  {
    question: "When are you open?",
    answer: `${workingHours[0].days}, ${openingSchedule.opens} to ${openingSchedule.closes}, Bali time.`,
  },
  {
    question: "How do I book?",
    answer:
      "Book a session online, or message us on WhatsApp with the treatment and a day and time that suit you.",
  },
  {
    question: "How often should I come?",
    answer:
      "That depends on what you are working on. Some clients come weekly; others book as needed, midway through a surf trip or after a heavy training block.",
  },
];
