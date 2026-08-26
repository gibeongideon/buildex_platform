"use client";

import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { AppShell, type NavSection } from "@/components/shared/app-shell";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/schemas/verification";
import { packageMeta } from "@/lib/schemas/subscription";
import { useCurrentManufacturer } from "./use-current-manufacturer";

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/connect/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/connect/verification", label: "Verification", icon: ShieldCheck },
    ],
  },
  {
    title: "Selling",
    items: [
      // Labels stay short: the sidebar is 16rem and the "Soon" badge takes the
      // tail of the row, so longer names truncate mid-word.
      { href: "/connect/catalogue", label: "Catalogue", icon: Package, upcoming: true },
      { href: "/connect/orders", label: "Orders", icon: ShoppingCart, upcoming: true },
      { href: "/connect/campaigns", label: "Campaigns", icon: Megaphone, upcoming: true },
      { href: "/connect/insights", label: "Insights", icon: BarChart3, upcoming: true },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/connect/subscription", label: "Subscription", icon: CreditCard },
      { href: "/connect/settings", label: "Settings", icon: Settings, upcoming: true },
    ],
  },
];

export default function ConnectPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useCurrentManufacturer();
  const manufacturer = data?.manufacturer;

  return (
    <AppShell
      product="connect"
      sections={SECTIONS}
      user={{
        name: manufacturer?.tradingName ?? "Buildex Connect",
        subtitle: manufacturer?.subscription
          ? `${packageMeta(manufacturer.subscription.package).name} plan`
          : "No package selected",
        status: manufacturer
          ? {
              label: STATUS_LABELS[manufacturer.status],
              tone: STATUS_TONE[manufacturer.status],
            }
          : undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
