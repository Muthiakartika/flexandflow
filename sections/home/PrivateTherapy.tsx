import Image from "next/image";

import BenefitIcon, {
  benefitLabels,
  type BenefitIconName,
} from "@/components/ui/BenefitIcon";
import { ButtonLink } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { contact, siteConfig } from "@/lib/site";

const benefits = Object.keys(benefitLabels) as BenefitIconName[];

/* Photo collage geometry, measured from the original at a 656x734 stage and
   kept as percentages so it scales with the column. */
const photos = [
  {
    src: "/images/2026/06/theraphy-section-ginny.jpg",
    width: 430,
    height: 700,
    style: { left: "0%", top: "0%", width: "47.4%", height: "69.1%" },
    radius: "200px 20px 20px",
  },
  {
    src: "/images/2026/06/theraphy-section-with-client-ginny.jpg",
    width: 1300,
    height: 1200,
    style: { left: "52.4%", top: "0%", width: "47.4%", height: "39.1%" },
    radius: "20px 200px 20px 20px",
  },
  {
    src: "/images/2026/05/theraphy-section-fauzan.jpg",
    width: 1300,
    height: 1200,
    style: { left: "30%", top: "42.2%", width: "70%", height: "57.8%" },
    radius: "20px 20px 200px",
  },
];

/**
 * "One on One Private Therapy Available" — photo collage with the circular logo
 * badge and ornaments, beside the intro copy and benefit icons.
 * Shared by the home and About pages, which differ only in the eyebrow.
 */
export default function PrivateTherapy({
  eyebrow = "Our Solution For Your Body Needs",
}: {
  eyebrow?: string;
}) {
  return (
    <section className="pt-[50px] pb-[86px]">
      <Container>
        <div className="mx-auto grid max-w-[1272px] items-center gap-12 lg:grid-cols-[664fr_522fr] lg:gap-[86px]">
          {/* Collage */}
          <Reveal className="relative">
            <div className="relative aspect-[656/734] w-full">
              {/* Decorative botanical art, behind the photos. */}
              <Image
                src="/images/2026/06/grid-png-img-01.png"
                alt=""
                aria-hidden
                width={700}
                height={747}
                className="pointer-events-none absolute -top-[5%] -left-[26%] h-[95%] w-full object-contain"
              />
              <Image
                src="/images/2026/06/grid-png-img-02.png"
                alt=""
                aria-hidden
                width={600}
                height={539}
                className="pointer-events-none absolute top-[31%] left-0 h-[64%] w-[80%] object-contain"
              />

              {photos.map((photo) => (
                <div
                  key={photo.src}
                  className="absolute overflow-hidden"
                  style={{ ...photo.style, borderRadius: photo.radius }}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    aria-hidden
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 1023px) 45vw, 25vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}

              {/* Circular logo badge sitting over the collage seam. */}
              <div className="absolute top-[38%] left-[47%] flex h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white max-[479px]:h-[80px] max-[479px]:w-[80px]">
                <Image
                  src={siteConfig.logo}
                  alt=""
                  aria-hidden
                  width={861}
                  height={861}
                  sizes="116px"
                  className="h-[92px] w-[92px] object-contain max-[479px]:h-[64px] max-[479px]:w-[64px]"
                />
              </div>

            </div>
          </Reveal>

          {/* Copy */}
          <Reveal delay={150}>
            <SectionHeading
              align="left"
              eyebrow={eyebrow}
              title="One on One Private Therapy Available"
              titleClassName="text-primary"
              description="Experience a custom-designed session tailored to your body’s needs. Our expert practitioner will guide you through gentle stretches, helping you move better and feel your best."
            />

            <ul className="mt-10 grid gap-7 sm:grid-cols-2">
              {benefits.map((name) => (
                <li key={name} className="flex items-center gap-4">
                  <span className="text-primary">
                    <BenefitIcon name={name} />
                  </span>
                  <h5 className="text-[24px] leading-[1.26]">
                    {benefitLabels[name]}
                  </h5>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-8">
              <ButtonLink href={contact.whatsapp} external>
                WhatsApp
              </ButtonLink>

              <div className="flex items-center gap-4">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-9 w-9 shrink-0"
                  fill="currentColor"
                >
                  <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.01 12.01 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896a11.82 11.82 0 0 0-3.48-8.45M12.05 21.785h-.004a9.87 9.87 0 0 1-5.032-1.378l-.36-.214-3.741.98 1.005-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.885-9.884a9.83 9.83 0 0 1 6.988 2.9 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.437 9.884-9.888 9.884m5.422-7.403c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.116-.198.058-.372-.03-.52-.086-.15-.66-1.59-.905-2.174-.238-.57-.48-.494-.658-.503l-.56-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
                </svg>

                <div>
                  <p className="text-[16px] leading-tight">Chat Us Anytime</p>
                  <h5 className="mt-1 text-[24px] leading-[1.26]">
                    <a href={contact.phoneHref} className="hover:text-primary">
                      {contact.phone}
                    </a>
                  </h5>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
