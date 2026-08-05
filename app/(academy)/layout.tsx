import type { Metadata } from "next";
import { Amatic_SC, Andika } from "next/font/google";
import { SiteHeader } from "@/components/academy/site-header";
import { SiteFooter } from "@/components/academy/site-footer";
import "./academy.css";

/**
 * Root layout for the academy, one of the site's two.
 *
 * `app/` has no `layout.tsx` of its own: `(main)` and `(academy)` are each a
 * root layout, which is what lets the academy keep its own `<body>`, its own
 * header and footer, and — via `academy.css` — its own design tokens, while
 * sharing the domain. Crossing between the two triggers a full page load,
 * which is the documented behaviour of multiple root layouts and the reason
 * the two token sets can never collide on one page.
 */

/** The two faces used on flexandflow.fit — display and body respectively. */
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
    default: "Flex & Flow Academy — Massage & Stretching Training in Bali",
    template: "%s · Flex & Flow Academy",
  },
  description:
    "Practitioner training in lymphatic drainage, assisted stretching and sports massage, taught in Uluwatu, Bali. Take any of them online at your own pace, or as a two-day onsite course capped at six students.",
  /* `favicon.ico` only works in the root `app/` segment, which neither root
     layout owns — so the academy declares its icon the same way the main site
     does, from the logo its own header already loads. */
  icons: { icon: "/photos/logo.png", apple: "/photos/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${amatic.variable} ${andika.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
