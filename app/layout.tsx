import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { themeScript } from "@/components/shared/theme";
import { DemoPanel } from "@/components/shared/demo-panel";
import "./globals.css";

/*
  Brand typography is NEXA (primary), ARIAL, MONTSERAT. Nexa is a commercial
  licence and is not bundled; Montserrat — also on the brand's approved list
  and likewise a geometric sans — carries display type until a Nexa licence is
  in place. Body, UI and data type use Arial, the brand's second face, which
  needs no download and whose digits are natively monospaced.
*/
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Buildex Ecosystem",
    template: "%s · Buildex",
  },
  description:
    "Buildex, Buildex Capital and Buildex Connect — product supply, financing and the manufacturer marketplace for Kenya's construction material market.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#262e70" },
    { media: "(prefers-color-scheme: dark)", color: "#080916" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The font variable class goes on <html>, not <body>. `--font-display` is
  // declared on :root and references `--font-montserrat`; a var() inside a
  // custom property resolves at the scope where that property is *declared*,
  // so if `--font-montserrat` only existed on <body> the reference would
  // resolve to nothing and every heading would silently fall back to Arial.
  return (
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <head>
        {/* Resolves the theme before first paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        <DemoPanel />
      </body>
    </html>
  );
}
