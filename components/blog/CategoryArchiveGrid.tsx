import PostCard from "@/components/cards/PostCard";
import { BAND, WRAP } from "@/components/ui/tokens";
import type { Post } from "@/types";

/**
 * Category archive listing (/uluwatu-bali/, /injury-guide/). It now uses the
 * same card as the blog listing — the theme had a separate one for archives,
 * with a black date badge and no excerpt, for no reason a reader could see.
 */
export default function CategoryArchiveGrid({ posts }: { posts: Post[] }) {
  return (
    <section className={`${WRAP} ${BAND}`}>
      {posts.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-[15px]">No posts in this category yet.</p>
      )}
    </section>
  );
}
