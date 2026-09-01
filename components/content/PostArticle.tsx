import Image from "next/image";
import Link from "next/link";

import BlogSidebar from "@/components/blog/BlogSidebar";
import PageHero from "@/components/ui/PageHero";
import { BAND, FOCUS, WRAP } from "@/components/ui/tokens";
import RichText from "./RichText";
import type { Post } from "@/types";

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
        eyebrow={`${post.date} · ${post.categoryLabel ?? post.category}`}
        crumbs={[
          { label: post.categoryLabel ?? post.category, href: `/${post.category}` },
          { label: post.title },
        ]}
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
          <article>
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
