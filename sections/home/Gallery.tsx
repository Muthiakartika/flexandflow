import Image from "next/image";
import Link from "next/link";

import { H2, LINK, WRAP } from "@/components/ui/tokens";
import { formatIdr } from "@/lib/pricing";
import { homeServiceFeeIdr } from "@/lib/site";

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
 * The studio wall, under the one practical choice it raises: come to the
 * room, or have the session at your villa. The villa fee is read from
 * `homeServiceFeeIdr`, never typed. `.mosaic` owns the geometry — see
 * globals.css, where the breakpoints are explicit media queries.
 */
export default function Gallery() {
  return (
    /* No hairline on top: the olive rating band sits directly above. */
    <section aria-labelledby="home-studio">
      <div className={`${WRAP} home-band`}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="page-label">Ungasan &middot; Uluwatu</p>
            <h2 id="home-studio" className={`mt-2 ${H2}`}>
              The Studio, or Your Villa
            </h2>
            <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[1.7] text-body-text/75">
              Come to the studio, or have the same session at your villa, hotel
              or home around Uluwatu, with {formatIdr(homeServiceFeeIdr)} added
              per visit. Trauma healing stays at the studio.
            </p>
          </div>
          <Link href="/uluwatu-bali/outcall-home-service-massage" className={`${LINK} shrink-0`}>
            Villa sessions &rarr;
          </Link>
        </div>

        <ul className="mosaic mt-7">
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
