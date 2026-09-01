import { SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The treatment list, before it has loaded. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false} columns={5} rows={6} />
    </>
  );
}
