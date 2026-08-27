"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Mail,
  MapPin,
  Phone,
  Search,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { supplierRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { payableByCurrency, vendorIssues } from "@/lib/rules/procurement";
import {
  VENDOR_COUNTRIES,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_TONE,
  VENDOR_TYPES,
} from "@/lib/schemas/supplier";
import { cn, formatDate, formatMoney } from "@/lib/utils";

/*
  Buildex Interiors' suppliers — the companies Buildex buys from.

  Deliberately a different screen from `/admin/manufacturers`: those are
  Connect's sellers, these are Interiors' vendors, and the money runs the other
  way. Sharing one table would mean one of the two lying about what a row means.

  Two things this does that a plain vendor list does not. It states what is
  *wrong* with a record — missing contacts, a city that contradicts its
  country — because a ledger accumulates those and nobody ever goes looking.
  And it never sums across currencies: see `totalByCurrency`.
*/

export default function AdminSuppliersPage() {
  const { data: rows, loading, error, refetch } = useQuery(() => supplierRepo.vendorRows(), []);
  const { data: bills } = useQuery(() => supplierRepo.listBills(), []);
  const [query, setQuery] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [type, setType] = React.useState("");
  const [incompleteOnly, setIncompleteOnly] = React.useState(false);

  const all = rows ?? [];

  const filtered = all.filter(({ vendor }) => {
    if (country && vendor.country !== country) return false;
    if (type && vendor.type !== type) return false;
    if (incompleteOnly && vendorIssues(vendor).length === 0) return false;
    if (query.trim()) {
      const haystack = [vendor.name, vendor.email, vendor.phone, vendor.city, vendor.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const payable = payableByCurrency(bills ?? []);
  const withIssues = all.filter(({ vendor }) => vendorIssues(vendor).length > 0);
  const overdueVendors = all.filter((r) => r.overdueBills > 0);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who Buildex Interiors buys from, and what is owed to them."
        breadcrumbs={[{ label: "Buildex Admin", href: "/admin" }, { label: "Suppliers" }]}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/vendor-bills">Vendor bills</Link>
          </Button>
        }
      />

      <QueryError error={error} onRetry={refetch} />


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vendors"
          value={all.length}
          tone="info"
          hint={`${new Set(all.map((r) => r.vendor.country).filter(Boolean)).size} countries`}
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Owed to suppliers"
          tone="warning"
          loading={!bills}
          value={
            payable.length === 0 ? (
              "Nothing outstanding"
            ) : (
              <span className="flex flex-col gap-0.5">
                {payable.map(([currency, value]) => (
                  <span key={currency}>{formatMoney(value, currency, { compact: true })}</span>
                ))}
              </span>
            )
          }
          hint="Per currency — never converted"
          icon={<Truck className="size-4" />}
        />
        <StatCard
          label="Vendors with overdue bills"
          value={overdueVendors.length}
          tone={overdueVendors.length ? "danger" : "success"}
          hint={
            overdueVendors.length
              ? `${overdueVendors.reduce((n, r) => n + r.overdueBills, 0)} bills past due`
              : "All within terms"
          }
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Incomplete records"
          value={withIssues.length}
          tone={withIssues.length ? "warning" : "success"}
          hint="Missing or contradictory details"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      {withIssues.length > 0 ? (
        <Alert
          tone="info"
          className="mt-6"
          title={`${withIssues.length} vendor records are incomplete or contradict themselves`}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIncompleteOnly(!incompleteOnly)}
            >
              {incompleteOnly ? "Show all" : "Show only these"}
            </Button>
          }
        >
          Shown exactly as captured in the ledger rather than corrected here, so this
          console never quietly diverges from the source system.
        </Alert>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, phone or city"
              aria-label="Search suppliers"
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            aria-label="Filter by country"
            className="h-9 w-auto"
          >
            <option value="">All countries</option>
            {VENDOR_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by what they supply"
            className="h-9 w-auto"
          >
            <option value="">All types</option>
            {VENDOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric sm:ml-auto">
            {filtered.length} of {all.length}
          </p>
        </div>

        <CardBody className="p-0">
          {loading && !rows ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="No suppliers match"
              description="Try clearing a filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCountry("");
                    setType("");
                    setIncompleteOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[70rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Name", "Contact", "City", "Country", "Currency"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 text-left font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Outstanding
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(({ vendor, bills: billCount, outstanding, overdueBills, lastBillAt }) => {
                    const issues = vendorIssues(vendor);
                    const worst = issues.find((i) => i.severity === "high");

                    return (
                      <tr key={vendor.id} className="align-top">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/suppliers/${vendor.id}`}
                            className="font-medium text-foreground hover:text-brand hover:underline"
                          >
                            {vendor.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {vendor.type}
                            {lastBillAt ? ` · last bill ${formatDate(lastBillAt)}` : ""}
                          </p>
                          {worst ? (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-danger">
                              <AlertTriangle className="size-3" aria-hidden="true" />
                              {worst.label}
                            </p>
                          ) : issues.length > 0 ? (
                            <p className="mt-1 text-xs text-warning">{issues[0].label}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {vendor.phone ? (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground text-numeric">
                              <Phone className="size-3 shrink-0" aria-hidden="true" />
                              {vendor.phone}
                            </p>
                          ) : null}
                          {vendor.email ? (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="size-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{vendor.email}</span>
                            </p>
                          ) : null}
                          {!vendor.phone && !vendor.email ? (
                            <span className="text-xs text-subtle-foreground">—</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {vendor.city ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" aria-hidden="true" />
                              {vendor.city}
                            </span>
                          ) : (
                            <span className="text-subtle-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {vendor.country ?? <span className="text-subtle-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground text-numeric">
                            {vendor.currency}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={cn(
                              "font-medium text-numeric",
                              overdueBills > 0 ? "text-danger" : "text-foreground",
                            )}
                          >
                            {outstanding > 0
                              ? formatMoney(outstanding, vendor.currency)
                              : "—"}
                          </span>
                          <p className="text-xs text-muted-foreground text-numeric">
                            <Num value={billCount} /> bill{billCount === 1 ? "" : "s"}
                            {overdueBills > 0 ? ` · ${overdueBills} overdue` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill tone={VENDOR_STATUS_TONE[vendor.status]}>
                            {VENDOR_STATUS_LABELS[vendor.status]}
                          </StatusPill>
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
