import type { Metadata } from "next";

import { IntakeForm } from "@/components/intake/IntakeForm";
import { BAND, H1, WRAP } from "@/components/ui/tokens";
import { listPublicIntakeFields } from "@/lib/intake/read";

const description =
  "Every booking starts here. Complete this form and you'll go straight to " +
  "the booking page — no account, no separate steps.";

export const metadata: Metadata = {
  title: "Client Intake and Consent - Flex and Flow",
  description,
  /* Paperwork, not marketing content — the studio sends this link directly
     to a client, so there is nothing here worth indexing. */
  robots: { index: false, follow: false },
  alternates: { canonical: "/intake/" },
};

/**
 * The client intake & consent form, at `/intake/` — replaces the external
 * JotForm the studio used before. See INTAKE-PLAN.md.
 *
 * Every booking CTA on the site sends a visitor here first, with no memory
 * of a prior visit: this is the one required step before booking, every
 * time. `SiteChrome` hides the header and footer specifically on this route
 * so there is no obvious way to click off to another page mid-form, which is
 * also why this page builds its own small heading rather than `PageHero` —
 * that component always renders a "Home" breadcrumb link, which would undo
 * the point.
 *
 * Field content is loaded fresh (through the cache tag in
 * `lib/intake/read.ts`) rather than hard-coded, because SUPER_ADMIN can edit
 * every label, help line, option list and required flag from
 * `/admin/intake/`.
 */
export default async function IntakePage() {
  const fields = await listPublicIntakeFields();

  return (
    <section className={`${WRAP} ${BAND} max-w-[820px]`}>
      <h1 className={H1}>Client Intake and Consent</h1>
      <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.7] text-body-text/75">
        {description}
      </p>

      <div className="mt-8">
        <IntakeForm fields={fields} />
      </div>
    </section>
  );
}
