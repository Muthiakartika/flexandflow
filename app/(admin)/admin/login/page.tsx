import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { currentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * The one page in this group `proxy.ts` lets through unauthenticated — it has
 * to, or the redirect it performs points at a page that redirects, and the
 * browser gives up after twenty hops.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* Already signed in and back on the login page — usually the browser
     restoring a tab. Send them where they were going instead of asking for a
     password they have already given. */
  if (await currentAdmin()) redirect("/admin/");

  const params = await searchParams;
  const raw = params.next;
  const next = typeof raw === "string" ? raw : "/admin/";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-[380px]">
        <h1 className="font-display text-[40px] leading-none font-bold text-ink">
          Flex &amp; Flow
        </h1>
        <p className="mt-1 mb-5 text-[13px] font-bold tracking-[0.14em] text-olive uppercase">
          Studio admin
        </p>

        <div className="admin-card p-5">
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-[12px] text-faint">
          Bookings, schedules and customer details live behind this form. If you
          have forgotten the password, ask whoever set the panel up to reset it —
          there is no self-service reset, on purpose.
        </p>
      </div>
    </div>
  );
}
