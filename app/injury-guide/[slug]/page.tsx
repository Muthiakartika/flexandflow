import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PostArticle from "@/components/content/PostArticle";
import { metadataFromSeo, postNeighbours, postsInCategory } from "@/lib/content";

export function generateStaticParams() {
  return postsInCategory("injury-guide").map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  props: PageProps<"/injury-guide/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = postsInCategory("injury-guide").find((p) => p.slug === slug);
  return post ? metadataFromSeo(post.seo) : {};
}

export default async function InjuryGuidePostPage(
  props: PageProps<"/injury-guide/[slug]">,
) {
  const { slug } = await props.params;
  const post = postsInCategory("injury-guide").find((p) => p.slug === slug);
  if (!post) notFound();

  const { previous, next } = postNeighbours(post);
  return <PostArticle post={post} previous={previous} next={next} />;
}
