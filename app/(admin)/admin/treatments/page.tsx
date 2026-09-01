import type { Metadata } from "next";

import ContentTable from "@/components/cms/ContentTable";
import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { SearchBox } from "@/components/cms/SearchBox";
import { can, requirePermission } from "@/lib/admin/auth";
import { listDocs } from "@/lib/cms/admin";

export const metadata: Metadata = {
  title: "Treatments",
};

export default async function TreatmentsPage(
  props: PageProps<"/admin/treatments">,
) {
  const admin = await requirePermission("content.view");
  const { q } = await props.searchParams;
  const search = Array.isArray(q) ? q[0] : q;

  const rows = await listDocs("SERVICE", search);

  return (
    <>
      <PageHeading
        title="Treatments"
        lede="The treatment pages on the website. Editing one never changes the live page until you publish."
        actions={
          can(admin, "content.create") ? (
            <PendingLink
              href="/admin/treatments/new/"
              className="admin-btn admin-btn-solid"
            >
              New treatment
            </PendingLink>
          ) : undefined
        }
      />

      {/* Not the same thing as Booking prices, and the two have been confused
          here before. Said once, at the top, rather than in a tooltip. */}
      <div className="admin-card mb-5 border-line bg-surface p-4">
        <p className="text-[13px] text-muted">
          These are the <strong className="text-ink">pages</strong> — the words,
          pictures and printed rates. What the booking system actually charges
          lives under <strong className="text-ink">Booking prices</strong>. After
          changing a rate here, run{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-[12px]">
            npm run check:prices
          </code>
          .
        </p>
      </div>

      <Panel>
        <SearchBox placeholder="Search treatments" defaultValue={search ?? ""} />
        <div className="mt-3">
          <ContentTable
            rows={rows}
            basePath="/admin/treatments"
            canDelete={can(admin, "content.delete")}
            canReorder={can(admin, "content.update")}
            /* The arrows move the treatment on `/services` and `/price-list`,
               which is the order the studio actually cares about. */
            list="grid"
            emptyMessage={
              search ? "No treatments match that search." : "No treatments yet."
            }
          />
        </div>
      </Panel>

      <p className="text-[13px] text-faint">
        The arrows reorder the grid on <code>/services</code> and{" "}
        <code>/price-list</code>. Treatments with no published rates sit outside
        that grid and cannot be moved — that is deliberate for the two pages
        which are live but appear on no menu.
      </p>
    </>
  );
}
