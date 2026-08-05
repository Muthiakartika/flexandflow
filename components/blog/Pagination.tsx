import Link from "next/link";

import { FOCUS } from "@/components/ui/tokens";

const base =
  "flex h-10 min-w-10 items-center justify-center rounded-[10px] px-3 " +
  `font-body text-[14px] leading-none transition-colors duration-300 ${FOCUS}`;

const idle =
  "border border-secondary/15 bg-white hover:border-primary hover:text-primary";

/** Numbered pagination for the blog listing. */
export default function Pagination({
  current,
  total,
  hrefFor,
}: {
  current: number;
  total: number;
  /** Build the href for a page number; page 1 is the bare listing URL. */
  hrefFor: (page: number) => string;
}) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav aria-label="Blog pagination" className="mt-8">
      <ul className="flex flex-wrap items-center gap-2">
        {current > 1 ? (
          <li>
            <Link
              href={hrefFor(current - 1)}
              rel="prev"
              className={`${base} ${idle}`}
            >
              Previous
            </Link>
          </li>
        ) : null}

        {pages.map((page) => (
          <li key={page}>
            {page === current ? (
              <span
                aria-current="page"
                className={`${base} bg-primary-strong text-white`}
              >
                {page}
              </span>
            ) : (
              <Link href={hrefFor(page)} className={`${base} ${idle}`}>
                {page}
              </Link>
            )}
          </li>
        ))}

        {current < total ? (
          <li>
            <Link
              href={hrefFor(current + 1)}
              rel="next"
              className={`${base} ${idle}`}
            >
              Next
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
