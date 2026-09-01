import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false}>
        <SkeletonFields count={2} />
      </SkeletonPanel>
    </>
  );
}
