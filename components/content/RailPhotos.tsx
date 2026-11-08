"use client";

import Image from "next/image";

import type { RailPhoto } from "@/lib/seo/layouts";
import useActiveSection from "./useActiveSection";

/**
 * A tall photo in the right margin beside a pilot treatment article, sticky
 * under the header from 1280px (`.article-rail` in `globals.css`), that
 * changes with the section being read: one photo per section, in the same
 * order as "On this page" on the left, cross-fading as the reader moves on.
 * Each carries a short caption tag and the section's number.
 *
 * Decoration beside the article, so the images are `alt=""`: every one of
 * them also sits, described, somewhere on the site's own pages. The list
 * per page is `RAIL_PHOTOS` in `lib/seo/layouts.ts`.
 */
export default function RailPhotos({ photos, ids }: { photos: RailPhoto[]; ids: string[] }) {
  const section = useActiveSection(ids);
  const shown = Math.min(section, photos.length - 1);

  return (
    <div className="rail-photos" aria-hidden>
      {photos.map((photo, i) => (
        <figure key={photo.src} className={`rail-photo${i === shown ? " is-shown" : ""}`}>
          <Image
            src={photo.src}
            alt=""
            width={photo.width}
            height={photo.height}
            sizes="272px"
            loading={i === 0 ? "eager" : "lazy"}
            style={{ objectPosition: photo.position ?? "center" }}
          />
          <figcaption>{photo.caption}</figcaption>
        </figure>
      ))}
      <span className="rail-photos-count">
        {String(shown + 1).padStart(2, "0")}
        <span> / {String(photos.length).padStart(2, "0")}</span>
      </span>
    </div>
  );
}
