"use client";

import {
  BadgeCheck,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { AppShell, type NavSection } from "@/components/shared/app-shell";
import {
  VERIFICATION_LEVEL_LABELS,
  VERIFICATION_LEVEL_TONE,
} from "@/lib/schemas/customer";
import { membershipMeta } from "@/lib/schemas/membership";
import { deriveVerificationLevel } from "@/lib/rules/customers";
import { useCurrentCustomer } from "./use-current-customer";

/*
  The customer's own area — "my account" rather than a portal.

  It uses the same `AppShell` as the manufacturer portal and the admin console
  on purpose. A customer moves between the marketplace, which has storefront
  chrome, and their account, which is a small application; that is the shape
  every large B2B marketplace converged on, and reusing the shell means the
  density, navigation and mobile drawer behave identically everywhere.

  Sections marked `upcoming` are the ones Chapter 9 specifies that later phases
  build. They are listed rather than hidden because a customer choosing a
  membership is being told what the account will hold, and a nav that quietly
  omits half of it makes the comparison table look like a lie.
*/

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/account", label: "Overview", icon: LayoutDashboard },
      { href: "/marketplace", label: "Search materials", icon: Search },
    ],
  },
  {
    title: "Buying",
    items: [
      { href: "/account/quotations", label: "Quotations", icon: FileText, upcoming: true },
      { href: "/account/orders", label: "Orders", icon: Package, upcoming: true },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/account/wallet", label: "Wallet & tokens", icon: Wallet, upcoming: true },
      { href: "/account/membership", label: "Membership", icon: Sparkles, upcoming: true },
      { href: "/account/trust", label: "Trust Profile", icon: BadgeCheck, upcoming: true },
      { href: "/account/settings", label: "Settings", icon: Settings, upcoming: true },
    ],
  },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { data: customer } = useCurrentCustomer();

  // The level is derived, so the sidebar can never disagree with the Trust
  // Profile about what this account has earned. Commercial history arrives with
  // the orders phase; until then the identity dimensions decide it.
  const level = customer ? deriveVerificationLevel(customer) : null;

  return (
    <AppShell
      product="connect"
      sections={SECTIONS}
      user={{
        name: customer?.name ?? "Buildex Connect",
        // Only claim a membership once the account has actually been read.
        subtitle: customer ? membershipMeta(customer.membership).name : undefined,
        status: level
          ? {
              label: VERIFICATION_LEVEL_LABELS[level],
              tone: VERIFICATION_LEVEL_TONE[level],
            }
          : undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
