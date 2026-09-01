import { SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The admin list, before it has loaded. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false} columns={6} rows={3} />
    </>
  );
}
