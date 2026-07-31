import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import { therapistBySlug, therapists } from "@/lib/data/therapists";

export function generateStaticParams() {
  return therapists.map((therapist) => ({ slug: therapist.slug }));
}

export async function generateMetadata(
  props: PageProps<"/therapist/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const therapist = therapistBySlug.get(slug);
  if (!therapist) return {};

  return {
    title: therapist.seoTitle,
    description: therapist.approach,
    alternates: { canonical: `/therapist/${therapist.slug}/` },
    openGraph: {
      title: therapist.seoTitle,
      description: therapist.approach,
      url: `/therapist/${therapist.slug}/`,
      type: "profile",
      images: [therapist.portrait],
    },
  };
}

/**
 * Therapist profile: a three-part row — portrait, bio text, and the scene
 * photo with "Her Approach" plus a black "Contact Now" pill stacked beneath it
 * in the same column. The original doesn't show working hours on this page
 * (only in the About page's team grid, and even there at font-size 0).
 */
export default async function TherapistPage(
  props: PageProps<"/therapist/[slug]">,
) {
  const { slug } = await props.params;
  const therapist = therapistBySlug.get(slug);
  if (!therapist) notFound();

  return (
    <>
      <PageHero
        title={therapist.name}
        crumbs={[
          { label: "About us", href: "/about-us" },
          { label: therapist.name },
        ]}
      />

      <section className="hero-gap-top px-[30px] pb-[80px] max-[767px]:px-5">
        <div className="mx-auto grid w-full max-w-[1300px] gap-10 lg:grid-cols-[380px_1fr_390px]">
          <Reveal>
            <Image
              src={therapist.portrait}
              alt={therapist.name}
              width={1300}
              height={1200}
              sizes="(max-width: 1023px) 90vw, 380px"
              className="h-full min-h-[400px] w-full rounded-[var(--radius-2x)] object-cover"
            />
          </Reveal>

          <Reveal delay={100}>
            <h3 className="text-[var(--fs-h3)]">{therapist.name}</h3>
            <p className="mt-[-8px] text-[16px]">{therapist.role}</p>

            <h4 className="mt-8 text-[var(--fs-h4)]">Specialized In</h4>
            <p className="mt-2 text-[16px] leading-[1.625]">
              {therapist.specializedIn}
            </p>

            <h4 className="mt-8 text-[var(--fs-h4)]">About Me</h4>
            <div className="mt-2 flex flex-col gap-4 text-[16px] leading-[1.625]">
              {therapist.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {therapist.instagram ? (
              <>
                <h4 className="mt-8 text-[var(--fs-h4)]">Social Media</h4>
                <a
                  href={therapist.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="mt-3 flex h-8 w-8 items-center justify-center rounded-full border border-secondary/60 text-secondary transition-colors duration-300 hover:border-primary hover:text-primary"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-[14px] w-[14px]"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.586 2.163 15.206 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608C4.519 2.567 5.786 2.293 7.152 2.231 8.418 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8" />
                  </svg>
                </a>
              </>
            ) : null}
          </Reveal>

          <Reveal delay={200}>
            <Image
              src={therapist.sceneImage}
              alt=""
              aria-hidden
              width={1300}
              height={1200}
              sizes="(max-width: 1023px) 90vw, 390px"
              className="h-auto w-full rounded-[var(--radius-2x)] object-cover"
            />

            <div className="mt-10 text-center">
              <h2 className="text-[var(--fs-h4)]">Her Approach</h2>
              <p className="mt-2 text-[16px] leading-[1.625]">
                {therapist.approach}
              </p>

              <div className="mt-6 flex justify-center">
                <ButtonLink href="/contact-us" variant="dark">
                  Contact Now
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
