import { CONTACT, FAQS } from "@/lib/academy";
import { Accordion } from "@/components/academy/accordion";
import { ButtonLink } from "@/components/academy/button";
import { PageIntro } from "@/components/academy/page-intro";
import { Section, SectionHeader } from "@/components/academy/section";

export const metadata = {
  title: "FAQ",
  description:
    "Answers about class size, registration, certificates, cancellations and what is included in the assisted stretching programme.",
};

export default function FaqPage() {
  return (
    <>
      <PageIntro
        eyebrow="FAQ"
        title="Questions, answered plainly."
        lead="The things people ask us before booking. If yours is not here, message us on WhatsApp — the same person who teaches the workshops answers it."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <SectionHeader
            eyebrow="Everything else"
            title="Before you book."
          />
          <Accordion items={FAQS} />
        </div>
      </Section>

      <Section tone="paper">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="display max-w-2xl text-4xl sm:text-5xl">
            Still not sure which format fits?
          </h2>
          <p className="max-w-xl text-base text-muted">
            Tell us where you are in your practice and what you want to offer
            clients. We will point you to the right one, even if that means
            telling you to wait a quarter.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <ButtonLink href={CONTACT.whatsapp} size="lg">
              Message us on WhatsApp
            </ButtonLink>
            <ButtonLink href="/academy/contact" variant="secondary" size="lg">
              Send a message
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
