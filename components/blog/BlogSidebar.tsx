import Image from "next/image";
import Link from "next/link";

import SearchForm from "./SearchForm";
import { posts } from "@/lib/data/posts";

export const blogCategories = [
  { slug: "injury-guide", label: "Injury Guide" },
  { slug: "uluwatu-bali", label: "Uluwatu Bali" },
] as const;

/** Sidebar shown alongside the blog listing and single posts. */
export default function BlogSidebar() {
  return (
    <aside className="flex flex-col gap-10">
      <section>
        <h2 className="text-[var(--fs-h4)]">Search</h2>
        <SearchForm />
      </section>

      <section>
        <h2 className="text-[var(--fs-h4)]">Categories</h2>
        <ul className="mt-4 flex flex-col gap-2 text-[16px]">
          {blogCategories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/${category.slug}`}
                className="transition-colors duration-300 hover:text-primary"
              >
                {category.label} (
                {posts.filter((post) => post.category === category.slug).length})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Image
        src="/images/2024/11/vertical-image-blog.jpg"
        alt="blog vertical"
        width={400}
        height={600}
        sizes="(max-width: 1023px) 90vw, 320px"
        className="h-auto w-full object-cover"
      />
    </aside>
  );
}
