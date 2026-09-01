import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The editor, before the draft has loaded. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false}>
        <SkeletonFields count={3} />
      </SkeletonPanel>
      <SkeletonPanel header={false}>
        <SkeletonFields count={6} />
      </SkeletonPanel>
    </>
  );
}
