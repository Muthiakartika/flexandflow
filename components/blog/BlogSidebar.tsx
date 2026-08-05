import Link from "next/link";

import { BTN_SOLID, CARD, FOCUS } from "@/components/ui/tokens";
import { posts } from "@/lib/data/posts";
import { contact } from "@/lib/site";
import SearchForm from "./SearchForm";

export const blogCategories = [
  { slug: "injury-guide", label: "Injury Guide" },
  { slug: "uluwatu-bali", label: "Uluwatu Bali" },
] as const;

/**
 * Sidebar for the blog listing and single posts: search, categories, and the
 * one thing a reader of a recovery article might actually want next — a way to
 * book. The theme's decorative vertical stock photo is gone; it filled the
 * column without saying anything.
 */
export default function BlogSidebar() {
  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-[92px] lg:h-fit">
      <section className={`${CARD} p-5`}>
        <h2 className="page-label">Search</h2>
        <SearchForm />
      </section>

      <section className={`${CARD} p-5`}>
        <h2 className="page-label">Categories</h2>
        <ul className="mt-3 flex flex-col">
          {blogCategories.map((category) => (
            <li key={category.slug} className="border-t border-secondary/10">
              <Link
                href={`/${category.slug}`}
                className={`flex items-baseline justify-between gap-3 py-2.5 font-body text-[14px] transition-colors duration-300 hover:text-primary ${FOCUS}`}
              >
                {category.label}
                <span className="font-body text-[12px] tabular-nums text-body-text/55">
                  {posts.filter((post) => post.category === category.slug).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${CARD} p-5`}>
        <h2 className="font-display text-[22px] leading-none font-bold">
          Book a session
        </h2>
        <p className="mt-2.5 font-body text-[13px] leading-[1.6] text-body-text/65">
          Tell us what hurts on WhatsApp and we&rsquo;ll suggest a session.
        </p>
        <a
          href={contact.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN_SOLID} mt-4 w-full`}
        >
          WhatsApp
        </a>
      </section>
    </aside>
  );
}
