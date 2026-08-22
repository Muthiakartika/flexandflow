import Link from "next/link";

import { wahaHealth } from "@/lib/notifications";

/**
 * The red banner that says the WhatsApp session has fallen over.
 *
 * A WAHA session logs out quietly. The phone it is paired with gets a new SIM,
 * or WhatsApp is opened on another device, and the session drops to
 * `SCAN_QR_CODE` — after which every confirmation and every reminder fails,
 * bookings keep arriving normally, and **nothing else in this product would
 * ever say so**. Email is the safety net, but plenty of customers here give a
 * phone number and no address. So this sits on the page the studio opens every
 * morning, in the loudest colour the palette has.
 *
 * `wahaHealth()` reaching over the network can itself fail; that is not a
 * reason to blank the agenda, so a thrown error is reported as unknown health,
 * which reads the same way to whoever is looking at it — go and check.
 */
export async function WahaBanner() {
  let ok = false;
  let status = "UNREACHABLE";
  let detail: string | undefined;

  try {
    const health = await wahaHealth();
    ok = health.ok;
    status = health.status;
    detail = health.detail;
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error);
  }

  if (ok) return null;

  return (
    <div
      role="alert"
      className="mb-5 rounded-[10px] border border-danger bg-danger-soft px-4 py-3"
    >
      <p className="text-[15px] font-bold text-danger">
        WhatsApp is not sending. Session status: {status}.
      </p>
      <p className="mt-1 text-[13px] text-ink">
        Confirmations and reminders are queuing up and failing. Re-scan the QR
        code on the WAHA server, then run the queue by hand from Settings.
        Customers who gave an email address are still being emailed; customers
        who gave only a phone number have heard nothing.
      </p>
      {detail ? (
        <p className="mt-1 text-[12px] break-words text-muted">{detail}</p>
      ) : null}
      <Link href="/admin/settings/" className="admin-btn admin-btn-danger mt-3">
        Open settings
      </Link>
    </div>
  );
}
