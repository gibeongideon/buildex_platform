import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { themeScript } from "@/components/shared/theme";
import { DemoPanel } from "@/components/shared/demo-panel";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resolves the theme before first paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <DemoPanel />
      </body>
    </html>
  );
}
