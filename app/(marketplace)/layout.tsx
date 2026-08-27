import type { Metadata } from "next";
import { MarketplaceShell } from "./marketplace-shell";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Compare construction materials from verified Kenyan manufacturers — price bands, minimum orders, lead times and delivery regions, side by side.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceShell>{children}</MarketplaceShell>;
}
