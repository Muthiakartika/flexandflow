"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Filters a content list by title or web address.
 *
 * Pushes `?q=` rather than filtering in the browser, so the result is a URL
 * somebody can keep, and so the filtering happens where the rows do. Debounced
 * because it navigates on every keystroke otherwise, and each navigation is a
 * database round trip.
 */
export function SearchBox({
  placeholder,
  defaultValue,
}: {
  placeholder: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value === current) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      const query = next.toString();
      /* `replace`, not `push`: typing five characters would otherwise put five
         entries in the history and make the back button useless. */
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value, params, pathname, router]);

  return (
    <input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="admin-input max-w-[20rem]"
    />
  );
}
