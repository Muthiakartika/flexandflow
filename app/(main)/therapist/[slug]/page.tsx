import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/Button";
import PageHero from "@/components/ui/PageHero";
import { BAND, CARD, FOCUS, H3, WRAP } from "@/components/ui/tokens";
import { therapistBySlug, therapists } from "@/lib/data/therapists";
import { externalBookingUrl, contact, workingHours } from "@/lib/site";

export function generateStaticParams() {
  return therapists.map((therapist) => ({ slug: therapist.slug }));
}

export async function generateMetadata(
  props: PageProps<"/therapist/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const therapist = therapistBySlug.get(slug);
  if (!therapist) return {};

  /* Mirrors the live WordPress head: therapist profiles are `noindex, follow`
     there and carry no meta description, only an og:description. Keep both —
     dropping the profiles out of the index is deliberate on the source site. */
  return {
    title: therapist.seoTitle,
    /* `null`, not omitted: an absent field inherits the root layout's
       description, which would put the home page's wording on every profile. */
    description: null,
    alternates: { canonical: `/therapist/${therapist.slug}/` },
    robots: { index: false, follow: true },
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
 * Therapist profile.
 *
 * The clone ran three fixed columns — portrait, bio, scene photo — which broke
 * the reading order: "Her Approach" sat in the right-hand column, below a
 * photo, nowhere near the bio it belonged to. Here the bio runs as one column
 * with the practical card beside it, and the WhatsApp message it opens already
 * names the practitioner.
 */
export default async function TherapistPage(
  props: PageProps<"/therapist/[slug]">,
) {
  const { slug } = await props.params;
  const therapist = therapistBySlug.get(slug);
  if (!therapist) notFound();

  /* booking.flexandflow.fit — a WordPress plugin that reads no query string,
     so there's no per-therapist link to build. The studio's phone number
     stays under the button in the aside for anyone who would rather just ask
     a question first. */
  const bookingHref = externalBookingUrl;

  return (
    <>
      <PageHero
        title={therapist.name}
        eyebrow={therapist.role}
        crumbs={[
          { label: "About us", href: "/about-us" },
          { label: therapist.name },
        ]}
        actions={
          <ButtonLink href={bookingHref} external variant="solid">
            Book with {therapist.name}
          </ButtonLink>
        }
      />

      <section className={`${WRAP} ${BAND}`}>
        <div className="grid gap-[clamp(1.75rem,3vw,3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <article>
            <div className="grid gap-3 sm:grid-cols-2">
              <Image
                src={therapist.portrait}
                alt={therapist.name}
                width={1600}
                height={2000}
                priority
                sizes="(max-width: 640px) 92vw, 506px"
                className="aspect-[4/5] w-full rounded-[10px] object-cover object-top"
              />
              <Image
                src={therapist.sceneImage}
                alt={`${therapist.name} working with a client`}
                width={1800}
                height={1800}
                sizes="(max-width: 640px) 92vw, 506px"
                className="aspect-[4/5] w-full rounded-[10px] object-cover"
              />
            </div>

            <h2 className={`mt-8 ${H3}`}>About Me</h2>
            <div className="mt-3 flex flex-col gap-3">
              {therapist.about.map((paragraph) => (
                <p
                  key={paragraph}
                  className="max-w-[68ch] font-body text-[15px] leading-[1.75] text-body-text/80"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <h2 className={`mt-8 ${H3}`}>Her Approach</h2>
            <p className="mt-3 max-w-[68ch] font-body text-[15px] leading-[1.75] text-body-text/80">
              {therapist.approach}
            </p>
          </article>

          {/* ── Specialisms, hours and the way to book ──────────────────── */}
          {/* First on a phone: what this person does and how to reach them
              beats scrolling the bio to find out. */}
          <aside className="order-first lg:order-none lg:sticky lg:top-[92px] lg:h-fit">
            <div className={`${CARD} p-5`}>
              <h2 className="page-label">Specialized In</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {therapist.specializedIn.split("•").map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full border border-secondary/12 px-2.5 py-1 font-body text-[12px] leading-none text-body-text/75"
                  >
                    {skill.trim()}
                  </li>
                ))}
              </ul>

              <h2 className="page-label mt-5 border-t border-secondary/10 pt-4">
                Hours
              </h2>
              {workingHours.map((slot) => (
                <p
                  key={slot.days}
                  className="mt-1.5 font-body text-[14px] leading-[1.6]"
                >
                  {slot.days} &middot; {slot.hours}
                </p>
              ))}

              <a
                href={bookingHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 flex w-full items-center justify-center rounded-[10px] bg-primary-strong px-5 py-3 font-body text-[14px] leading-none text-white transition-colors duration-300 hover:bg-secondary ${FOCUS}`}
              >
                Book with {therapist.name}
              </a>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <a
                  href={contact.phoneHref}
                  className={`font-body text-[14px] tabular-nums transition-colors duration-300 hover:text-primary ${FOCUS}`}
                >
                  {contact.phone}
                </a>
                {therapist.instagram ? (
                  <a
                    href={therapist.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-body text-[14px] underline decoration-secondary/25 underline-offset-[5px] transition-colors duration-300 hover:text-primary ${FOCUS}`}
                  >
                    Instagram
                  </a>
                ) : null}
              </div>
            </div>

            <div className={`mt-3 ${CARD} p-5`}>
              <h2 className="page-label">The other practitioner</h2>
              <ul className="mt-3">
                {therapists
                  .filter((other) => other.slug !== therapist.slug)
                  .map((other) => (
                    <li key={other.slug}>
                      <ButtonLink
                        href={`/therapist/${other.slug}`}
                        className="w-full"
                      >
                        {other.name}
                      </ButtonLink>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
