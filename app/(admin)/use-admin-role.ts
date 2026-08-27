"use client";

import * as React from "react";
import { sessionRepo, type Role } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";

/*
  Which internal role the console is being viewed as.

  `Role` carries the four internal roles (lib/data/types.ts) and the demo
  session already persists through `SessionRepo` — so this is a thin hook over
  existing machinery rather than a new store. It exists so the console header and
  the Team page cannot disagree about who you are.

  Each role owns a section of the console. That is the test for adding one: if a
  role does not own a screen, it is an org chart, not a permission model.

  This is a *view* switch, not a permission. Real access control arrives with
  authentication at the backend cutover, and the console says so plainly.
*/

export type AdminRole = Extract<Role, "ops" | "risk" | "commercial" | "support">;

export const ROLE_META: Record<
  AdminRole,
  { label: string; person: string; scope: string; owns: string }
> = {
  ops: {
    label: "Operations",
    person: "John Gitahi",
    scope:
      "Verification decisions, supplier standing and listing moderation.",
    owns: "/admin/verification",
  },
  risk: {
    label: "Risk & Compliance",
    person: "Daniel Otieno",
    scope:
      "Exception monitoring, audit trail and the credit programme once Buildex Capital goes live.",
    owns: "/admin/activity",
  },
  commercial: {
    label: "Commercial & Accounts",
    person: "Franklin Wanyama",
    scope:
      "Packages, renewals and regional campaigns — including the VIP tier where Buildex sells a supplier's range for them.",
    owns: "/admin/subscriptions",
  },
  support: {
    label: "Supplier Support",
    person: "Mercy Chebet",
    scope:
      "Enquiries going unanswered, suppliers cleared but not publishing, and the calls that fix both.",
    owns: "/admin/enquiries",
  },
};

export const ADMIN_ROLES: AdminRole[] = ["ops", "risk", "commercial", "support"];

function isAdminRole(role: Role): role is AdminRole {
  return (ADMIN_ROLES as string[]).includes(role);
}

export function useAdminRole() {
  const { data: session } = useQuery(() => sessionRepo.get(), []);
  const [pending, setPending] = React.useState(false);

  // Anyone arriving without an internal role is shown the ops view — it is the
  // busiest of the four, and the switcher makes changing it obvious.
  const role: AdminRole =
    session && isAdminRole(session.role) ? session.role : "ops";

  const setRole = React.useCallback(async (next: AdminRole) => {
    setPending(true);
    try {
      await sessionRepo.set({ role: next });
    } finally {
      setPending(false);
    }
  }, []);

  return { role, setRole, pending };
}
