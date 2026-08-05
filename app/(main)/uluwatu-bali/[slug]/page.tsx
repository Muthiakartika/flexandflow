import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PostArticle from "@/components/content/PostArticle";
import ServiceArticle from "@/components/content/ServiceArticle";
import { metadataFromSeo, postNeighbours, resolveUluwatuSlug } from "@/lib/content";
import { posts } from "@/lib/data/posts";
import { services } from "@/lib/data/services";

export function generateStaticParams() {
  return [
    ...services.map((service) => ({ slug: service.slug })),
    ...posts
      .filter((post) => post.category === "uluwatu-bali")
      .map((post) => ({ slug: post.slug })),
  ];
}

export async function generateMetadata(
  props: PageProps<"/uluwatu-bali/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const found = resolveUluwatuSlug(slug);
  if (!found) return {};

  return metadataFromSeo(
    found.kind === "service" ? found.service.seo : found.post.seo,
  );
}

export default async function UluwatuBaliPage(
  props: PageProps<"/uluwatu-bali/[slug]">,
) {
  const { slug } = await props.params;
  const found = resolveUluwatuSlug(slug);
  if (!found) notFound();

  if (found.kind === "service") {
    return <ServiceArticle service={found.service} />;
  }

  const { previous, next } = postNeighbours(found.post);
  return <PostArticle post={found.post} previous={previous} next={next} />;
}
