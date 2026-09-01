import Link from "next/link";

import { Stat } from "@/components/admin/primitives";
import { contentStats, publicPath } from "@/lib/cms/admin";

const format = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/**
 * The content half of the panel's home page.
 *
 * Four figures and a recent list. The one that earns its place is **"edited,
 * not published"**: a page that is live while somebody's changes sit in a
 * draft looks completely normal from the outside, so nothing else on the site
 * or in this panel would ever surface it.
 */
export default async function ContentOverview() {
  const stats = await contentStats();

  return (
    <section className="mb-5">
      <h2 className="mb-3 font-display text-[26px] leading-none font-bold text-ink">
        Website content
      </h2>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Treatments"
          value={String(stats.treatments.total)}
          hint={`${stats.treatments.published} live · ${stats.treatments.drafts} draft`}
        />
        <Stat
          label="Blog posts"
          value={String(stats.posts.total)}
          hint={`${stats.posts.published} live · ${stats.posts.drafts} draft`}
        />
        <Stat
          label="Drafts"
          value={String(stats.treatments.drafts + stats.posts.drafts)}
          hint="Not on the website yet"
        />
        <Stat
          label="Edited, not published"
          value={String(stats.pendingChanges)}
          hint={
            stats.pendingChanges === 0
              ? "Everything live is up to date"
              : "Live pages with newer drafts"
          }
        />
      </div>

      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h3 className="text-[15px] font-bold text-ink">Recently changed</h3>
          <span className="flex gap-3 text-[13px]">
            <Link
              href="/admin/treatments/"
              className="text-olive-strong underline underline-offset-2"
            >
              Treatments
            </Link>
            <Link
              href="/admin/blog/"
              className="text-olive-strong underline underline-offset-2"
            >
              Blog
            </Link>
          </span>
        </div>

        <div className="p-4">
          {stats.recent.length === 0 ? (
            <p className="py-4 text-center text-[14px] text-faint">
              Nothing has been edited yet.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {stats.recent.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 py-2 last:border-b-0"
                >
                  <span className="min-w-0">
                    <Link
                      href={`/admin/${row.kind === "SERVICE" ? "treatments" : "blog"}/${row.id}/`}
                      className="text-[14px] font-bold text-ink underline underline-offset-2"
                    >
                      {row.title}
                    </Link>
                    <span className="mt-0.5 block text-[12px] break-all text-faint">
                      {publicPath(row)}
                    </span>
                  </span>

                  <span className="flex items-center gap-2 whitespace-nowrap">
                    {row.status === "PUBLISHED" ? (
                      row.hasUnpublishedChanges ? (
                        <span className="admin-chip bg-warn-soft text-warn">
                          live · edited
                        </span>
                      ) : (
                        <span className="admin-chip bg-ok-soft text-ok">live</span>
                      )
                    ) : (
                      <span className="admin-chip bg-cream text-muted">draft</span>
                    )}
                    <span className="text-[12px] text-faint">
                      {format.format(row.updatedAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
