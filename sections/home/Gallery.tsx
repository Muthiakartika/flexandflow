import Image from "next/image";

import { BAND, WRAP } from "@/components/ui/tokens";

/** The six studio photographs, in the original's order. */
const photos = [
  { src: "/images/2026/06/Gallery-1.jpg", width: 1024, height: 621 },
  { src: "/images/2026/06/gallery-2.jpg", width: 1024, height: 840 },
  { src: "/images/2026/06/Gallery-3.jpg", width: 1024, height: 494 },
  { src: "/images/2026/07/Gallery-5-new.jpg", width: 1024, height: 494 },
  { src: "/images/2026/06/Gallery-4-new.jpg", width: 1024, height: 621 },
  { src: "/images/2026/06/gallery-6.jpg", width: 1024, height: 840 },
];

/**
 * The studio wall. A mosaic rather than two even rows: the first frame takes a
 * 2x2 block from 1024px up, so the group reads as one composition and the band
 * needs no heading to justify itself. `.mosaic` owns the geometry — see
 * globals.css, where the breakpoints are explicit media queries.
 */
export default function Gallery() {
  return (
    <section className="page-band-line">
      <div className={`${WRAP} ${BAND}`}>
        <h2 className="sr-only">Inside the studio</h2>

        <ul className="mosaic">
          {photos.map((photo) => (
            <li key={photo.src} className="overflow-hidden rounded-[10px]">
              <Image
                src={photo.src}
                alt=""
                aria-hidden
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 30vw"
                className="h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
