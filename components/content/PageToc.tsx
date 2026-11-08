"use client";

import { contact } from "@/lib/site";
import useActiveSection from "./useActiveSection";

/**
 * "On this page": the article's sections, sticky in the left margin beside
 * the article on a wide screen (from 1280px; `.article-toc` in
 * `globals.css`). The section being read is marked as you scroll
 * (`useActiveSection`, shared with the photos in the right margin), and a
 * click glides there with the site's smooth scroll, landing clear of the
 * sticky header.
 *
 * The links are real anchors to the headings' ids (`headingId` in
 * `RichText`), rendered on the server, so they work before hydration too.
 */
export default function PageToc({ items }: { items: { id: string; label: string }[] }) {
  const active = useActiveSection(items.map((item) => item.id));

  if (items.length < 2) return null;

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    const lenis = (window as { __lenis?: { scrollTo: (t: HTMLElement, o: object) => void } }).__lenis;
    if (!target || !lenis) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: -104 });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="On this page" className="article-toc">
      <p className="page-label">On this page</p>
      <ol>
        {items.map((item, n) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(event) => go(event, item.id)}
              aria-current={active === n ? "location" : undefined}
              className={active === n ? "is-active" : undefined}
            >
              <span aria-hidden>{String(n + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>

      {/* A way to ask, under the map of the page. The link gets the page's
          own WhatsApp message (`WhatsAppLinks`). */}
      <p className="article-toc-help">
        Not sure which session suits you?{" "}
        <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
          Ask us on WhatsApp &rarr;
        </a>
      </p>
    </nav>
  );
}
