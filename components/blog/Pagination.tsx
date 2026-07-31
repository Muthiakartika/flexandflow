import Link from "next/link";

const linkClass =
  "flex h-11 min-w-11 items-center justify-center rounded-[var(--radius-1x)] px-3 " +
  "font-body text-[16px] transition-colors duration-300";

/** Numbered pagination matching the theme's blog listing. */
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
    <nav aria-label="Blog pagination" className="mt-12">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {current > 1 ? (
          <li>
            <Link
              href={hrefFor(current - 1)}
              rel="prev"
              className={`${linkClass} border border-tertiary bg-white hover:border-primary hover:text-primary`}
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
                className={`${linkClass} bg-primary text-white`}
              >
                {page}
              </span>
            ) : (
              <Link
                href={hrefFor(page)}
                className={`${linkClass} border border-tertiary bg-white hover:border-primary hover:text-primary`}
              >
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
              className={`${linkClass} border border-tertiary bg-white hover:border-primary hover:text-primary`}
            >
              Next
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
