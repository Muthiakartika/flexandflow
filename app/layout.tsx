import type { Metadata } from "next";
import { Amatic_SC, Andika } from "next/font/google";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { siteConfig } from "@/lib/site";

import "./globals.css";

/* The original loads `Amatic SC:400,700` and `Andika:400` from Google Fonts. */
const amatic = Amatic_SC({
  variable: "--font-amatic",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const andika = Andika({
  variable: "--font-andika",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Flex and Flow - Assisted Stretching Studio",
    template: "%s",
  },
  description: siteConfig.description,
  icons: {
    icon: siteConfig.logo,
    apple: siteConfig.logo,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${andika.variable} ${amatic.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {/* eslint-disable-next-line react/no-danger */}
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: recovery bodywork is trusted through specific hands, not a service menu; this home page refuses the anonymous spa-grid where every treatment is an equal tile.
OWN-WORLD: pinned brand — olive #7f8c3a, cream #f0efeb, black; Amatic SC display over Andika body; existing logo and studio photography. Structure only: hairline-separated bands, one clamped vertical step, editorial index rows, no eyebrows, no matched cards.
STORY: a visitor sore from training learns this is assessed one-to-one bodywork, meets Ginny and Yuni, understands what the two price tiers actually buy, finds their treatment, and messages WhatsApp.
FIRST VIEWPORT: studio footage under the theme wash; claim low-left at display scale, WhatsApp and treatments beneath it, both practitioners named with portraits on the same screen.
FORM: practitioner-led; candidate 4 of the grounded list; seed key e90fd7cf.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
-->`,
          }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
