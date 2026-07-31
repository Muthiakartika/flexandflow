import ArchivePostCard from "@/components/cards/ArchivePostCard";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { packColumns } from "@/lib/masonry";
import type { Post } from "@/types";

/**
 * WordPress's category archive listing (/uluwatu-bali/, /injury-guide/): the
 * masonry grid with no sidebar, and the black-badge card style — distinct from
 * the main /blog/ listing.
 */
export default function CategoryArchiveGrid({ posts }: { posts: Post[] }) {
  const columns = packColumns(posts);

  return (
    <section className="py-[80px]">
      <Container>
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-16">
              {column.map((post, i) => (
                <Reveal key={post.slug} delay={i * 100}>
                  <ArchivePostCard post={post} />
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
