import type { Metadata } from "next";
import { Amatic_SC, Andika } from "next/font/google";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { siteConfig } from "@/lib/site";

import "./globals.css";

/* The original loads `Amatic SC:400,700` and `Andika:400` from Google Fonts.
   Andika 700 is added on top: the redesign marks the current nav item by
   weight, and without the real face the browser smears a faux bold. */
const amatic = Amatic_SC({
  variable: "--font-amatic",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const andika = Andika({
  variable: "--font-andika",
  weight: ["400", "700"],
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
THESIS: someone sore from training decides in seconds and books from a phone, so this page states what the work is, what it costs and who performs it before it asks for anything.
OWN-WORLD: pinned brand — olive #7f8c3a, cream #f0efeb, black; Amatic SC display over Andika body; existing logo and studio photography; the studio's own words, verbatim. The redesign owns structure only: a 1240px measure, one clamped band step, 10px corners, white cards on cream, hairlines instead of rules.
STORY: what this is and what an hour costs, the range on offer, what the hour involves, who performs it, the room, the questions, then WhatsApp.
FIRST VIEWPORT: claim and studio footage side by side; rate, session length and home service stated as three tiles; both practitioners anchored to the video.
SCALE: calibrated against stretchr.com, an assisted-stretching peer — 56px display, light ground — not against the gym reference that produced the rejected 118px build.
MOTION: one moving strip of treatment names. Nothing on this page ships at opacity 0.
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
