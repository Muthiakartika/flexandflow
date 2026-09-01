import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The profile page, before it has loaded: details, password, permissions. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonPanel>
        <SkeletonFields count={2} />
      </SkeletonPanel>
      <SkeletonPanel>
        <SkeletonFields count={3} />
      </SkeletonPanel>
      <SkeletonPanel>
        <SkeletonFields count={2} />
      </SkeletonPanel>
    </>
  );
}
