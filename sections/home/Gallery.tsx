import Image from "next/image";

import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";

/**
 * Studio gallery: two rows of three photos at equal height. Column ratios come
 * from the original's rendered widths (443 / 326 / 556 px), reversed on row two.
 */
const rows = [
  {
    columns: "443fr 326fr 556fr",
    photos: [
      { src: "/images/2026/06/Gallery-1.jpg", width: 1024, height: 621 },
      { src: "/images/2026/06/gallery-2.jpg", width: 1024, height: 840 },
      { src: "/images/2026/06/Gallery-3.jpg", width: 1024, height: 494 },
    ],
  },
  {
    columns: "556fr 443fr 326fr",
    photos: [
      { src: "/images/2026/07/Gallery-5-new.jpg", width: 1024, height: 494 },
      { src: "/images/2026/06/Gallery-4-new.jpg", width: 1024, height: 621 },
      { src: "/images/2026/06/gallery-6.jpg", width: 1024, height: 840 },
    ],
  },
];

export default function Gallery() {
  return (
    <section className="band band-line">
      <Container>
        <div className="flex flex-col gap-5">
          {rows.map((row) => (
            <div
              key={row.columns}
              className="grid gap-5 max-[767px]:grid-cols-1! max-[767px]:gap-4"
              style={{ gridTemplateColumns: row.columns }}
            >
              {row.photos.map((photo, i) => (
                <Reveal key={photo.src} delay={i * 100}>
                  <Image
                    src={photo.src}
                    alt=""
                    aria-hidden
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 767px) 90vw, 33vw"
                    className="h-[268px] w-full rounded-[12px] object-cover max-[767px]:h-[210px]"
                  />
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
