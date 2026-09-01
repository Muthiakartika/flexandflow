import { SkeletonFields, SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      {[0, 1].map((i) => (
        <SkeletonPanel key={i}>
          <SkeletonFields count={4} />
        </SkeletonPanel>
      ))}
    </>
  );
}
