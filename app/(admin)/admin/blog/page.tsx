import type { Metadata } from "next";

import ContentTable from "@/components/cms/ContentTable";
import { PendingLink } from "@/components/admin/PendingLink";
import { PageHeading, Panel } from "@/components/admin/primitives";
import { SearchBox } from "@/components/cms/SearchBox";
import { can, requirePermission } from "@/lib/admin/auth";
import { listDocs } from "@/lib/cms/admin";

export const metadata: Metadata = {
  title: "Blog",
};

export default async function BlogAdminPage(props: PageProps<"/admin/blog">) {
  const admin = await requirePermission("content.view");
  const { q } = await props.searchParams;
  const search = Array.isArray(q) ? q[0] : q;

  const rows = await listDocs("POST", search);

  return (
    <>
      <PageHeading
        title="Blog"
        lede="Articles. A post's category decides its web address, so it cannot be moved between categories without changing the address."
        actions={
          <>
            <PendingLink
              href="/admin/blog/categories/"
              className="admin-btn admin-btn-quiet"
            >
              Categories
            </PendingLink>
            {can(admin, "content.create") ? (
              <PendingLink
                href="/admin/blog/new/"
                className="admin-btn admin-btn-solid"
              >
                New post
              </PendingLink>
            ) : null}
          </>
        }
      />

      <Panel>
        <SearchBox placeholder="Search posts" defaultValue={search ?? ""} />
        <div className="mt-3">
          <ContentTable
            rows={rows}
            basePath="/admin/blog"
            canDelete={can(admin, "content.delete")}
            canReorder={can(admin, "content.update")}
            list="reading"
            emptyMessage={
              search ? "No posts match that search." : "No posts yet."
            }
          />
        </div>
      </Panel>

      <p className="text-[13px] text-faint">
        The arrows set the order on <code>/blog</code>, and with it which posts
        land on page one.
      </p>
    </>
  );
}
