import { BAND, BAND_LINE, WRAP } from "@/components/ui/tokens";

/**
 * The booking page, before it has loaded.
 *
 * This route is server-rendered per request, and a "Book with Ginny" link
 * makes it do real work before it answers: it looks that slug up in the team
 * so the wizard can open on step two with the choice already made. Without a
 * fallback the visitor stays on the page they clicked from for the whole of
 * that, which is the complaint — the button appeared not to have worked.
 *
 * The shapes are the page's own: the title band, then the three cards step one
 * puts on screen ("Any Staff" and the two therapists). Matching them matters
 * more here than anywhere else on the site, because this is the one page a
 * visitor arrives at having already decided to book — anything that lurches
 * under them at that moment is expensive.
 */
export default function Loading() {
  return (
    <>
      <div className={BAND_LINE}>
        <div
          className={`${WRAP} pt-[clamp(1.25rem,2.4vw,2rem)] pb-[clamp(1.75rem,3vw,2.5rem)]`}
        >
          <span className="page-skeleton h-3 w-[190px]" />
          <span className="page-skeleton mt-4 h-[46px] w-[min(100%,340px)]" />
          <span className="page-skeleton mt-4 h-3 w-[min(100%,44ch)]" />
          <span className="page-skeleton mt-2 h-3 w-[min(100%,32ch)]" />
        </div>
      </div>

      <section className={`${WRAP} ${BAND}`}>
        {/* The stepper: five labels across the top of the wizard. */}
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((step) => (
            <span key={step} className="page-skeleton h-7 w-[104px]" />
          ))}
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="rounded-[10px] border border-secondary/10 bg-white p-4"
            >
              <span className="page-skeleton h-24 w-24 rounded-[10px]" />
              <span className="page-skeleton mt-4 h-5 w-[130px]" />
              <span className="page-skeleton mt-2 h-3 w-[104px]" />
              <span className="page-skeleton mt-4 h-3 w-full" />
            </div>
          ))}
        </div>

        <p className="sr-only" role="status">
          Loading the booking form…
        </p>
      </section>
    </>
  );
}
