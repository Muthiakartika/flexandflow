"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type PickedImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type Asset = {
  id: string;
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  alt: string;
  bytes: number;
  builtIn: boolean;
};

/**
 * Choosing a picture: the library, or a new upload.
 *
 * Opens over the editor rather than navigating away, because picking an image
 * happens in the middle of writing a paragraph and losing the draft to a page
 * change would be unforgivable.
 *
 * Dimensions come back with the asset and are stored on the block. `next/image`
 * needs them, and the blog listing packs its masonry from them — an image
 * without them renders at zero height and jumps when the file loads.
 */
export function MediaPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (image: PickedImage) => void;
}) {
  /* The body is a separate component that only exists while the picker is
     open. Two things follow, and both matter: its state starts fresh each
     time — so "loading" is the initial value rather than something an effect
     has to set on the way in — and the library is re-fetched on every open, so
     a picture uploaded from another tab is there.

     Keeping the fetch out of a synchronous effect is not lint appeasement:
     setting state in an effect body schedules a second render before the
     browser paints, which is what makes a modal flash its empty state. */
  if (!open) return null;
  return <PickerBody onClose={onClose} onPick={onPick} />;
}

function PickerBody({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (image: PickedImage) => void;
}) {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/cms/media/", { cache: "no-store" });
      const body = await response.json();
      if (response.ok) {
        setAssets(body.assets ?? []);
      } else {
        setAssets([]);
        setMessage(body.error ?? "The library could not load.");
      }
    } catch {
      setAssets([]);
      setMessage("The library could not load.");
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The rule flags any function reached from an effect that eventually calls
       setState, which includes every fetch-on-mount. That is what this is: the
       server is the external system, `load` only sets state after an await, and
       the component starts in its loading state rather than being put there by
       this effect. There is no synchronous cascade to avoid. */
    void load();
  }, [load]);

  /* Escape closes. A modal that can only be dismissed with the mouse is a trap
     for anyone working from the keyboard. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = assets === null;

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/cms/media/", {
        method: "POST",
        body: form,
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage(body.error ?? "The upload failed.");
        return;
      }

      setMessage(
        body.reused
          ? `That picture was already in the library as “${body.asset.filename}”, so it was reused rather than stored twice.`
          : `${body.asset.filename} uploaded.`,
      );

      await load();
    } catch {
      setMessage("The upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function pick(asset: Asset) {
    if (!asset.width || !asset.height) {
      setMessage(
        `${asset.filename} has no size recorded, so the page cannot reserve space for it. Re-upload it as a JPG, PNG or WebP.`,
      );
      return;
    }

    onPick({
      src: asset.url,
      alt: asset.alt,
      width: asset.width,
      height: asset.height,
    });
    onClose();
  }

  const needle = search.trim().toLowerCase();
  const all = assets ?? [];
  const shown = needle
    ? all.filter(
        (asset) =>
          asset.filename.toLowerCase().includes(needle) ||
          asset.url.toLowerCase().includes(needle),
      )
    : all;

  return (
    <div
      className="cms-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Choose an image"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="cms-modal">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold text-ink">Choose an image</h2>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-quiet">
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by file name"
            className="admin-input max-w-[16rem]"
            aria-label="Search images"
          />

          <label className="admin-btn admin-btn-solid cursor-pointer">
            {uploading ? "Uploading…" : "Upload new"}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>

          <span className="text-[12px] text-faint">
            {shown.length} image{shown.length === 1 ? "" : "s"}
          </span>
        </div>

        {message ? (
          <p role="status" className="border-b border-line bg-cream px-4 py-2 text-[13px] text-ink">
            {message}
          </p>
        ) : null}

        <div className="cms-modal-body">
          {loading ? (
            <p className="p-6 text-center text-[14px] text-faint">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-faint">
              No images match. Upload one above.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => pick(asset)}
                    className="group block w-full overflow-hidden rounded-[8px] border border-line bg-surface text-left transition-colors hover:border-olive"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden bg-cream">
                      <Image
                        src={asset.url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 45vw, 200px"
                        className="object-cover"
                        /* The library is behind a login and never indexed, so
                           optimising 68 thumbnails would spend the image
                           budget on pictures no visitor ever sees. */
                        unoptimized
                      />
                    </span>
                    <span className="block px-2 py-1.5">
                      <span className="block truncate text-[12px] font-bold text-ink">
                        {asset.filename}
                      </span>
                      <span className="block text-[11px] text-faint">
                        {asset.width && asset.height
                          ? `${asset.width}×${asset.height}`
                          : "size unknown"}
                        {" · "}
                        {Math.max(1, Math.round(asset.bytes / 1024))} KB
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
