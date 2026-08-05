"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FIELD, FOCUS } from "@/components/ui/tokens";

/** Sidebar keyword search; routes to the blog listing with a `?s=` query. */
export default function SearchForm() {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  return (
    <form
      role="search"
      className="mt-3 flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = keyword.trim();
        router.push(trimmed ? `/blog?s=${encodeURIComponent(trimmed)}` : "/blog");
      }}
    >
      <label htmlFor="blog-search" className="sr-only">
        Search the blog
      </label>
      <input
        id="blog-search"
        type="search"
        name="s"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Enter Keyword"
        className={`${FIELD} min-w-0 flex-1`}
      />
      <button
        type="submit"
        aria-label="Search"
        className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-primary-strong text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
