import Image from "next/image";
import Link from "next/link";

import { CARD, FOCUS, LINK, WRAP } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/pricing";

export type RelatedTreatment = {
  href: string;
  title: string;
  image: string;
  /** The lowest priced tier, or null when the treatment shows no rates. */
  from: number | null;
};

export type RelatedPost = {
  href: string;
  title: string;
  image?: string;
  /** The post's category, shown over the title. */
  label: string;
};

/**
 * The end of a treatment page on the redesign: the other treatments and three
 * articles as photo cards, in place of the two text lists that used to sit
 * under the rates in the side column. Same links, same rotation (chosen in
 * `ServiceArticle`), so the internal-link spread is unchanged.
 *
 * Each row is a swipeable deck on a phone and a grid from 1024px; the CSS is
 * `.related-row` in `globals.css`.
 */
export default function RelatedBand({
  treatments,
  posts,
}: {
  treatments: RelatedTreatment[];
  posts: RelatedPost[];
}) {
  return (
    <section className={`${WRAP} pb-[clamp(2.75rem,5vw,4.5rem)]`}>
      <nav aria-labelledby="related-treatments">
        <Header
          id="related-treatments"
          title="Other Treatments"
          href="/services"
          link="All treatments & rates"
        />
        <ul className="related-row related-row-5">
          {treatments.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`${CARD} group flex h-full flex-col overflow-hidden ${FOCUS}`}
              >
                <span className="block overflow-hidden">
                  <Image
                    src={t.image}
                    alt=""
                    width={600}
                    height={450}
                    sizes="(max-width: 639px) 72vw, (max-width: 1023px) 40vw, 260px"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                </span>
                <span className="flex flex-1 items-end justify-between gap-3 p-4">
                  <span>
                    <span className="block font-display text-[24px] leading-[1.02] font-bold">
                      {t.title}
                    </span>
                    {t.from !== null ? (
                      <span className="mt-1.5 block font-body text-[13px] text-body-text/60 tabular-nums">
                        From {formatIdr(t.from)}
                      </span>
                    ) : null}
                  </span>
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {posts.length > 0 ? (
        <nav
          aria-labelledby="related-posts"
          className="mt-[clamp(2.25rem,4vw,3.25rem)]"
        >
          <Header
            id="related-posts"
            title="From the Blog"
            href="/blog"
            link="All articles"
          />
          <PostRow posts={posts} />
        </nav>
      ) : null}
    </section>
  );
}

/**
 * Articles as photo cards: a swipeable deck on a phone, three across from
 * 1024px (`.related-row` in `globals.css`). Used under every treatment
 * page and on the home page.
 */
export function PostRow({ posts }: { posts: RelatedPost[] }) {
  return (
    <ul className="related-row related-row-3">
      {posts.map((post) => (
        <li key={post.href}>
          <Link
            href={post.href}
            className={`${CARD} group flex h-full flex-col overflow-hidden ${FOCUS}`}
          >
            <span className="block overflow-hidden bg-secondary/5">
              {post.image ? (
                <Image
                  src={post.image}
                  alt=""
                  width={800}
                  height={500}
                  sizes="(max-width: 639px) 82vw, (max-width: 1023px) 44vw, 380px"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                />
              ) : (
                <span className="block aspect-[16/10]" />
              )}
            </span>
            <span className="flex flex-1 items-end justify-between gap-3 p-4">
              <span>
                <span className="page-label block">{post.label}</span>
                <span className="mt-1.5 block font-body text-[15px] leading-snug font-bold transition-colors duration-300 group-hover:text-primary">
                  {post.title}
                </span>
              </span>
              <Arrow />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Header({
  id,
  title,
  href,
  link,
}: {
  id: string;
  title: string;
  href: string;
  link: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2
        id={id}
        className="text-[clamp(1.875rem,1.5rem+1.2vw,2.5rem)] leading-none font-bold"
      >
        {title}
      </h2>
      <Link href={href} className={`${LINK} shrink-0 text-[14px]`}>
        {link}
      </Link>
    </div>
  );
}

/** The round olive arrow every card ends on; it fills on hover. */
function Arrow() {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/40 text-primary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
    >
      <svg
        viewBox="0 0 16 16"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8h9M8.5 4l4 4-4 4" />
      </svg>
    </span>
  );
}
