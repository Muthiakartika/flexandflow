import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { currentAdmin } from "@/lib/admin/auth";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * The one page in this group `proxy.ts` lets through unauthenticated — it has
 * to, or the redirect it performs points at a page that redirects, and the
 * browser gives up after twenty hops.
 *
 * Two columns: the studio's own photography under an olive wash on the left,
 * the form on the right. The left half is decoration and says so to a screen
 * reader — the photo is `aria-hidden` and the wordmark is not a heading — so
 * anything reading this page linearly reaches the form immediately rather than
 * through a panel it cannot see.
 *
 * The panel disappears below 900px, in an explicit `@media` block in
 * `admin.css`. On a phone it would push the form below the fold, and this is a
 * page whose entire job is one form.
 *
 * There is deliberately **no** "remember me", no "forgot password", no link
 * back to the public site and no language switcher. The first two do not
 * exist: sessions are eight hours and there is no self-service reset, on
 * purpose. The third invites a signed-out person away from the thing they came
 * to do, and the fourth would be a control over a setting this panel does not
 * have.
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
    <div className="admin-login">
      {/* ── The studio ─────────────────────────────────────────────────── */}
      {/* The photograph is a CSS background declared inside the `min-width:
          900px` block, not a `next/image`. Deliberate, and the reason is worth
          keeping: this panel is `display: none` on a phone, and an eager image
          inside a hidden element is *still* downloaded — so a phone would pay
          for a picture it never paints. `loading="lazy"` fixes that in a real
          browser but depends on the viewport intersection logic that this
          project's preview pane does not run (CLAUDE.md gotcha 3), which would
          mean shipping a hero image nobody here can verify ever appears. A
          media query has neither problem: below 900px the file is never
          requested, above it, it always is.

          The cost is one 63KB decorative JPEG served unoptimised, on a page
          behind a login that is `noindex` and has no Core Web Vitals to lose. */}
      <div className="admin-login-visual">
        {/* Two layers, and both are needed. The olive is the brand; the
            gradient underneath the text is what guarantees the wordmark and
            the strapline stay readable whatever the photograph is doing behind
            them, which a flat tint over a photo cannot promise. */}
        <span aria-hidden className="admin-login-wash" />
        <span aria-hidden className="admin-login-shade" />

        <div className="admin-login-brand">
          {/* The site's own lockup: mark, name on the display face, what it
              does tracked out underneath. Same as `components/layout/Header`. */}
          <span className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3">
            <Image
              src={siteConfig.logo}
              alt=""
              aria-hidden
              width={861}
              height={861}
              priority
              sizes="48px"
              className="h-12 w-12 object-contain"
            />
            <span>
              <span className="block font-display text-[28px] leading-none font-bold text-ink">
                {siteConfig.shortName}
              </span>
              <span className="mt-1 block font-body text-[9px] leading-none font-bold tracking-[0.14em] text-olive uppercase">
                Wellness Studio
              </span>
            </span>
          </span>
        </div>

        <div className="admin-login-strap">
          <p className="font-body text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase">
            Uluwatu, Bali
          </p>
          <p className="mt-2 font-display text-[44px] leading-[0.95] font-bold text-white">
            Wellness and
            <br />
            recovery studio.
          </p>
        </div>
      </div>

      {/* ── The form ───────────────────────────────────────────────────── */}
      <div className="admin-login-form">
        <div className="w-full max-w-[380px]">
          {/* Only on a phone, where the panel beside it is gone and the page
              would otherwise open on a bare pair of inputs. */}
          <div className="admin-login-compact-brand">
            <Image
              src={siteConfig.logo}
              alt=""
              aria-hidden
              width={861}
              height={861}
              priority
              sizes="48px"
              className="h-12 w-12 object-contain"
            />
            <span>
              <span className="block font-display text-[28px] leading-none font-bold text-ink">
                {siteConfig.shortName}
              </span>
              <span className="mt-1 block font-body text-[9px] leading-none font-bold tracking-[0.14em] text-olive uppercase">
                Wellness Studio
              </span>
            </span>
          </div>

          <h1 className="font-display text-[38px] leading-none font-bold text-ink">
            Studio admin
          </h1>
          <p className="mt-1 mb-5 text-[14px] text-muted">
            Sign in to manage the website and the diary.
          </p>

          <div className="admin-card p-5">
            <LoginForm next={next} />
          </div>

          <p className="mt-4 text-[12px] text-faint">
            Bookings, schedules and customer details live behind this form. If
            you have forgotten the password, ask whoever set the panel up to
            reset it — there is no self-service reset, on purpose.
          </p>
        </div>
      </div>
    </div>
  );
}
