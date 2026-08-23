import {
  SkeletonFields,
  SkeletonHeading,
  SkeletonPanel,
} from "@/components/admin/Skeleton";

/** One booking, before it has loaded: the session, the customer, the messages. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      <div className="grid gap-5 lg:grid-cols-2">
        <SkeletonPanel>
          <SkeletonFields count={4} />
        </SkeletonPanel>
        <SkeletonPanel>
          <SkeletonFields count={4} />
        </SkeletonPanel>
      </div>
      <SkeletonPanel columns={6} rows={4} />
    </>
  );
}
