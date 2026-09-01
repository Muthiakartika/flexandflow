"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createContent, type CmsResult } from "@/lib/cms/actions";
import { slugify } from "@/lib/cms/content-schema";

/**
 * Starting a new treatment or blog post.
 *
 * Four fields, then straight into the editor. Asking for the body here would
 * make somebody fill in a form before they can see what they are writing,
 * which is the opposite of the point.
 *
 * Whatever is created is a **draft**. Nothing reaches the website until
 * somebody publishes it, so there is no way to put an empty page on the
 * domain by pressing this button.
 */
export function NewContentForm({
  kind,
  categories,
}: {
  kind: "SERVICE" | "POST";
  /** Every category, from `ContentCategory`. Empty for treatments, which are
   *  always filed under `uluwatu-bali`. */
  categories: { slug: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [urlPrefix, setUrlPrefix] = useState(
    categories[0]?.slug ?? "uluwatu-bali",
  );
  const [result, setResult] = useState<CmsResult | null>(null);

  const isService = kind === "SERVICE";
  const prefix = isService ? "uluwatu-bali" : urlPrefix;
  const fields = result?.fields ?? {};

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const outcome = await createContent({ kind, title, slug, urlPrefix: prefix });
      setResult(outcome);

      if (outcome.ok && outcome.docId) {
        router.push(
          `${isService ? "/admin/treatments" : "/admin/blog"}/${outcome.docId}/`,
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label className="admin-label" htmlFor="new-title">
          Title
        </label>
        <input
          id="new-title"
          type="text"
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            /* Follows the title until somebody types their own, then stops —
               otherwise a deliberate URL is overwritten by the next keystroke
               in the title field. */
            if (!touchedSlug) setSlug(slugify(event.target.value));
          }}
          className="admin-input"
          placeholder={isService ? "Assisted Stretching Bali" : "How to stretch at your desk"}
        />
        {fields.title ? <Err message={fields.title} /> : null}
      </div>

      {isService ? null : (
        <div>
          <span className="admin-label">Category</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setUrlPrefix(category.slug)}
                className={`cms-chip${urlPrefix === category.slug ? " is-on" : ""}`}
              >
                {category.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[12px] text-faint">
            The category decides the web address. It cannot be changed later
            without breaking the address, so choose it now.
          </p>
        </div>
      )}

      <div>
        <label className="admin-label" htmlFor="new-slug">
          Web address
        </label>
        <div className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
          <span>flexandflow.fit/{prefix}/</span>
          <input
            id="new-slug"
            type="text"
            required
            value={slug}
            onChange={(event) => {
              setTouchedSlug(true);
              setSlug(slugify(event.target.value));
            }}
            className="admin-input max-w-[18rem] flex-1"
          />
          <span>/</span>
        </div>
        {fields.slug ? <Err message={fields.slug} /> : null}
      </div>

      <div>
        <button
          type="submit"
          disabled={pending || !title.trim() || !slug}
          className="admin-btn admin-btn-solid"
        >
          {pending ? "Creating…" : "Create draft"}
        </button>
      </div>

      {result?.message && !result.ok ? (
        <p role="status" className="rounded-[8px] bg-danger-soft px-3 py-2 text-[13px] font-bold text-danger">
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

function Err({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1 text-[12px] font-bold text-danger">
      {message}
    </p>
  );
}
