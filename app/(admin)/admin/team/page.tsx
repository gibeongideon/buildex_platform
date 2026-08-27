"use client";

import * as React from "react";
import { Check, Lock, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import {
  ACTIVITY_KIND_LABELS,
  ActivityRow,
  ActivityRowSkeleton,
} from "@/components/admin/activity-row";
import { activityRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { ADMIN_ROLES, ROLE_META, useAdminRole, type AdminRole } from "../../use-admin-role";
import { cn, initials } from "@/lib/utils";

/*
  Team & roles.

  Two internal roles exist in the data model today — Operations and Risk &
  Compliance — and this is where the console says out loud what each one is for.
  The switcher changes the *view*, not permissions: there is no authentication in
  a prototype, and pretending otherwise would be the one dishonest screen in the
  build.
*/

/** What each role is responsible for, and what it cannot do yet. */
const RESPONSIBILITIES: Record<AdminRole, { can: string[]; cannot: string[] }> = {
  ops: {
    can: [
      "Approve, reject or hold a manufacturer application",
      "Name the exact documents a rejection requires",
      "Suspend or reinstate a supplier",
      "Unpublish a listing without touching the supplier",
      "Pause or resume a paid campaign",
      "Set a package for an account-managed agreement",
    ],
    cannot: [
      "Change a supplier's own pricing or MOQ — that stays theirs",
      "Answer an enquiry on a supplier's behalf",
    ],
  },
  risk: {
    can: [
      "Read every exception and the full audit trail",
      "See which checks are past SLA and by how long",
      "Review directors and shareholding reconciliation",
      "Flag an application for a site visit",
    ],
    cannot: [
      "Approve an application — that is an Operations decision",
      "Score credit or set limits until Buildex Capital ships",
    ],
  },
};

export default function AdminTeamPage() {
  const { role, setRole, pending } = useAdminRole();

  // What Buildex itself has done — the ops half of the timeline.
  const { data: opsEvents, loading } = useQuery(
    () => activityRepo.list({ actorTypes: ["ops"], limit: 12 }),
    [],
  );

  return (
    <>
      <PageHeader
        title="Team & roles"
        description="Who inside Buildex does what, and which view you are using."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Team & roles" },
        ]}
      />

      <Alert
        tone="warning"
        title="Roles here are a view, not a permission"
        className="mb-6"
      >
        The console has no authentication. Switching role changes what this prototype
        emphasises; it does not restrict anything. Real access control arrives with
        authentication at the backend cutover.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {ADMIN_ROLES.map((key) => {
          const meta = ROLE_META[key];
          const active = role === key;
          const duties = RESPONSIBILITIES[key];

          return (
            <Card
              key={key}
              className={cn(
                "transition-colors",
                active && "border-brand ring-1 ring-brand/25",
              )}
            >
              <CardBody>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      active
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface-muted text-muted-foreground",
                    )}
                  >
                    {initials(meta.person)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {meta.label}
                      </h2>
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                          Current view
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{meta.person}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{meta.scope}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Responsible for
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {duties.can.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-foreground">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-success"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Lock className="size-3.5" aria-hidden="true" />
                      Not theirs to do
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {duties.cannot.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-subtle-foreground" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4">
                  {active ? (
                    <p className="text-sm text-muted-foreground">
                      You are viewing the console as {meta.label}.
                    </p>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setRole(key)}
                      disabled={pending}
                    >
                      <UserCog aria-hidden="true" />
                      View as {meta.label}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What Buildex has done</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            The internal half of the audit trail: verification decisions taken by
            Operations, newest first.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {loading && !opsEvents ? (
            <ul className="divide-y divide-border">
              {[0, 1, 2, 3, 4].map((i) => (
                <ActivityRowSkeleton key={i} />
              ))}
            </ul>
          ) : (opsEvents ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nobody inside Buildex has taken a decision yet. Approving something in the
              verification queue will appear here — the feed reads real records, so it
              cannot be primed.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(opsEvents ?? []).map((event) => (
                <ActivityRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Coming with the backend</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Authentication and real roles.</span>{" "}
              Sign-in, per-role route protection, and decisions attributed to the person who
              made them rather than to the role.
            </li>
            <li>
              <span className="font-medium text-foreground">Four-eyes on rejection.</span>{" "}
              A rejection costs a supplier days, so it deserves a second reviewer — the
              decision path already records who acted, which is what that needs.
            </li>
            <li>
              <span className="font-medium text-foreground">Credit roles.</span> Buildex
              Capital adds underwriting and collections; neither exists in the data model
              yet, so neither is shown here. The console lists{" "}
              {Object.keys(ACTIVITY_KIND_LABELS).length} event kinds today and none of them
              is a loan.
            </li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
