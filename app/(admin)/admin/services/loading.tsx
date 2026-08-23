import { SkeletonHeading, SkeletonPanel } from "@/components/admin/Skeleton";

/** The catalogue, before it has loaded: one panel per service. */
export default function Loading() {
  return (
    <>
      <SkeletonHeading />
      {[0, 1, 2].map((service) => (
        <SkeletonPanel key={service} columns={5} rows={2} />
      ))}
    </>
  );
}
