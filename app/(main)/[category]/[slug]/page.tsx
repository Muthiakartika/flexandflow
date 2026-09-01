import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PostArticle from "@/components/content/PostArticle";
import ServiceArticle from "@/components/content/ServiceArticle";
import { getCategory } from "@/lib/cms/category-store";
import { getPost, getService, publishedParams } from "@/lib/cms/read";
import { TREATMENT_PREFIX } from "@/lib/cms/categories";
import { metadataFromSeo, postNeighbours } from "@/lib/content";

/**
 * Every article on the site: `/uluwatu-bali/…`, `/injury-guide/…`, and
 * whatever category the studio adds next.
 *
 * This replaced two hand-written route folders. Categories are rows now
 * (`ContentCategory`), so a new one has to be servable without a deploy — and
 * a file per category cannot be.
 *
 * **Static segments win.** Next resolves `/services`, `/blog`, `/about-us`,
 * `/price-list`, `/contact-us`, `/therapist`, `/academy`, `/admin` and `/api`
 * against their own folders before it ever considers `[category]`, so none of
 * them is reachable through here. `RESERVED_SLUGS` refuses a category that
 * would sit in their shadow, because such a category would look fine in the
 * panel and 404 for every post in it.
 *
 * `/uluwatu-bali/` serves **both** treatments and the posts in that category,
 * exactly as WordPress did. Services are resolved first, which is why
 * `ContentDoc` enforces slug uniqueness across the pair rather than per kind.
 */
export async function generateStaticParams() {
  const [services, posts] = await Promise.all([
    publishedParams("SERVICE"),
    publishedParams("POST"),
  ]);

  return [...services, ...posts].map((doc) => ({
    category: doc.urlPrefix,
    slug: doc.slug,
  }));
}

/** The document at this address, treatments first. */
async function resolve(category: string, slug: string) {
  if (category === TREATMENT_PREFIX) {
    const service = await getService(slug);
    if (service) return { kind: "service" as const, service };
  }

  const post = await getPost(category, slug);
  return post ? { kind: "post" as const, post } : null;
}

export async function generateMetadata(
  props: PageProps<"/[category]/[slug]">,
): Promise<Metadata> {
  const { category, slug } = await props.params;
  const found = await resolve(category, slug);
  if (!found) return {};

  return metadataFromSeo(
    found.kind === "service" ? found.service.seo : found.post.seo,
  );
}

export default async function ArticlePage(
  props: PageProps<"/[category]/[slug]">,
) {
  const { category, slug } = await props.params;

  /* The category has to exist as well as the document. Without this, a post
     whose category was renamed would still answer at its old address for as
     long as the row happened to say so. */
  if (!(await getCategory(category))) notFound();

  const found = await resolve(category, slug);
  if (!found) notFound();

  if (found.kind === "service") {
    return <ServiceArticle service={found.service} />;
  }

  const { previous, next } = await postNeighbours(found.post);
  return <PostArticle post={found.post} previous={previous} next={next} />;
}
