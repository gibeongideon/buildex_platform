"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { supplierRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  AGEING_BUCKETS,
  ageingBucket,
  payableByCurrency,
  totalByCurrency,
} from "@/lib/rules/procurement";
import {
  BILL_STATUSES,
  BILL_STATUS_LABELS,
  BILL_STATUS_TONE,
  daysOverdue,
  isOverdue,
  outstanding,
} from "@/lib/schemas/supplier";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { FilterBar } from "@/components/ui/filter-bar";

/*
  Vendor bills — accounts payable for Buildex Interiors.

  The one rule that shapes this whole screen: **amounts are never converted.**
  Kenyan mills invoice in shillings and Ugandan ones in Ugandan shillings, the
  platform holds no exchange rates, and a rate invented to produce one tidy
  "total payable" would give finance a number they could not reconcile against
  any invoice. Every total here is therefore a list, one line per currency.
*/

export default function AdminVendorBillsPage() {
  const { data: bills, loading, error, refetch } = useQuery(() => supplierRepo.listBills(), []);
  const { data: vendors } = useQuery(() => supplierRepo.listVendors(), []);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [overdueOnly, setOverdueOnly] = React.useState(false);

  const vendorById = new Map((vendors ?? []).map((v) => [v.id, v]));
  const all = bills ?? [];

  const filtered = all.filter((bill) => {
    if (status && bill.status !== status) return false;
    if (overdueOnly && !isOverdue(bill)) return false;
    if (query.trim()) {
      const haystack = [
        bill.reference,
        bill.description,
        vendorById.get(bill.vendorId)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const payable = payableByCurrency(all);
  const overdue = all.filter((b) => isOverdue(b));
  const overdueTotals = totalByCurrency(overdue, outstanding);

  // Ageing across every currency: the bucket counts are comparable, the money
  // in them is not, so the money stays split.
  const ageing = AGEING_BUCKETS.map((bucket) => {
    const inBucket = all.filter(
      (b) => b.status !== "draft" && outstanding(b) > 0 && ageingBucket(b) === bucket.key,
    );
    return { ...bucket, count: inBucket.length, totals: totalByCurrency(inBucket, outstanding) };
  }).filter((b) => b.count > 0);

  return (
    <>
      <PageHeader
        title="Vendor bills"
        description="What Buildex Interiors owes its suppliers, and how late it is."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Vendor bills" },
        ]}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/suppliers">Suppliers</Link>
          </Button>
        }
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bills on file"
          value={all.length}
          tone="info"
          hint={`${vendorById.size} vendors`}
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Outstanding"
          tone="warning"
          loading={!bills}
          value={
            payable.length === 0 ? (
              "Nothing owed"
            ) : (
              <span className="flex flex-col gap-0.5">
                {payable.map(([c, v]) => (
                  <span key={c}>{formatMoney(v, c, { compact: true })}</span>
                ))}
              </span>
            )
          }
          hint="Per currency"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? "danger" : "success"}
          hint={
            overdue.length
              ? `Worst ${Math.max(...overdue.map((b) => daysOverdue(b)))} days late`
              : "Everything within terms"
          }
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Overdue value"
          tone={overdue.length ? "danger" : "success"}
          loading={!bills}
          value={
            overdueTotals.length === 0 ? (
              "—"
            ) : (
              <span className="flex flex-col gap-0.5">
                {overdueTotals.map(([c, v]) => (
                  <span key={c}>{formatMoney(v, c, { compact: true })}</span>
                ))}
              </span>
            )
          }
          hint="Per currency"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <Alert tone="info" className="mt-6" title="Amounts are never converted between currencies">
        The platform holds no exchange rates. A single total across shillings and Ugandan
        shillings would look authoritative and reconcile against nothing, so every figure
        here is shown in the currency it was billed in.
      </Alert>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <Card>
          <FilterBar
            search={{
              value: query,
              onChange: setQuery,
              placeholder: "Reference or vendor",
              label: "Search bills",
              width: "sm:w-64",
            }}
            shown={filtered.length}
            total={all.length}
          >
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="h-9 w-auto"
            >
              <option value="">All statuses</option>
              {BILL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BILL_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Button
              variant={overdueOnly ? "primary" : "secondary"}
              size="sm"
              onClick={() => setOverdueOnly(!overdueOnly)}
            >
              Overdue only
            </Button>
          </FilterBar>

          <CardBody className="p-0">
            {loading && !bills ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="No bills match"
                description="Try clearing the filters."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setStatus("");
                      setOverdueOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="scroll-x">
                <table className="w-full min-w-[54rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Reference", "Vendor", "Bill date", "Due"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                          {h}
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.slice(0, 60).map((bill) => {
                      const vendor = vendorById.get(bill.vendorId);
                      const late = isOverdue(bill);
                      const owed = outstanding(bill);
                      return (
                        <tr key={bill.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-numeric">
                              {bill.reference}
                            </p>
                            <p className="text-xs text-muted-foreground">{bill.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            {vendor ? (
                              <Link
                                href={`/admin/suppliers/${vendor.id}`}
                                className="text-muted-foreground hover:text-brand hover:underline"
                              >
                                {vendor.name}
                              </Link>
                            ) : (
                              <span className="text-subtle-foreground">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-numeric">
                            {formatDate(bill.billDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-numeric",
                                late ? "font-medium text-danger" : "text-muted-foreground",
                              )}
                            >
                              {formatDate(bill.dueDate)}
                            </span>
                            {late ? (
                              <p className="text-xs text-danger text-numeric">
                                {daysOverdue(bill)} days late
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <p className="font-medium text-foreground text-numeric">
                              {formatMoney(bill.amount, bill.currency)}
                            </p>
                            {owed > 0 && owed !== bill.amount ? (
                              <p className="text-xs text-muted-foreground text-numeric">
                                {formatMoney(owed, bill.currency)} left
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill tone={BILL_STATUS_TONE[bill.status]}>
                              {BILL_STATUS_LABELS[bill.status]}
                            </StatusPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 60 ? (
                  <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                    Showing the 60 most recent of {filtered.length}. Nothing is hidden
                    silently — narrow the filter to see the rest.
                  </p>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle>Ageing</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              How long what is owed has been owed.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {ageing.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ageing.map((bucket) => (
                  <li key={bucket.key} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          bucket.key === "current"
                            ? "text-muted-foreground"
                            : bucket.key === "over_90"
                              ? "font-semibold text-danger"
                              : "font-medium text-warning",
                        )}
                      >
                        {bucket.label}
                      </span>
                      <span className="text-sm text-numeric text-muted-foreground">
                        {bucket.count}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {bucket.totals.map(([currency, value]) => (
                        <p key={currency} className="text-xs text-foreground text-numeric">
                          {formatMoney(value, currency)}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
