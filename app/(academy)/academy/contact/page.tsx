import Image from "next/image";
import { CONTACT } from "@/lib/academy";
import { ContactForm } from "@/components/academy/contact-form";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";

export const metadata = {
  title: "Contact",
  description:
    "Talk to Flex & Flow Academy about the assisted stretching programme, workshop dates and private sessions. Uluwatu, Bali.",
};

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Talk to the person who teaches."
        lead="Not sure which format fits, or want a date that is not listed? Ask us. The instructor answers these herself, so the advice is honest even when it costs us a booking."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <ContactForm />

          <div className="flex flex-col gap-8">
            <div>
              <h2 className="eyebrow">Fastest route</h2>
              <a
                href={CONTACT.whatsapp}
                className="display mt-2 block text-3xl hover:text-olive"
              >
                WhatsApp {CONTACT.whatsappLabel}
              </a>
              <p className="mt-2 text-sm text-muted">
                Usually answered the same day.
              </p>
            </div>

            <div className="border-t border-line pt-8">
              <h2 className="eyebrow">Email</h2>
              <a
                href={`mailto:${CONTACT.email}`}
                className="mt-2 block text-lg font-bold break-all hover:text-olive"
              >
                {CONTACT.email}
              </a>
            </div>

            <div className="border-t border-line pt-8">
              <h2 className="eyebrow">The studio</h2>
              <p className="mt-2 text-base font-bold">{CONTACT.studio}</p>
              <p className="mt-1 text-sm text-muted">{CONTACT.address}</p>
              <p className="mt-3 text-sm text-muted">{CONTACT.hours}</p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-surface">
              <Image
                src="/photos/studio.jpg"
                alt="The Flex & Flow studio in Uluwatu, Bali"
                fill
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader
          eyebrow="Also worth knowing"
          title="Two things people often ask here."
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-2">
          <div className="rounded-surface bg-white p-6">
            <h3 className="text-lg font-bold">
              Do you run private workshops?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Yes — for studios and teams who want a date of their own. Tell us
              how many therapists and roughly when, and we will quote it.
            </p>
          </div>
          <div className="rounded-surface bg-white p-6">
            <h3 className="text-lg font-bold">
              Can I visit the studio first?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Of course. Message us and we will find a quiet hour between
              treatments so you can see the room you would be training in.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
