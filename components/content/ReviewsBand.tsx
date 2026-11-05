import { GOOGLE_REVIEWS, type ReviewTopic } from "@/lib/seo/reviews";

/** Five olive stars, drawn rather than typed so they match the brand olive. */
export function Stars({ size = 14 }: { size?: number }) {
  return (
    <span aria-hidden className="inline-flex gap-0.5 text-primary">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" width={size} height={size} fill="currentColor">
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * The studio's Google rating at the point a visitor weighs the price: the
 * score large, the count, how many of those reviews are about this
 * treatment, and the related topics Google files them under, as chips. All
 * of it is Google's own tally (`lib/seo/reviews.ts`); the button goes to the
 * listing to read the reviews themselves.
 */
export default function ReviewsBand({ topics }: { topics: ReviewTopic[] }) {
  const [own, ...related] = topics;

  return (
    <div className="reviews-band">
      <div className="reviews-score">
        <span className="reviews-score-num">{GOOGLE_REVIEWS.rating.toFixed(1)}</span>
        <span>
          <Stars size={16} />
          <span className="reviews-score-count">{GOOGLE_REVIEWS.count} Google reviews</span>
        </span>
      </div>

      <div className="reviews-body">
        {own ? (
          <p className="reviews-lead">
            <strong>{own.count}</strong> of them mention {own.topic}.
          </p>
        ) : (
          <p className="reviews-lead">Read what clients say about the studio.</p>
        )}
        {related.length > 0 ? (
          <ul className="reviews-topics" aria-label="Other things reviewers mention">
            {related.map((t) => (
              <li key={t.topic}>
                {t.topic} <span>{t.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <a href={GOOGLE_REVIEWS.url} target="_blank" rel="noopener noreferrer" className="reviews-link">
          Read the reviews on Google &rarr;
        </a>
      </div>
    </div>
  );
}
