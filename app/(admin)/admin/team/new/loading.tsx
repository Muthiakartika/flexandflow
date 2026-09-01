import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The add-admin form, before it has loaded. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false}>
        <SkeletonFields count={3} />
      </SkeletonPanel>
    </>
  );
}
