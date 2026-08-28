"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, MapPin, RotateCcw, Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import {
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { adminRepo, manufacturerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { REGIONS, regionForCounty } from "@/lib/schemas/common";
import { packageMeta } from "@/lib/schemas/subscription";
import {
  MANUFACTURER_STATUSES,
  STATUS_LABELS,
  STATUS_TONE,
  deriveStatus,
} from "@/lib/schemas/verification";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { VerifiedMark, verifiedLevel } from "@/components/shared/verified-mark";

/*
  The manufacturer directory — every supplier, whatever their state.

  Suspension is the one action here that is not derived from checks. Reinstating
  recomputes status from the check pipeline with `deriveStatus()`, so a
  previously-verified supplier comes back verified rather than being reset to
  submitted.
*/

export default function AdminManufacturersPage() {
  const { data: rows, loading, error, refetch } = useQuery(() => adminRepo.manufacturerRows(), []);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filtered = (rows ?? []).filter(({ manufacturer: m }) => {
    if (status && m.status !== status) return false;
    if (region && regionForCounty(m.county) !== region) return false;
    if (query.trim()) {
      const haystack = [m.tradingName, m.legalName, m.county, m.kraPin, m.brsNumber]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function suspend(id: string) {
    setBusyId(id);
    try {
      await manufacturerRepo.update(id, { status: "suspended" });
    } finally {
      setBusyId(null);
    }
  }

  async function reinstate(id: string, checks: Parameters<typeof deriveStatus>[0]) {
    setBusyId(id);
    try {
      // Recompute rather than guess: a supplier who was verified before the
      // suspension should come back verified.
      await manufacturerRepo.update(id, { status: deriveStatus(checks) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Manufacturers"
        description="Every supplier on the platform, in any state."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Manufacturers" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <Card>
        <FilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Search suppliers",
            label: "Search manufacturers",
          }}
          shown={filtered.length}
          total={rows?.length ?? 0}
        >
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="h-9 w-auto"
          >
            <option value="">All statuses</option>
            {MANUFACTURER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            aria-label="Filter by region"
            className="h-9 w-auto"
          >
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FilterBar>

        <CardBody className="p-0">
          {loading && !rows ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Store className="size-5" />}
              title="No manufacturers match"
              description="Try clearing the status or region filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                    setRegion("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <DataTable
              minWidth="min-w-[64rem]"
              columns={[
                { label: "Supplier", className: "px-4 py-2.5" },
                { label: "Status" },
                { label: "Package" },
                { label: "Live", align: "right" },
                { label: "Drafts", align: "right" },
                { label: "Open enquiries", align: "right" },
                { label: "Actions", align: "right", srOnly: true, className: "px-4 py-2.5" },
              ]}
            >
              {filtered.map(({ manufacturer: m, liveListings, draftListings, openEnquiries, pastSlaChecks }) => {
                const busy = busyId === m.id;
                const suspended = m.status === "suspended";

                return (
                  <tr key={m.id} className={cn("align-middle", busy && "opacity-50")}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/manufacturers/${m.id}`}
                        className="flex items-center gap-1.5 font-medium text-foreground hover:text-brand hover:underline"
                      >
                        {m.tradingName}
                        {verifiedLevel(m.status) ? (
                          <VerifiedMark
                            level={verifiedLevel(m.status)!}
                            subject="supplier"
                          />
                        ) : null}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {m.county} · since {m.yearEstablished}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={STATUS_TONE[m.status]}>
                        {STATUS_LABELS[m.status]}
                      </StatusPill>
                      {pastSlaChecks > 0 ? (
                        <p className="mt-1 text-xs font-medium text-danger text-numeric">
                          {pastSlaChecks} past SLA
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {m.subscription ? packageMeta(m.subscription.package).name : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-numeric text-foreground">
                      <Num value={liveListings} />
                    </td>
                    <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                      {draftListings || "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-numeric text-muted-foreground">
                      {openEnquiries || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/marketplace/manufacturer/${m.id}`} title="Public storefront">
                            <Store aria-hidden="true" />
                            <span className="sr-only">
                              {m.tradingName} storefront
                            </span>
                          </Link>
                        </Button>
                        {suspended ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => reinstate(m.id, m.checks)}
                          >
                            <RotateCcw aria-hidden="true" />
                            Reinstate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => suspend(m.id)}
                            title="Suspend — pulls their listings from the marketplace"
                          >
                            <Ban aria-hidden="true" />
                            <span className="sr-only">Suspend {m.tradingName}</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Suspending a supplier pulls every listing they have from the public marketplace
        immediately — visibility is decided in one place, so nothing has to be unpublished
        individually.
      </p>
    </>
  );
}
