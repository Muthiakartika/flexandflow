import Image from "next/image";

import { BAND, WRAP } from "@/components/ui/tokens";

/** The six studio photographs, in the original's order. */
/* Order matters: `.mosaic` gives the first photo a 2x2 block and photos 2,
   5 and 6 a double-width strip, so each file is cut to the shape of the cell
   it lands in — see the crop table in SITE-STRUCTURE.md. Room and hands
   alternate so the block does not read as six pictures of the same floor. */
const photos = [
  { src: "/images/2026/08/gallery-1.jpg", width: 1600, height: 1067 },
  { src: "/images/2026/08/gallery-2.jpg", width: 1800, height: 900 },
  { src: "/images/2026/08/gallery-3.jpg", width: 1200, height: 857 },
  { src: "/images/2026/08/gallery-4.jpg", width: 1200, height: 857 },
  { src: "/images/2026/08/gallery-5.jpg", width: 1800, height: 900 },
  { src: "/images/2026/08/gallery-6.jpg", width: 1800, height: 900 },
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
