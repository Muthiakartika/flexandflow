import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** One admin's page, before it has loaded: details, password, remove. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel>
        <SkeletonFields count={4} />
      </SkeletonPanel>
      <SkeletonPanel>
        <SkeletonFields count={1} />
      </SkeletonPanel>
      <SkeletonPanel>
        <SkeletonFields count={1} />
      </SkeletonPanel>
    </>
  );
}
