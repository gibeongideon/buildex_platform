"use client";

import * as React from "react";
import { sessionRepo, type Role } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";

/*
  Which internal role the console is being viewed as.

  `Role` already carries `ops` and `risk` (lib/data/types.ts), and the demo
  session already persists through `SessionRepo` — so this is a thin hook over
  existing machinery rather than a new store. It exists so the console and the
  Team page cannot disagree about who you are.

  This is a *view* switch, not a permission. Real access control arrives with
  authentication at the backend cutover, and the console says so plainly.
*/

export type AdminRole = Extract<Role, "ops" | "risk">;

export const ROLE_META: Record<
  AdminRole,
  { label: string; person: string; scope: string }
> = {
  ops: {
    label: "Operations",
    person: "Aisha Mohamed",
    scope:
      "Verification decisions, supplier standing, listing moderation and campaign oversight.",
  },
  risk: {
    label: "Risk & Compliance",
    person: "Daniel Otieno",
    scope:
      "Exception monitoring, audit trail and the credit programme once Buildex Capital goes live.",
  },
};

export const ADMIN_ROLES: AdminRole[] = ["ops", "risk"];

function isAdminRole(role: Role): role is AdminRole {
  return role === "ops" || role === "risk";
}

export function useAdminRole() {
  const { data: session } = useQuery(() => sessionRepo.get(), []);
  const [pending, setPending] = React.useState(false);

  // Anyone arriving without an internal role is shown the ops view — it is the
  // busier of the two, and the switcher makes changing it obvious.
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
