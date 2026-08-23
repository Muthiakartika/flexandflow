import {
  SkeletonHeading,
  SkeletonPanel,
  SkeletonStats,
} from "@/components/admin/Skeleton";

/**
 * The agenda, before it has loaded.
 *
 * Next wraps `page.tsx` and everything below it in a Suspense boundary with
 * this as the fallback, so a click on "Today" paints immediately and the
 * sidebar stays live while the query runs. It shows on client navigation
 * between panel pages, where `(admin)/layout.tsx` is shared and is not
 * re-rendered — the layout reads cookies and the database, and Next has to
 * finish it before any fallback can appear, which is only true on the first
 * entry into the panel.
 */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonStats count={4} />
      {/* The money strip: three figures side by side. */}
      <div className="admin-card mb-5 flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
        {[0, 1, 2].map((figure) => (
          <div key={figure}>
            <div className="admin-skeleton h-3 w-[120px] rounded-[6px]" />
            <div className="admin-skeleton mt-2 h-5 w-[96px] rounded-[6px]" />
          </div>
        ))}
      </div>
      {/* Nine columns, the same as the real agenda table. */}
      <SkeletonPanel columns={9} rows={4} />
    </>
  );
}
