import type { Metadata } from "next";

import { PageHeading, Panel } from "@/components/admin/primitives";
import {
  NewServiceForm,
  NewVariantForm,
  ServiceSettingsForm,
} from "@/components/admin/ServiceForms";
import { VariantRowForm } from "@/components/admin/VariantRowForm";
import { requirePermission } from "@/lib/admin/auth";
import { listTherapistOptions, loadServices } from "@/lib/admin/queries";

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

  const [services, therapists] = await Promise.all([
    loadServices(),
    listTherapistOptions(),
  ]);

  return (
    <>
      <PageHeading
        title="Services"
        lede="Prices are whole rupiah. A row that is not bookable disappears from the wizard but keeps its history."
      />

      {/* Two stores, one page each: the Ginny / Yuni rate cards on
          /price-list read these rows (`lib/booking/price-list.ts`); the
          treatment pages, the home grid and the "Pick Your Treatment" grid
          read the treatment editor. The live "Book" buttons read neither. */}
      <div className="admin-card mb-5 border-warn/40 bg-warn-soft p-4">
        <h2 className="text-[15px] font-bold text-warn">
          Which prices on the website this changes
        </h2>
        <p className="mt-1 text-[13px] text-ink">
          The <strong>Ginny and Yuni rate cards</strong> at the top of{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-[12px]">/price-list</code>{" "}
          take their figures from this page, matched by service, therapist tier
          and session length, as soon as you save. The treatment pages, the home
          page and the &ldquo;Pick Your Treatment&rdquo; grid do not — edit
          those under <strong>Treatments</strong>. The site&rsquo;s
          &ldquo;Book&rdquo; buttons go to{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-[12px]">booking.flexandflow.fit</code>
          , which has its own WordPress admin and is not affected by anything
          here.
        </p>
      </div>

      <Panel title="Add a service">
        <NewServiceForm />
      </Panel>

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
            <ServiceSettingsForm service={service} therapists={therapists} />

            {service.variants.length === 0 ? (
              <p className="px-1 py-4 text-center text-[14px] text-faint">
                No price rows. This service cannot be booked.
              </p>
            ) : (
              service.variants.map((variant) => (
                <VariantRowForm key={variant.id} variant={variant} />
              ))
            )}

            <NewVariantForm serviceId={service.id} />
          </Panel>
        ))
      )}
    </>
  );
}
