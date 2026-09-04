import { SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonPanel>
        <div className="admin-skeleton h-4 w-[220px] rounded-[6px]" />
      </SkeletonPanel>
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonPanel key={index}>
          <div className="admin-skeleton h-4 w-[180px] rounded-[6px]" />
          <div className="admin-skeleton mt-2 h-4 w-full rounded-[6px]" />
        </SkeletonPanel>
      ))}
    </>
  );
}
