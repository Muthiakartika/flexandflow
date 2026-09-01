import type { Metadata } from "next";

import { PageHeading, Panel } from "@/components/admin/primitives";
import { VariantRowForm } from "@/components/admin/VariantRowForm";
import { requirePermission } from "@/lib/admin/auth";
import { loadServices } from "@/lib/admin/queries";

export const metadata: Metadata = {
  title: "Services",
};

/**
 * The bookable catalogue and its prices.
 *
 * These rows are what the wizard charges. They are *not* what the marketing
 * pages print, and the banner at the top of this page exists because that has
 * caught people out here three separate times.
 */
export default async function AdminServicesPage() {
  await requirePermission("booking.manage");

  const services = await loadServices();

  return (
    <>
      <PageHeading
        title="Services"
        lede="Prices are whole rupiah. A row that is not bookable disappears from the wizard but keeps its history."
      />

      {/* Not decoration. `lib/data/services.ts` is a hand-maintained file that
          the eight public service pages and the home grid derive their figures
          from; this table is the database the booking wizard charges against.
          Changing one has never changed the other, and this repo has published
          a wrong price three times. */}
      <div className="admin-card mb-5 border-warn/40 bg-warn-soft p-4">
        <h2 className="text-[15px] font-bold text-warn">
          This does not change the prices on the website
        </h2>
        <p className="mt-1 text-[13px] text-ink">
          The public service pages and the home page take their figures from{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-[12px]">
            lib/data/services.ts
          </code>
          , a separate file in the codebase. Editing a price here changes what
          the booking wizard charges and nothing else. After changing anything
          on this page, run{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-[12px]">
            npm run check:prices
          </code>{" "}
          — it reports every figure where the two disagree. Three wrong prices
          have gone live on this site by skipping that step.
        </p>
      </div>

      {services.length === 0 ? (
        <Panel>
          <p className="px-1 py-6 text-center text-[14px] text-faint">
            No services have been set up yet.
          </p>
        </Panel>
      ) : (
        services.map((service) => (
          <Panel
            key={service.id}
            title={service.title}
            description={
              <>
                <code className="text-[12px]">{service.slug}</code> ·{" "}
                {service.bufferMinutes} min clean-down after each session ·{" "}
                {service.active ? "listed" : "not listed"}
              </>
            }
          >
            {service.variants.length === 0 ? (
              <p className="px-1 py-4 text-center text-[14px] text-faint">
                No price rows. This service cannot be booked.
              </p>
            ) : (
              service.variants.map((variant) => (
                <VariantRowForm key={variant.id} variant={variant} />
              ))
            )}
          </Panel>
        ))
      )}
    </>
  );
}
