import type { Metadata } from "next";
import { Amatic_SC, Andika } from "next/font/google";

import { AdminNav } from "@/components/admin/AdminNav";
import { currentAdmin } from "@/lib/admin/auth";
import { ROLE_LABEL } from "@/lib/admin/permissions";
import "./admin.css";

/**
 * Root layout for the admin panel — the third of this app's three.
 *
 * `app/` has no `layout.tsx`: `(main)`, `(academy)` and now `(admin)` are each
 * a root layout owning its own `<html>`, `<body>` and stylesheet. That is what
 * lets the panel carry a completely different density from the marketing site
 * while using the same brand colours and the same two faces, with no chance of
 * the three token sets colliding — they never load on the same page. Crossing
 * from `/` into `/admin` is a full page load, which is the documented
 * behaviour of multiple root layouts and exactly what keeps them apart.
 */

const amatic = Amatic_SC({
  variable: "--font-amatic",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const andika = Andika({
  variable: "--font-andika",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Admin · Flex & Flow",
    template: "%s · Flex & Flow Admin",
  },
  /* Not tidiness. An admin panel in the search index is a real incident: the
     login page ranks for the studio's name, the URLs of every sub-page are
     published, and anyone can start guessing at them. `proxy.ts` keeps the
     pages private; this keeps them unlisted. Every page in the group inherits
     it, and none of them set `robots` themselves. */
  robots: { index: false, follow: false },
  /* `favicon.ico` only resolves in the root `app/` segment, which no route
     group owns — so this declares its icon the same way the other two root
     layouts do. */
  icons: { icon: "/photos/logo.png", apple: "/photos/logo.png" },
};

export default async function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* The login page lives in this group too, and must not be framed by a nav
     that assumes somebody is signed in. Rather than sniff the pathname, the
     layout asks who is here: nobody, and it renders the page bare. */
  const admin = await currentAdmin();

  return (
    <html
      lang="en"
      className={`${amatic.variable} ${andika.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {admin ? (
          <div className="admin-shell">
            <AdminNav
              adminName={admin.name}
              adminEmail={admin.email}
              adminRole={ROLE_LABEL[admin.role]}
              permissions={admin.permissions}
            />
            <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        ) : (
          <main className="min-h-dvh">{children}</main>
        )}
      </body>
    </html>
  );
}
