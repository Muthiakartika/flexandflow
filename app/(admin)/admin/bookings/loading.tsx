import {
  SkeletonFields,
  SkeletonHeading,
  SkeletonPanel,
} from "@/components/admin/Skeleton";

/**
 * The bookings list, before it has loaded.
 *
 * The filter row is drawn as six fields because that is what it is, and it
 * matters that they are: this fallback also appears when the studio changes a
 * filter and submits, and a skeleton whose filter row is a different height
 * from the real one would jump the whole table the moment it lands.
 */
export default function Loading() {
  return (
    <>
      <SkeletonHeading action />
      <SkeletonPanel header={false}>
        <SkeletonFields count={6} />
      </SkeletonPanel>
      <SkeletonPanel columns={9} rows={8} />
    </>
  );
}
