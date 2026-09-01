"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { BlockEditor } from "@/components/cms/BlockEditor";
import { MediaPicker, type PickedImage } from "@/components/cms/MediaPicker";
import {
  saveContent,
  unpublishContent,
  type CmsResult,
} from "@/lib/cms/actions";
import { slugify } from "@/lib/cms/content-schema";
import type { EditorDoc } from "@/lib/cms/admin";
import type { ContentBlock, TherapistTier } from "@/types";

/**
 * The whole page, editable.
 *
 * Two panes: the document on the left, the **real page** on the right in an
 * iframe. The preview is not a lookalike — it is `/uluwatu-bali/<slug>/` with
 * Draft Mode on, so it is the same route, the same components and the same
 * stylesheet the public gets. That also means it cannot drift: change the
 * article layout and the preview changes with it.
 *
 * It reloads after each save rather than tracking every keystroke. Streaming
 * the draft into the frame live would mean a second rendering path to keep in
 * step with the first, which is the one thing this design avoids.
 *
 * The two stylesheets never meet, which matters here: `(main)/globals.css` and
 * `admin.css` both define `--color-muted` at different values, and an iframe is
 * a separate document. That is why the preview is one and not a div.
 */
export function ContentEditor({
  doc,
  categories,
  canPublish,
  canDelete,
}: {
  doc: EditorDoc;
  /** Every category, from `ContentCategory`. Passed in because this is a
   *  client component and the list is a database read. */
  categories: { slug: string; label: string }[];
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(doc.title);
  const [slug, setSlug] = useState(doc.slug);
  const [urlPrefix, setUrlPrefix] = useState(doc.urlPrefix);
  const [excerpt, setExcerpt] = useState(doc.excerpt);
  const [blocks, setBlocks] = useState<ContentBlock[]>(doc.body);

  const [image, setImage] = useState({
    src: doc.image ?? "",
    width: doc.imageWidth,
    height: doc.imageHeight,
  });
  const [bannerImage, setBannerImage] = useState(doc.bannerImage ?? "");

  const [seoTitle, setSeoTitle] = useState(doc.seoTitle);
  const [seoDescription, setSeoDescription] = useState(doc.seoDescription);

  const [durationLabel, setDurationLabel] = useState(doc.durationLabel ?? "");
  const [displayDate, setDisplayDate] = useState(doc.displayDate ?? "");
  const [tiers, setTiers] = useState<TherapistTier[]>(
    Array.isArray(doc.tiers) ? (doc.tiers as TherapistTier[]) : [],
  );

  const [result, setResult] = useState<CmsResult | null>(null);
  const [picking, setPicking] = useState<"image" | "banner" | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  const isService = doc.kind === "SERVICE";

  /* Marks everything below as unsaved. Wrapped so every setter goes through
     one place rather than each remembering to flag it. */
  const edited = useCallback(<T,>(set: (value: T) => void) => {
    return (value: T) => {
      setDirty(true);
      set(value);
    };
  }, []);

  /* The browser's own "leave site?" prompt. A block editor holds a lot of
     unsaved work and a stray back button loses all of it. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function payload() {
    return {
      docId: doc.id,
      title,
      slug,
      /* Pinned for treatments; `saveContent` overrides it anyway, because a
         treatment is only ever looked up under `uluwatu-bali`. */
      urlPrefix: isService ? "uluwatu-bali" : urlPrefix,
      excerpt,
      image: image.src || null,
      imageWidth: image.width,
      imageHeight: image.height,
      bannerImage: bannerImage || null,
      body: blocks,
      seoTitle,
      seoDescription,
      seoOgImage: image.src || null,
      tiers: isService ? tiers : null,
      durationLabel: isService ? durationLabel || null : null,
      displayDate: isService ? null : displayDate || null,
    };
  }

  function run(action: () => Promise<CmsResult>) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        setDirty(false);
        setPreviewKey((key) => key + 1);
        router.refresh();
      }
    });
  }

  const fields = result?.fields ?? {};

  return (
    <div className="cms-editor">
      {/* ── The document ──────────────────────────────────────────────── */}
      <div className="cms-editor-main">
        <section className="admin-card mb-3 p-4">
          <label className="admin-label" htmlFor="cms-title">
            Page title
          </label>
          <input
            id="cms-title"
            type="text"
            value={title}
            onChange={(event) => {
              setDirty(true);
              setTitle(event.target.value);
              /* Only while the page has never been published and the slug is
                 still whatever the title generated — otherwise typing in the
                 title would rewrite a live URL under the writer. */
              if (doc.status === "DRAFT" && doc.publishedVersion === null) {
                if (slug === slugify(title) || slug === "") {
                  setSlug(slugify(event.target.value));
                }
              }
            }}
            className="admin-input text-[18px] font-bold"
          />
          {fields.title ? <FieldError message={fields.title} /> : null}

          <div className="mt-3">
            <label className="admin-label" htmlFor="cms-slug">
              Web address
            </label>

            <div className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
              <span>flexandflow.fit/</span>

              {isService ? (
                /* Fixed. `lib/cms/read.ts` looks treatments up under this
                   prefix and no other, so a treatment anywhere else would
                   exist in the database and 404 on the site. */
                <span
                  className="rounded-[6px] bg-cream px-2 py-1"
                  title="Treatments are always served from /uluwatu-bali/"
                >
                  uluwatu-bali
                </span>
              ) : (
                <select
                  aria-label="Category"
                  value={urlPrefix}
                  onChange={(event) => {
                    setDirty(true);
                    setUrlPrefix(event.target.value);
                  }}
                  className="admin-input w-auto py-1"
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.slug}
                    </option>
                  ))}
                </select>
              )}

              <span>/</span>

              <input
                id="cms-slug"
                type="text"
                value={slug}
                onChange={(event) => {
                  setDirty(true);
                  setSlug(slugify(event.target.value));
                }}
                className="admin-input max-w-[18rem] flex-1"
              />
              <span>/</span>
            </div>

            {fields.slug ? <FieldError message={fields.slug} /> : null}
            {fields.urlPrefix ? <FieldError message={fields.urlPrefix} /> : null}

            {isService ? (
              <p className="mt-1 text-[12px] text-faint">
                Treatments are always served from <code>/uluwatu-bali/</code>.
                Only the last part can change.
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-faint">
                The category is part of the address. Changing it moves the page.{" "}
                <Link
                  href="/admin/blog/categories/"
                  className="text-olive-strong underline underline-offset-2"
                >
                  Manage categories
                </Link>
                .
              </p>
            )}

            {/* One warning covering both halves of the address, because the
                loss is the same either way: the old URL stops resolving. */}
            {doc.status === "PUBLISHED" &&
            (slug !== doc.slug || (!isService && urlPrefix !== doc.urlPrefix)) ? (
              <p className="mt-1 rounded-[6px] bg-warn-soft px-2 py-1.5 text-[12px] text-warn">
                This page is live at{" "}
                <code>
                  /{doc.urlPrefix}/{doc.slug}/
                </code>
                . Saving this moves it to{" "}
                <code>
                  /{isService ? "uluwatu-bali" : urlPrefix}/{slug}/
                </code>{" "}
                and the old address stops working — anyone who bookmarked it,
                and any search result pointing at it, lands on a “not found”
                page. Nothing redirects automatically.
              </p>
            ) : null}
          </div>

          <div className="mt-3">
            <label className="admin-label" htmlFor="cms-excerpt">
              Short description
            </label>
            <textarea
              id="cms-excerpt"
              value={excerpt}
              onChange={(event) => {
                setDirty(true);
                setExcerpt(event.target.value);
              }}
              rows={2}
              className="admin-input resize-y"
            />
            <p className="mt-1 text-[12px] text-faint">
              Shown on the {isService ? "treatments grid" : "blog listing"} and
              under the page title.
            </p>
            {fields.excerpt ? <FieldError message={fields.excerpt} /> : null}
          </div>
        </section>

        <section className="admin-card mb-3 p-4">
          <h2 className="mb-2 text-[15px] font-bold text-ink">Main picture</h2>
          <ImageRow
            src={image.src}
            width={image.width}
            height={image.height}
            onPick={() => setPicking("image")}
            onClear={() => {
              setDirty(true);
              setImage({ src: "", width: null, height: null });
            }}
          />

          {isService ? (
            <div className="mt-4 border-t border-line pt-3">
              <h3 className="mb-2 text-[14px] font-bold text-ink">
                Banner picture{" "}
                <span className="font-normal text-faint">(optional)</span>
              </h3>
              <p className="mb-2 text-[12px] text-faint">
                Used at the top of the article instead of the main picture. Two
                of the original treatment pages have one.
              </p>
              <ImageRow
                src={bannerImage}
                width={null}
                height={null}
                onPick={() => setPicking("banner")}
                onClear={() => {
                  setDirty(true);
                  setBannerImage("");
                }}
              />
            </div>
          ) : null}
        </section>

        {isService ? (
          <TierEditor
            tiers={tiers}
            durationLabel={durationLabel}
            onTiers={edited(setTiers)}
            onDuration={edited(setDurationLabel)}
          />
        ) : (
          <section className="admin-card mb-3 p-4">
            <label className="admin-label" htmlFor="cms-date">
              Published date
            </label>
            <input
              id="cms-date"
              type="text"
              value={displayDate}
              onChange={(event) => {
                setDirty(true);
                setDisplayDate(event.target.value);
              }}
              className="admin-input max-w-[16rem]"
              placeholder="June 22, 2026"
            />
            <p className="mt-1 text-[12px] text-faint">
              Written out as it should appear. Kept as text, exactly as the
              original site printed it.
            </p>
          </section>
        )}

        <section className="admin-card mb-3 p-4">
          <h2 className="mb-3 text-[15px] font-bold text-ink">Page content</h2>
          <BlockEditor blocks={blocks} onChange={edited(setBlocks)} />
        </section>

        <section className="admin-card mb-3 p-4">
          <h2 className="text-[15px] font-bold text-ink">Search results</h2>
          <p className="mt-1 mb-3 text-[13px] text-muted">
            What Google shows. Kept separate from the page title on purpose —
            renaming a heading should not quietly change the search result.
          </p>

          <label className="admin-label" htmlFor="cms-seo-title">
            SEO title
          </label>
          <input
            id="cms-seo-title"
            type="text"
            value={seoTitle}
            onChange={(event) => {
              setDirty(true);
              setSeoTitle(event.target.value);
            }}
            className="admin-input"
          />
          {fields.seoTitle ? <FieldError message={fields.seoTitle} /> : null}

          <label className="admin-label mt-3" htmlFor="cms-seo-description">
            SEO description
          </label>
          <textarea
            id="cms-seo-description"
            value={seoDescription}
            onChange={(event) => {
              setDirty(true);
              setSeoDescription(event.target.value);
            }}
            rows={3}
            className="admin-input resize-y"
          />
          <p className="mt-1 text-[12px] text-faint">
            {seoDescription.length} characters. Google usually shows about 155.
          </p>
          {fields.seoDescription ? (
            <FieldError message={fields.seoDescription} />
          ) : null}
        </section>
      </div>

      {/* ── Actions and preview ───────────────────────────────────────── */}
      <aside className="cms-editor-side">
        <div className="admin-card mb-3 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={`admin-chip ${
                doc.status === "PUBLISHED"
                  ? "bg-ok-soft text-ok"
                  : "bg-warn-soft text-warn"
              }`}
            >
              {doc.status === "PUBLISHED" ? "live" : "draft"}
            </span>
            <span className="text-[12px] text-faint">version {doc.version}</span>
          </div>

          {doc.hasUnpublishedChanges ? (
            <p className="mb-3 rounded-[6px] bg-warn-soft px-2 py-1.5 text-[12px] text-warn">
              The live page still shows version {doc.publishedVersion}. Your
              changes are saved but not published.
            </p>
          ) : null}

          {dirty ? (
            <p className="mb-3 rounded-[6px] bg-cream px-2 py-1.5 text-[12px] text-muted">
              You have unsaved changes.
            </p>
          ) : null}

          <div className="grid gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => saveContent(payload(), false))}
              className="admin-btn admin-btn-quiet"
            >
              {pending ? "Working…" : "Save draft"}
            </button>

            {canPublish ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => saveContent(payload(), true))}
                className="admin-btn admin-btn-solid"
              >
                {pending
                  ? "Working…"
                  : doc.status === "PUBLISHED"
                    ? "Save and publish"
                    : "Publish"}
              </button>
            ) : (
              <p className="rounded-[6px] bg-cream px-2 py-2 text-[12px] text-muted">
                Your account can edit but not publish. Save a draft and ask a
                super admin to review it.
              </p>
            )}

            <a
              href={`/api/cms/preview/?id=${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-quiet"
            >
              Open preview in a tab
            </a>

            {doc.status === "PUBLISHED" ? (
              <a
                href={`/${doc.urlPrefix}/${doc.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-[13px] text-olive-strong underline underline-offset-2"
              >
                View the live page
              </a>
            ) : null}
          </div>

          {result?.message ? (
            <p
              role="status"
              className={`mt-3 rounded-[8px] px-3 py-2 text-[13px] font-bold ${
                result.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
              }`}
            >
              {result.message}
            </p>
          ) : null}
        </div>

        {canPublish && doc.status === "PUBLISHED" ? (
          <div className="admin-card mb-3 p-4">
            <h2 className="text-[14px] font-bold text-ink">Take it offline</h2>
            <p className="mt-1 mb-2 text-[12px] text-muted">
              The address starts returning “not found” and leaves the sitemap.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unpublishContent(doc.id))}
              className="admin-btn admin-btn-danger w-full"
            >
              Unpublish
            </button>
          </div>
        ) : null}

        {canDelete && doc.status !== "PUBLISHED" ? (
          <p className="mb-3 text-[12px] text-faint">
            This page can be deleted from the list it appears in.
          </p>
        ) : null}

        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <h2 className="text-[14px] font-bold text-ink">Preview</h2>
            <button
              type="button"
              onClick={() => setPreviewKey((key) => key + 1)}
              className="text-[12px] text-olive-strong underline underline-offset-2"
            >
              Refresh
            </button>
          </div>
          <iframe
            key={previewKey}
            /* The real page with Draft Mode on, not a rendering of it. The
               cache-busting parameter is what makes "Refresh" reload rather
               than serve the frame's own back-forward cache entry. */
            src={`/api/cms/preview/?id=${doc.id}&v=${previewKey}`}
            title="Page preview"
            className="cms-preview-frame"
          />
          <p className="border-t border-line px-3 py-2 text-[12px] text-faint">
            Shows the last saved draft. Save to see the newest changes.
          </p>
        </div>
      </aside>

      <MediaPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(picked: PickedImage) => {
          setDirty(true);
          if (picking === "banner") setBannerImage(picked.src);
          else
            setImage({
              src: picked.src,
              width: picked.width,
              height: picked.height,
            });
        }}
      />
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1 text-[12px] font-bold text-danger">
      {message}
    </p>
  );
}

function ImageRow({
  src,
  width,
  height,
  onPick,
  onClear,
}: {
  src: string;
  width: number | null;
  height: number | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <button
        type="button"
        onClick={onPick}
        className="relative block h-[90px] w-[120px] shrink-0 overflow-hidden rounded-[8px] border border-line bg-cream text-[12px] text-faint transition-colors hover:border-olive"
      >
        {src ? (
          <Image src={src} alt="" fill sizes="120px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full items-center justify-center">Choose</span>
        )}
      </button>

      <div className="grid gap-1">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPick} className="admin-btn admin-btn-quiet">
            {src ? "Replace" : "Choose picture"}
          </button>
          {src ? (
            <button type="button" onClick={onClear} className="admin-btn admin-btn-danger">
              Remove
            </button>
          ) : null}
        </div>
        {src ? (
          <span className="text-[12px] break-all text-faint">
            {src}
            {width && height ? ` · ${width}×${height}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The rate rows on a treatment page.
 *
 * These are the marketing figures, and they are **not** what the booking
 * wizard charges — that is `ServiceVariant`, edited under Booking → Prices.
 * The two are kept in step by `npm run check:prices`, which exists because
 * this site has published a wrong price three times. The warning below is not
 * decoration.
 */
function TierEditor({
  tiers,
  durationLabel,
  onTiers,
  onDuration,
}: {
  tiers: TherapistTier[];
  durationLabel: string;
  onTiers: (tiers: TherapistTier[]) => void;
  onDuration: (value: string) => void;
}) {
  function update(index: number, patch: Partial<TherapistTier>) {
    onTiers(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  return (
    <section className="admin-card mb-3 p-4">
      <h2 className="text-[15px] font-bold text-ink">Rates</h2>

      <div className="my-3 rounded-[8px] border border-warn/40 bg-warn-soft p-3">
        <p className="text-[13px] text-ink">
          <strong className="text-warn">
            These are the prices printed on the website.
          </strong>{" "}
          They are separate from what the booking system charges, which lives
          under <strong>Booking prices</strong>. After changing anything here,
          run <code className="rounded bg-cream px-1">npm run check:prices</code>{" "}
          — it reports every figure where the two disagree. Three wrong prices
          have gone live on this site by skipping that step.
        </p>
      </div>

      <label className="admin-label" htmlFor="cms-duration">
        Session length shown on the card
      </label>
      <input
        id="cms-duration"
        type="text"
        value={durationLabel}
        onChange={(event) => onDuration(event.target.value)}
        className="admin-input max-w-[16rem]"
        placeholder="Duration : 1 hr"
      />

      <div className="mt-4 grid gap-3">
        {tiers.length === 0 ? (
          <p className="text-[13px] text-faint">
            No published rates. The page shows no price panel — which is
            deliberate for the two treatments that appear on no menu.
          </p>
        ) : null}

        {tiers.map((tier, index) => (
          <div key={index} className="rounded-[8px] border border-line p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="admin-label">Tier name</span>
                <input
                  type="text"
                  value={tier.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                  className="admin-input"
                  placeholder="Master Therapist"
                />
              </div>
              <div>
                <span className="admin-label">Price (digits only)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tier.price}
                  onChange={(event) => update(index, { price: event.target.value })}
                  className="admin-input"
                  placeholder="750,000"
                />
                <p className="mt-1 text-[12px] text-faint">
                  The site adds “IDR”. Do not type it.
                </p>
              </div>
              <div>
                <span className="admin-label">Note</span>
                <input
                  type="text"
                  value={tier.note}
                  onChange={(event) => update(index, { note: event.target.value })}
                  className="admin-input"
                  placeholder="(Highly Experienced)"
                />
              </div>
              <div>
                <span className="admin-label">Length for this tier</span>
                <input
                  type="text"
                  value={tier.duration ?? ""}
                  onChange={(event) =>
                    update(index, { duration: event.target.value || undefined })
                  }
                  className="admin-input"
                  placeholder="Duration: 60 minutes"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTiers(tiers.filter((_, i) => i !== index))}
              className="mt-2 text-[12px] text-danger underline underline-offset-2"
            >
              Remove this rate
            </button>
          </div>
        ))}

        <div>
          <button
            type="button"
            onClick={() =>
              onTiers([...tiers, { label: "", note: "", price: "" }])
            }
            className="admin-btn admin-btn-quiet"
          >
            Add a rate
          </button>
        </div>
      </div>
    </section>
  );
}
