"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/admin/SubmitButton";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/lib/cms/category-actions";
import { slugProblem } from "@/lib/cms/categories";
import { slugify } from "@/lib/cms/content-schema";
import type { CategoryWithCount } from "@/lib/cms/category-store";
import type { CmsResult } from "@/lib/cms/actions";

const IDLE: CmsResult = { ok: false, message: null };

/**
 * One category: its name, its web address, and what its archive page says.
 *
 * The address is the part that matters. A category slug is in the URL of every
 * post filed under it, so renaming one moves all of them at once — the form
 * says so, with the count, before anything is saved.
 *
 * The reserved-slug check runs here *and* in the action, from the same
 * `slugProblem`. Here it is so somebody finds out while typing rather than
 * after saving; there it is because a form is not a permission check.
 */
export function CategoryForm({
  category,
  onDone,
}: {
  /** Absent when creating. */
  category?: CategoryWithCount;
  onDone?: () => void;
}) {
  const editing = Boolean(category);

  const [state, action] = useActionState<CmsResult, FormData>(
    editing ? updateCategoryAction : createCategoryAction,
    IDLE,
  );

  const [label, setLabel] = useState(category?.label ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [touchedSlug, setTouchedSlug] = useState(editing);

  const fields = state.fields ?? {};
  const locked = category?.locked ?? false;
  const renaming = editing && slug !== category?.slug;
  const localProblem = slug ? slugProblem(slug) : null;

  if (state.ok && onDone) onDone();

  return (
    <form action={action} className="grid gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="admin-label" htmlFor={`cat-label-${category?.id ?? "new"}`}>
            Name
          </label>
          <input
            id={`cat-label-${category?.id ?? "new"}`}
            name="label"
            type="text"
            required
            maxLength={80}
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
              if (!touchedSlug) setSlug(slugify(event.target.value));
            }}
            className="admin-input"
            placeholder="Recovery & Mobility"
          />
          <p className="mt-1 text-[12px] text-faint">
            Shown on the archive page, in breadcrumbs, and in the blog sidebar.
          </p>
          {fields.label ? <Err message={fields.label} /> : null}
        </div>

        <div>
          <label className="admin-label" htmlFor={`cat-slug-${category?.id ?? "new"}`}>
            Web address
          </label>
          <div className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            <span>flexandflow.fit/</span>
            <input
              id={`cat-slug-${category?.id ?? "new"}`}
              name="slug"
              type="text"
              required
              readOnly={locked}
              value={slug}
              onChange={(event) => {
                setTouchedSlug(true);
                setSlug(slugify(event.target.value));
              }}
              className={`admin-input max-w-[14rem] flex-1${locked ? " opacity-60" : ""}`}
            />
            <span>/</span>
          </div>

          {locked ? (
            <p className="mt-1 text-[12px] text-faint">
              Fixed: every treatment page is served from this address. The name
              above can still change.
            </p>
          ) : null}

          {localProblem && !fields.slug ? <Err message={localProblem} /> : null}
          {fields.slug ? <Err message={fields.slug} /> : null}
        </div>
      </div>

      {/* The whole reason this form is careful. */}
      {renaming && !locked ? (
        <p className="rounded-[6px] bg-warn-soft px-3 py-2 text-[13px] text-warn">
          <strong className="font-bold">This moves every page in it.</strong>{" "}
          {category!.postCount === 0
            ? "There are none right now, so nothing breaks — but that changes once you file something here."
            : `${category!.postCount} page${category!.postCount === 1 ? "" : "s"} will move from /${category!.slug}/ to /${slug}/, and the old addresses will return “not found”. Nothing redirects automatically.`}
        </p>
      ) : null}

      <div>
        <label className="admin-label" htmlFor={`cat-lead-${category?.id ?? "new"}`}>
          Archive page introduction
        </label>
        <textarea
          id={`cat-lead-${category?.id ?? "new"}`}
          name="lead"
          rows={2}
          defaultValue={category?.lead ?? ""}
          className="admin-input resize-y"
          placeholder="Guides on preventing and recovering from common injuries."
        />
        <p className="mt-1 text-[12px] text-faint">
          The sentence under the title at <code>/{slug || "…"}/</code>. Optional.
        </p>
      </div>

      <fieldset className="border-t border-line pt-4">
        <legend className="admin-label px-0">Search results</legend>
        <p className="mb-3 text-[13px] text-muted">
          These archive pages are marked <code>noindex</code>, matching the
          original site, so this rarely shows anywhere — but a title is still
          what a browser tab says.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label" htmlFor={`cat-seo-${category?.id ?? "new"}`}>
              SEO title
            </label>
            <input
              id={`cat-seo-${category?.id ?? "new"}`}
              name="seoTitle"
              type="text"
              required
              defaultValue={category?.seoTitle ?? ""}
              className="admin-input"
              placeholder="Recovery Archives - Flex and Flow"
            />
            {fields.seoTitle ? <Err message={fields.seoTitle} /> : null}
          </div>

          <div>
            <label
              className="admin-label"
              htmlFor={`cat-seodesc-${category?.id ?? "new"}`}
            >
              SEO description
            </label>
            <textarea
              id={`cat-seodesc-${category?.id ?? "new"}`}
              name="seoDescription"
              rows={2}
              defaultValue={category?.seoDescription ?? ""}
              className="admin-input resize-y"
            />
            <p className="mt-1 text-[12px] text-faint">
              Leave empty for none at all — which is what the Injury Guide
              archive does, on purpose.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingLabel={editing ? "Saving…" : "Creating…"}>
          {editing ? "Save category" : "Create category"}
        </SubmitButton>
      </div>

      <FormMessage state={{ ok: state.ok, message: state.message }} />
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
