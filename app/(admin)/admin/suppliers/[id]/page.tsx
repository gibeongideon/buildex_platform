"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Building2, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DetailRow } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
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
import { payableByCurrency, vendorIssues } from "@/lib/rules/procurement";
import {
  BILL_STATUS_LABELS,
  BILL_STATUS_TONE,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_TONE,
  daysOverdue,
  isOverdue,
  outstanding,
} from "@/lib/schemas/supplier";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { BackLink } from "@/components/shared/back-link";

/*
  One supplier: what they supply, what is owed, and what is wrong with the
  record. The issues panel is the reason this page is worth opening — a ledger
  row tells you a vendor exists, not that nobody can reach them.
*/

export default function AdminSupplierRecordPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: vendor, loading, error, refetch } = useQuery(() => supplierRepo.getVendor(id), [id]);
  const { data: bills } = useQuery(() => supplierRepo.listBills({ vendorId: id }), [id]);

  if (loading && !vendor) {
    return (
      <>
        <PageHeader title="Supplier" />
        <Skeleton className="h-96" />
      </>
    );
  }

  /*
    Before the not-found branch, not after it. A failed load leaves the
    record undefined too, and saying "not found — it may have been removed"
    about a record that exists is worse than saying nothing.
  */
  if (error && !vendor) {
    return (
      <>
        <PageHeader title="Supplier" />
        <QueryError error={error} onRetry={refetch} title="Could not load this supplier" />
      </>
    );
  }

  if (!vendor) {
    return (
      <>
        <PageHeader title="Supplier" />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="Supplier not found"
              description="It may have been removed from the ledger."
              action={
                <Button asChild>
                  <Link href="/admin/suppliers">Back to suppliers</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const list = bills ?? [];
  const issues = vendorIssues(vendor);
  const payable = payableByCurrency(list);
  const overdue = list.filter((b) => isOverdue(b));

  return (
    <>
      <PageHeader
        title={vendor.name}
        description={`${vendor.type}${vendor.city ? ` · ${vendor.city}` : ""}${vendor.country ? `, ${vendor.country}` : ""}`}
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Suppliers", href: "/admin/suppliers" },
          { label: vendor.name },
        ]}
        actions={
          <StatusPill tone={VENDOR_STATUS_TONE[vendor.status]}>
            {VENDOR_STATUS_LABELS[vendor.status]}
          </StatusPill>
        }
      />

      <BackLink href="/admin/suppliers" className="mb-4">
        Suppliers
      </BackLink>

      <QueryError error={error} onRetry={refetch} />

      {issues.length > 0 ? (
        <Alert
          tone={issues.some((i) => i.severity === "high") ? "warning" : "info"}
          className="mb-6"
          title={`${issues.length} thing${issues.length === 1 ? "" : "s"} to fix on this record`}
        >
          <ul className="mt-1 space-y-1">
            {issues.map((issue) => (
              <li key={issue.key} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-medium">{issue.label}.</span> {issue.detail}
                </span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Bills"
          value={list.length}
          tone="info"
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Outstanding"
          tone={overdue.length ? "danger" : "warning"}
          value={
            payable.length === 0
              ? "Nothing owed"
              : payable.map(([c, v]) => formatMoney(v, c)).join(" · ")
          }
          hint={`Billed in ${vendor.currency}`}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? "danger" : "success"}
          hint={
            overdue.length
              ? `Worst ${Math.max(...overdue.map((b) => daysOverdue(b)))} days`
              : "Within terms"
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] [&>*]:min-w-0">
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle>Record</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">As captured in the ledger.</p>
          </CardHeader>
          <CardBody>
            <dl className="divide-y divide-border">
              <DetailRow label="Name" value={vendor.name} />
              <DetailRow label="Supplies" value={vendor.type} />
              <DetailRow label="Phone" value={vendor.phone ?? "Not captured"} />
              <DetailRow label="Email" value={vendor.email ?? "Not captured"} />
              <DetailRow label="City" value={vendor.city ?? "Not captured"} />
              <DetailRow label="Country" value={vendor.country ?? "Not captured"} />
              <DetailRow label="Billing currency" value={vendor.currency} />
              <DetailRow
                label="Payment terms"
                value={
                  vendor.paymentTermDays === null
                    ? "None agreed"
                    : `${vendor.paymentTermDays} days`
                }
              />
              <DetailRow label="On file since" value={formatDate(vendor.createdAt)} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Newest first, in {vendor.currency}.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {list.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="No bills"
                description="Nothing has been billed by this supplier."
              />
            ) : (
              <ul className="divide-y divide-border">
                {list.map((bill) => {
                  const late = isOverdue(bill);
                  const owed = outstanding(bill);
                  return (
                    <li key={bill.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={BILL_STATUS_TONE[bill.status]}>
                            {BILL_STATUS_LABELS[bill.status]}
                          </StatusPill>
                          <span className="text-sm font-medium text-foreground text-numeric">
                            {bill.reference}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {bill.description} · billed {formatDate(bill.billDate)} · due{" "}
                          <span className={cn(late && "font-medium text-danger")}>
                            {formatDate(bill.dueDate)}
                          </span>
                          {late ? ` (${daysOverdue(bill)} days late)` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground text-numeric">
                          {formatMoney(bill.amount, bill.currency)}
                        </p>
                        {owed > 0 && owed !== bill.amount ? (
                          <p className="text-xs text-muted-foreground text-numeric">
                            {formatMoney(owed, bill.currency)} left
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
