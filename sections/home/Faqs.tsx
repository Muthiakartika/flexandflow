import InlineFaq from "@/components/content/InlineFaq";
import { FOCUS, H2, WRAP } from "@/components/ui/tokens";
import { homeFaqs } from "@/lib/data/home";
import { contact } from "@/lib/site";

/**
 * The questions people ask before they book, with the heading beside them on
 * a wide screen. The answers are the treatment pages' numbered FAQ cards
 * (`InlineFaq`, `variant="cards"`), so the site asks and answers in one
 * style. The "Visit us" card that used to sit here repeated the
 * footer's address, hours and contacts word for word, one band above them.
 */
export default function Faqs() {
  return (
    <section className="page-band-line" aria-labelledby="home-faqs">
      <div className={`${WRAP} home-band home-faqs`}>
        <div className="home-faqs-head">
          <p className="page-label">FAQs</p>
          <h2 id="home-faqs" className={`mt-2 ${H2}`}>
            Before You Book
          </h2>
          <p className="mt-3 font-body text-[15px] leading-[1.7] text-body-text/75">
            Anything else?{" "}
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-primary-strong transition-colors duration-300 hover:text-secondary ${FOCUS}`}
            >
              Ask us on WhatsApp
            </a>
            .
          </p>
        </div>

        <div className="home-faqs-list">
          <InlineFaq items={homeFaqs} variant="cards" />
        </div>
      </div>
    </section>
  );
}
