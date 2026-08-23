import {
  SkeletonFields,
  SkeletonHeading,
  SkeletonPanel,
} from "@/components/admin/Skeleton";

/** Working hours and time off, before they have loaded. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonPanel>
        <SkeletonFields count={4} />
      </SkeletonPanel>
      <SkeletonPanel columns={5} rows={5} />
    </>
  );
}
