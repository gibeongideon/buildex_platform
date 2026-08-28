import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { themeScript } from "@/components/shared/theme";
import { DemoPanel } from "@/components/shared/demo-panel";
import "./globals.css";

/*
  ---------------------------------------------------------------------------
  Typography
  ---------------------------------------------------------------------------
  The brand lists NEXA (primary), ARIAL, MONTSERAT. Nexa is a commercial
  licence and is not bundled here.

  DISPLAY — Montserrat. On the brand's approved list, and a geometric sans like
  Nexa, so it is the faithful stand-in. Geometric display faces also test well
  for warmth and approachability across audiences, which suits a marketplace
  front door.

  UI / BODY / DATA — Inter. The brand's second face is Arial, a neo-grotesque;
  Inter is the same skeleton drawn for screens: a taller x-height, open
  apertures and wider default spacing, all of which lift legibility at the
  12–14px sizes this product's tables live at. It also ships true tabular
  figures and covers Latin Extended, so Kenyan county and company names render
  correctly. Arial stays in the fallback stack, so if Inter fails to load the
  page degrades to a brand-approved face rather than an arbitrary one.

  The pairing — geometric display over neo-grotesque UI — is the most widely
  adopted convention in current enterprise software, which is exactly why it
  reads as credible to the broadest audience.
*/
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Buildex Connect",
    template: "%s · Buildex Connect",
  },
  description:
    "The Buildex Connect platform — Buildex Interiors for product supply, Buildex Capital for financing, and the Buildex Connect marketplace for manufacturers.",
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
    <html
      lang="en"
      className={`${montserrat.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Resolves the theme before first paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        {/*
          Both of these float above the product and belong to no page: the guide
          explains which audience a screen is for, the panel drives demo state.
          Mounted here so removing the scaffolding is one line, not a sweep
          through every route.
        */}
        <DemoPanel />
      </body>
    </html>
  );
}
