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
      // Labels stay short: the sidebar is 16rem, so longer names truncate.
      { href: "/connect/catalogue", label: "Catalogue", icon: Package },
      { href: "/connect/orders", label: "Enquiries", icon: ShoppingCart },
      { href: "/connect/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/connect/insights", label: "Insights", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/connect/subscription", label: "Subscription", icon: CreditCard },
      { href: "/connect/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function PortalShell({
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
        // "No package selected" is a claim about the account. Only make it
        // once the account has actually been read.
        subtitle: manufacturer
          ? manufacturer.subscription
            ? `${packageMeta(manufacturer.subscription.package).name} plan`
            : "No package selected"
          : undefined,
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
