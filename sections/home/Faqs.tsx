import Image from "next/image";

import Accordion from "@/components/ui/Accordion";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { homeFaqs } from "@/lib/data/home";

/**
 * FAQs beside the studio photo, over the theme's botanical background. The
 * whole band carries the same scalloped mask as the Complete Wellness photo.
 */
export default function Faqs() {
  return (
    <section
      className="section-mask band relative bg-cover bg-center px-[76px] max-[1024px]:px-8 max-[767px]:px-5"
      style={{ backgroundImage: "url('/images/2026/06/faq-bg-.jpg')" }}
    >
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="text-primary">FAQs</h2>
            </Reveal>

            <Reveal delay={120}>
              <Accordion items={homeFaqs} className="mt-8" />
            </Reveal>
          </div>

          <Reveal delay={150} className="lg:sticky lg:top-10">
            <Image
              src="/images/2026/06/studio-new.jpg"
              alt=""
              aria-hidden
              width={1300}
              height={1200}
              sizes="(max-width: 1023px) 90vw, 45vw"
              className="h-auto w-full rounded-[var(--radius-2x)] object-cover"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
