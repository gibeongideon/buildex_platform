"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Select } from "@/components/ui/field";
import { QueryError } from "@/components/ui/query-state";
import {
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { adminRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { regionForCounty } from "@/lib/schemas/common";
import {
  STATUS_LABELS,
  STATUS_TONE,
  checkMeta,
  slaHoursRemaining,
} from "@/lib/schemas/verification";
import { cn, formatRelative } from "@/lib/utils";

/*
  The ops verification queue.

  Ordered by SLA breach risk rather than arrival, because the queue's job is to
  answer "what is about to be late" — `adminRepo.manufacturerRows()` already
  sorts on past-SLA count then application state.

  Only applications in flight show by default. A verified or rejected supplier
  belongs in the manufacturer directory, not the review queue.
*/

const IN_FLIGHT = ["submitted", "in_review", "action_needed", "conditionally_approved"];

/** Worst SLA position across a manufacturer's open checks. */
function worstSla(checks: Parameters<typeof slaHoursRemaining>[0][]) {
  const hours = checks
    .map((c) => slaHoursRemaining(c))
    .filter((h): h is number => h !== null);
  return hours.length ? Math.min(...hours) : null;
}

function SlaCell({ hours }: { hours: number | null }) {
  if (hours === null) {
    return <span className="text-xs text-subtle-foreground">—</span>;
  }
  const breached = hours < 0;
  const soon = !breached && hours < 8;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-numeric",
        breached ? "text-danger" : soon ? "text-warning" : "text-muted-foreground",
      )}
    >
      {breached ? <AlertTriangle className="size-3" aria-hidden="true" /> : null}
      {breached
        ? `${Math.round(Math.abs(hours))}h over`
        : `${Math.round(hours)}h left`}
    </span>
  );
}

export default function VerificationQueuePage() {
  const { data: rows, loading, error, refetch } = useQuery(() => adminRepo.manufacturerRows(), []);
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState<"in_flight" | "all">("in_flight");

  const filtered = (rows ?? []).filter(({ manufacturer }) => {
    if (scope === "in_flight" && !IN_FLIGHT.includes(manufacturer.status)) return false;
    if (query.trim()) {
      const haystack = [
        manufacturer.tradingName,
        manufacturer.legalName,
        manufacturer.county,
        manufacturer.kraPin,
        manufacturer.brsNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Verification queue"
        description="Applications awaiting a Buildex decision, most at risk of breaching SLA first."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Verification" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, county, KRA PIN or BRS number"
              aria-label="Search applications"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={scope}
              onChange={(event) => setScope(event.target.value as typeof scope)}
              aria-label="Which applications to show"
              className="h-9 w-auto"
            >
              <option value="in_flight">In flight</option>
              <option value="all">All manufacturers</option>
            </Select>
            <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric">
              {filtered.length} shown
            </p>
          </div>
        </div>

        <CardBody className="p-0">
          {loading && !rows ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="size-5" />}
              title={
                scope === "in_flight"
                  ? "Nothing awaiting a decision"
                  : "No manufacturers match"
              }
              description={
                scope === "in_flight"
                  ? "Every application has been decided. Switch to All manufacturers to see the full network."
                  : "Try a different search term."
              }
              action={
                scope === "in_flight" ? (
                  <Button variant="secondary" onClick={() => setScope("all")}>
                    Show all manufacturers
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[58rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Manufacturer
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Open checks
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Tightest SLA
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Submitted
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(({ manufacturer, pastSlaChecks }) => {
                    const open = manufacturer.checks.filter(
                      (c) => c.status !== "passed" && c.status !== "not_required",
                    );
                    const sla = worstSla(open);

                    return (
                      <tr key={manufacturer.id} className="align-middle">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/verification/${manufacturer.id}`}
                            className="font-medium text-foreground hover:text-brand hover:underline"
                          >
                            {manufacturer.tradingName}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            {manufacturer.county} ·{" "}
                            {regionForCounty(manufacturer.county)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={STATUS_TONE[manufacturer.status]}>
                            {STATUS_LABELS[manufacturer.status]}
                          </StatusPill>
                          {pastSlaChecks > 0 ? (
                            <p className="mt-1 text-xs font-medium text-danger text-numeric">
                              {pastSlaChecks} past SLA
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {open.length === 0 ? (
                            <span className="text-xs text-subtle-foreground">
                              All cleared
                            </span>
                          ) : (
                            <ul className="space-y-0.5">
                              {open.slice(0, 2).map((check) => (
                                <li
                                  key={check.key}
                                  className="text-xs text-muted-foreground"
                                >
                                  {checkMeta(check.key).label}
                                </li>
                              ))}
                              {open.length > 2 ? (
                                <li className="text-xs text-subtle-foreground text-numeric">
                                  +{open.length - 2} more
                                </li>
                              ) : null}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <SlaCell hours={sla} />
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {manufacturer.submittedAt
                            ? formatRelative(manufacturer.submittedAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={`/admin/verification/${manufacturer.id}`}>
                              Review
                              <ChevronRight aria-hidden="true" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
