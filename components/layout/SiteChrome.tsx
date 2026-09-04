"use client";

import { usePathname } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

/**
 * Header and footer, everywhere except `/intake`.
 *
 * Every booking CTA on the site sends a visitor there before booking, and the
 * brief was explicit: no obvious way to click off to another page while
 * filling it in. Hiding the nav is what that means in practice — the browser
 * back button and a typed URL still technically work, which is a limit of
 * the browser rather than something a page can close.
 *
 * A client component because deciding this needs the current pathname, which
 * a plain layout.tsx does not receive. Everything it renders (`Header`,
 * `Footer`) is unchanged; this only decides whether to.
 */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const focused = pathname === "/intake" || pathname === "/intake/";

  if (focused) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
