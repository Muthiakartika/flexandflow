import {
  SkeletonHeading,
  SkeletonPanel,
  SkeletonStats,
} from "@/components/admin/Skeleton";

/**
 * Settings, before it has loaded.
 *
 * Slower than the rest on purpose: this page asks the studio's WAHA server
 * whether the WhatsApp session is still signed in, and that is a network call
 * to a box in Bali. It is the page most worth showing a skeleton for.
 */
export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonPanel>
        <div className="admin-skeleton h-4 w-[220px] rounded-[6px]" />
      </SkeletonPanel>
      <SkeletonStats count={3} />
      <SkeletonPanel columns={6} rows={3} />
    </>
  );
}
