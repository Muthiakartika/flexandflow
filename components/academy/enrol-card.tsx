import Link from "next/link";
import { ButtonLink } from "@/components/academy/button";
import { SeatsBadge } from "@/components/academy/badge";
import {
  formatDuration,
  formatPrice,
  openSessions,
  totalMinutes,
  type Discipline,
} from "@/lib/academy";

/**
 * The sticky panel beside a course hero — the one element every platform in
 * the reference set keeps in view while you scroll.
 *
 * It leads with the onsite course rather than the cheaper option, because
 * onsite is the only one where a student's hands get corrected and the only
 * one with a limited supply. The online course and the manual sit under it as
 * the always-available fallback.
 *
 * `sticky` only applies from lg. Below that the card is simply the first
 * thing after the hero copy, which is where it belongs on a phone anyway —
 * pinning a 400px panel inside an 812px viewport would eat half the screen.
 */
export function EnrolCard({ discipline }: { discipline: Discipline }) {
  const open = openSessions(discipline);
  const next = open[0];

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="rounded-surface border border-line bg-white p-6 sm:p-8">
        <p className="eyebrow">Onsite course</p>
        <p className="display mt-2 text-4xl">
          {formatPrice(discipline.onsite.price)}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {discipline.onsite.duration}, {discipline.onsite.schedule}. Hands
          corrected as you work.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          {next ? (
            <>
              <SeatsBadge seatsLeft={next.seatsLeft} />
              <span className="text-sm text-muted">
                Next: <span className="font-bold text-ink">{next.label}</span>
              </span>
            </>
          ) : (
            <>
              <SeatsBadge seatsLeft={0} />
              <span className="text-sm text-muted">
                Every listed date is taken.
              </span>
            </>
          )}
        </div>

        {next ? (
          <ButtonLink
            href={`/academy/register/${discipline.slug}`}
            size="lg"
            className="mt-6 flex w-full"
          >
            Secure a spot
          </ButtonLink>
        ) : (
          <ButtonLink
            href="/academy/schedule"
            size="lg"
            variant="secondary"
            className="mt-6 flex w-full"
          >
            See other dates
          </ButtonLink>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {discipline.onsite.includes.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <span aria-hidden className="mt-0.5 font-bold text-olive">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
            Not in Bali?
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            <li>
              <Link
                href={`/academy/materials/${discipline.slug}`}
                className="-my-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1 text-sm hover:text-olive"
              >
                <span className="font-bold">Online course</span>
                <span className="text-muted">
                  {formatPrice(discipline.online.price)} ·{" "}
                  {formatDuration(totalMinutes(discipline))}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href={`/academy/materials/${discipline.slug}`}
                className="-my-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1 text-sm hover:text-olive"
              >
                <span className="font-bold">Learning pack only</span>
                <span className="text-muted">
                  {formatPrice(discipline.ebook.price)} ·{" "}
                  {discipline.ebook.pages} pages
                </span>
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Neither needs registration — you buy and start straight away.
          </p>
        </div>
      </div>
    </aside>
  );
}
