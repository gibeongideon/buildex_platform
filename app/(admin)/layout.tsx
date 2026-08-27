"use client";

import * as React from "react";
import {
  Activity,
  BadgeCheck,
  Building2,
  CreditCard,
  Factory,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Receipt,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell, type NavSection } from "@/components/shared/app-shell";
import { Alert } from "@/components/ui/primitives";
import { QueryError } from "@/components/ui/query-state";
import { adminRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { useAdminRole, ROLE_META } from "./use-admin-role";

/*
  Buildex Admin — the internal console.

  Its own route group so the console can carry different chrome from both the
  manufacturer portal and the marketplace. It reuses `AppShell`, so the sidebar,
  mobile slide-over and skip link behave identically to the portal — an ops user
  and a supplier should not have to learn two different shells.

  Counts in the nav are live: an admin needs to see how many applications are
  waiting without opening the queue.
*/

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAdminRole();
  const { data: summary, error, refetch } = useQuery(() => adminRepo.summary(), []);

  const sections: NavSection[] = [
    {
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        {
          href: "/admin/verification",
          label: "Verification",
          icon: ShieldCheck,
          badge: summary?.applicationsAwaitingDecision
            ? String(summary.applicationsAwaitingDecision)
            : undefined,
        },
        { href: "/admin/activity", label: "Activity", icon: Activity },
      ],
    },
    {
      title: "Network",
      items: [
        { href: "/admin/manufacturers", label: "Manufacturers", icon: Factory },
        { href: "/admin/listings", label: "Listings", icon: Package },
        {
          href: "/admin/enquiries",
          label: "Enquiries",
          icon: MessageSquare,
          badge: summary?.enquiriesUnanswered
            ? String(summary.enquiriesUnanswered)
            : undefined,
        },
        { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      ],
    },
    {
      title: "Commercial",
      items: [
        { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      ],
    },
    {
      /*
        Buildex Interiors buys from these vendors; Connect's manufacturers sell
        through the platform. Opposite ends of the business and opposite
        directions of money, so they get their own group rather than sharing
        "Network" and inviting the two to be confused.
      */
      title: "Procurement",
      items: [
        { href: "/admin/suppliers", label: "Suppliers", icon: Building2 },
        { href: "/admin/vendor-bills", label: "Vendor bills", icon: Receipt },
      ],
    },
    {
      title: "Buildex",
      items: [{ href: "/admin/team", label: "Team & roles", icon: Users }],
    },
  ];

  const meta = ROLE_META[role];

  return (
    <AppShell
      product="connect"
      sections={sections}
      user={{
        name: meta.person,
        subtitle: meta.label,
        status: { label: "Buildex Admin", tone: "info" },
      }}
    >
      {/*
        No authentication exists. Saying so once, at the top of the console, is
        more honest than a fake sign-in — and it is where a stakeholder walking
        the demo will actually read it.
      */}
      <Alert tone="info" className="mb-6" title="Prototype console — no authentication">
        Anyone with the link reaches this. Role is a demo switch in{" "}
        <BadgeCheck className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Team
        &amp; roles, not a permission. Real access control arrives with the backend.
      </Alert>
      <QueryError error={error} onRetry={refetch} />
      {children}
    </AppShell>
  );
}
