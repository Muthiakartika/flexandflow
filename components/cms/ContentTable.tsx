import Link from "next/link";

import { ContentRowActions } from "@/components/cms/ContentRowActions";
import { Empty, TableBox } from "@/components/admin/primitives";
import { publicPath, type DocRow } from "@/lib/cms/admin";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * One list of pages.
 *
 * Three states, not two: live, draft, and **live with unpublished changes** —
 * the last is the one that goes wrong quietly, because the page looks fine and
 * the edit somebody made is nowhere on the site. It gets its own chip.
 */
export default function ContentTable({
  rows,
  basePath,
  canDelete,
  canReorder,
  list,
  emptyMessage,
}: {
  rows: DocRow[];
  /** `/admin/treatments` or `/admin/blog`. */
  basePath: string;
  canDelete: boolean;
  canReorder: boolean;
  list: "reading" | "grid";
  emptyMessage: string;
}) {
  if (rows.length === 0) return <Empty>{emptyMessage}</Empty>;

  return (
    <TableBox>
      <table className="admin-table min-w-[46rem]">
        <thead>
          <tr>
            <th>Page</th>
            <th>Status</th>
            <th>Web address</th>
            <th>Last changed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link
                  href={`${basePath}/${row.id}/`}
                  className="font-bold text-ink underline underline-offset-2"
                >
                  {row.title}
                </Link>
              </td>

              <td className="whitespace-nowrap">
                {row.status === "PUBLISHED" ? (
                  row.hasUnpublishedChanges ? (
                    <span
                      className="admin-chip bg-warn-soft text-warn"
                      title={`The site shows version ${row.publishedVersion}; version ${row.latestVersion} is saved but not published.`}
                    >
                      live · edited
                    </span>
                  ) : (
                    <span className="admin-chip bg-ok-soft text-ok">live</span>
                  )
                ) : (
                  <span className="admin-chip bg-cream text-muted">draft</span>
                )}
              </td>

              <td>
                {row.status === "PUBLISHED" ? (
                  <a
                    href={publicPath(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] break-all text-olive-strong underline underline-offset-2"
                  >
                    {publicPath(row)}
                  </a>
                ) : (
                  <span className="text-[13px] break-all text-faint">
                    {publicPath(row)}
                  </span>
                )}
              </td>

              <td className="whitespace-nowrap text-[13px] text-muted">
                {dateFormat.format(row.updatedAt)}
                {row.updatedBy ? (
                  <span className="block text-[12px] text-faint">
                    {row.updatedBy}
                  </span>
                ) : null}
              </td>

              <td>
                <ContentRowActions
                  docId={row.id}
                  title={row.title}
                  isPublished={row.status === "PUBLISHED"}
                  canDelete={canDelete}
                  canReorder={canReorder}
                  list={list}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  );
}
