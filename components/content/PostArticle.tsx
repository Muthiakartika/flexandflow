import Image from "next/image";
import Link from "next/link";

import BlogSidebar from "@/components/blog/BlogSidebar";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import RichText from "./RichText";
import type { Post } from "@/types";

const categoryLabels: Record<Post["category"], string> = {
  "uluwatu-bali": "Uluwatu Bali",
  "injury-guide": "Injury Guide",
};

/** Single blog post: featured image, meta, body, prev/next, and the sidebar. */
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
        crumbs={[
          { label: categoryLabels[post.category], href: `/${post.category}` },
          { label: post.title },
        ]}
      />

      <section className="hero-gap-top pb-[80px]">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,320px)]">
            <article>
              {post.image ? (
                <Reveal>
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={1024}
                    height={621}
                    priority
                    sizes="(max-width: 1023px) 90vw, 900px"
                    className="h-auto w-full rounded-[var(--radius-2x)] object-cover"
                  />
                </Reveal>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-4 font-body text-[15px] text-subtle">
                <time>{post.date}</time>
                <span aria-hidden>·</span>
                <Link
                  href={`/${post.category}`}
                  className="hover:text-primary"
                >
                  {categoryLabels[post.category]}
                </Link>
              </div>

              <Reveal>
                <RichText blocks={post.body} className="mt-6" />
              </Reveal>

              {previous || next ? (
                <nav
                  aria-label="Post navigation"
                  className="mt-12 flex flex-wrap justify-between gap-6 border-t border-tertiary pt-8"
                >
                  {previous ? (
                    <Link
                      href={`/${previous.category}/${previous.slug}`}
                      rel="prev"
                      className="max-w-[45%] font-body hover:text-primary"
                    >
                      <span className="block text-[14px] text-subtle">
                        Previous
                      </span>
                      <span className="block text-[16px]">{previous.title}</span>
                    </Link>
                  ) : (
                    <span />
                  )}

                  {next ? (
                    <Link
                      href={`/${next.category}/${next.slug}`}
                      rel="next"
                      className="max-w-[45%] text-right font-body hover:text-primary"
                    >
                      <span className="block text-[14px] text-subtle">Next</span>
                      <span className="block text-[16px]">{next.title}</span>
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </article>

            <BlogSidebar />
          </div>
        </Container>
      </section>
    </>
  );
}
