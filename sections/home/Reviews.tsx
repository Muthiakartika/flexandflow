import Link from "next/link";

import { Stars } from "@/components/content/ReviewsBand";
import { FOCUS_ON_OLIVE, WRAP } from "@/components/ui/tokens";
import { GOOGLE_REVIEWS, REVIEW_TOPICS } from "@/lib/seo/reviews";

/* Each treatment's own topic (the first in its list), once, with the page it
   belongs to: the men's lymphatic page shares drainage's topic, so the chip
   goes to drainage, listed first. */
const topics = Object.entries(REVIEW_TOPICS)
  .flatMap(([href, [own]]) => (own ? [{ ...own, href }] : []))
  .filter((t, i, all) => all.findIndex((u) => u.topic === t.topic) === i)
  .sort((a, b) => b.count - a.count);

/**
 * The studio's Google rating as the page's one olive region: the score large,
 * the count, and the treatments reviewers mention most as chips that open
 * each treatment. Google's own tally only (`lib/seo/reviews.ts`); the review
 * text stays on Google, where it belongs to the people who wrote it.
 *
 * It replaces the olive `BookClose` band at the end of the page, which now
 * sat directly over the footer's own booking sign-off.
 */
export default function Reviews() {
  return (
    <section className={WRAP} aria-labelledby="home-reviews">
      <div className="home-reviews">
        <div className="home-reviews-score">
          <p className="page-label">Google reviews</p>
          <p className="mt-3 flex items-center gap-4">
            <span className="home-reviews-num">{GOOGLE_REVIEWS.rating.toFixed(1)}</span>
            <span>
              <Stars size={18} />
              <span className="mt-1.5 block font-body text-[14px] text-white/85">
                from {GOOGLE_REVIEWS.count} reviews
              </span>
            </span>
          </p>
        </div>

        <div>
          <h2
            id="home-reviews"
            className="text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)] leading-[1.06] font-bold text-white"
          >
            What Reviewers Mention Most
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.topic}>
                <Link href={t.href} className={`home-reviews-chip ${FOCUS_ON_OLIVE}`}>
                  {t.topic}
                  <span>
                    {t.count}
                    <span className="sr-only"> reviews</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={GOOGLE_REVIEWS.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-5 inline-block font-body text-[14px] text-white transition-colors duration-300 hover:text-white/70 ${FOCUS_ON_OLIVE}`}
          >
            Read them on Google &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
