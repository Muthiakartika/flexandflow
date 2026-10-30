import Image from "next/image";
import Link from "next/link";

import BlogSidebar from "@/components/blog/BlogSidebar";
import PageHero from "@/components/ui/PageHero";
import { BAND, FOCUS, WRAP } from "@/components/ui/tokens";
import { POST_AUTHOR } from "@/lib/structured-data";
import RichText from "./RichText";
import type { Post } from "@/types";

/** `2026-10-30` → "October 30, 2026", the format `post.date` already uses. */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Single blog post: featured image, body, prev/next, and the sidebar. */
export default function PostArticle({
  post,
  previous,
  next,
}: {
  post: Post;
  previous?: Post;
  next?: Post;
}) {
  return (
    <>
      <PageHero
        title={post.title}
        eyebrow={[
          post.date,
          post.updated ? `Updated ${longDate(post.updated)}` : null,
          post.categoryLabel ?? post.category,
        ]
          .filter(Boolean)
          .join(" · ")}
        crumbs={[
          { label: post.categoryLabel ?? post.category, href: `/${post.category}` },
          { label: post.title },
        ]}
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid grid-cols-1 gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
          <article className="min-w-0">
            {post.image ? (
              <Image
                src={post.image}
                alt=""
                aria-hidden
                width={1024}
                height={621}
                priority
                sizes="(max-width: 1023px) 92vw, 1024px"
                className="aspect-[16/8] w-full rounded-[10px] object-cover"
              />
            ) : null}

            <RichText blocks={post.body} className={post.image ? "mt-7" : ""} />

            {/* Who wrote it. The same person the BlogPosting markup credits,
                so the visible byline and the structured one agree. */}
            <aside
              aria-label="About the author"
              className="mt-10 flex items-start gap-4 rounded-[10px] border border-secondary/10 bg-white p-5"
            >
              <Image
                src={POST_AUTHOR.portrait}
                alt=""
                width={72}
                height={72}
                className="size-[72px] shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="page-label">About the author</p>
                <p className="mt-1.5 font-body text-[15px] leading-[1.7] text-body-text/80">
                  {POST_AUTHOR.about}
                </p>
                <Link
                  href={POST_AUTHOR.profile}
                  className={`mt-2 inline-block font-body text-[14px] font-bold text-primary-strong hover:text-secondary ${FOCUS}`}
                >
                  More about Ginny
                </Link>
              </div>
            </aside>

            {previous || next ? (
              <nav
                aria-label="Post navigation"
                className="mt-8 grid gap-3 border-t border-secondary/10 pt-7 sm:grid-cols-2"
              >
                {previous ? (
                  <Link
                    href={`/${previous.category}/${previous.slug}`}
                    rel="prev"
                    className={`rounded-[10px] border border-secondary/10 bg-white p-4 transition-colors duration-300 hover:border-primary/45 ${FOCUS}`}
                  >
                    <span className="page-label">Previous</span>
                    <span className="mt-2 block font-display text-[20px] leading-[1.15] font-bold">
                      {previous.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}

                {next ? (
                  <Link
                    href={`/${next.category}/${next.slug}`}
                    rel="next"
                    className={`rounded-[10px] border border-secondary/10 bg-white p-4 transition-colors duration-300 hover:border-primary/45 sm:text-right ${FOCUS}`}
                  >
                    <span className="page-label">Next</span>
                    <span className="mt-2 block font-display text-[20px] leading-[1.15] font-bold">
                      {next.title}
                    </span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </article>

          <BlogSidebar />
        </div>
      </section>
    </>
  );
}
