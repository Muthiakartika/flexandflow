import PostCard from "@/components/cards/PostCard";
import Pagination from "./Pagination";
import type { Post } from "@/types";

/**
 * The cards and their pagination, with no data fetching and no hooks.
 *
 * Deliberately carries **neither** `"use client"` nor `server-only`: the
 * archives render it on the server, and `SearchableGrid` renders it on the
 * client. A component with no side effects can live in both graphs, and that
 * is what keeps the blog index's keyword filter from dragging `PostCard` into
 * the bundle of every category archive that never filters anything.
 *
 * `posts` is the slice to draw, not the whole set — whoever paginates decides
 * which page this is.
 */
export default function PostGrid({
  posts,
  page,
  totalPages,
  hrefFor,
  emptyMessage,
  featureFirst = false,
}: {
  posts: Post[];
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  emptyMessage: string;
  /** The blog index, unfiltered: its newest guide as the wide card. */
  featureFirst?: boolean;
}) {
  const feature = featureFirst && page === 1;

  return (
    <div>
      {posts.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {posts.map((post, i) => (
            <li key={post.slug} className={feature && i === 0 ? "sm:col-span-2" : undefined}>
              <PostCard post={post} feature={feature && i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-[15px]">{emptyMessage}</p>
      )}

      <Pagination current={page} total={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
