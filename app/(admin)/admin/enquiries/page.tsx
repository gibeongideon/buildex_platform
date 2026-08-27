"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Clock, MessageSquare, Search, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Num, Pct } from "@/components/shared/format";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { adminRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_TONE,
  type Enquiry,
} from "@/lib/schemas/enquiry";
import type { Manufacturer } from "@/lib/schemas/manufacturer";
import { cn, formatRelative } from "@/lib/utils";

/*
  Platform-wide enquiry oversight.

  The question this page answers that no supplier's own inbox can: which
  suppliers are not replying. Response is measured against each supplier's own
  advertised time, because that is the promise a hardware shop chose them on.
*/

type EnquiryRow = {
  enquiry: Enquiry;
  manufacturer: Manufacturer;
  waitedHours: number | null;
  responseHours: number | null;
};

type SupplierSummary = {
  id: string;
  name: string;
  total: number;
  answered: number;
  promisedHours: number;
  overdue: number;
  rate: number;
};

function summariseSuppliers(rows: EnquiryRow[]): SupplierSummary[] {
  const map = new Map<string, Omit<SupplierSummary, "id" | "rate">>();

  for (const { enquiry, manufacturer, waitedHours, responseHours } of rows) {
    const entry =
      map.get(manufacturer.id) ??
      {
        name: manufacturer.tradingName,
        total: 0,
        answered: 0,
        promisedHours: manufacturer.storefront.avgResponseHours || 24,
        overdue: 0,
      };
    entry.total += 1;
    if (enquiry.status !== "new") entry.answered += 1;
    /*
      A late reply is still a late reply. Counting only enquiries currently
      waiting meant a supplier who answered everything eventually — hours past
      what they advertise — scored a clean sheet, which is the opposite of what
      this column is for.
    */
    const elapsed = waitedHours ?? responseHours;
    if (elapsed !== null && elapsed > entry.promisedHours) entry.overdue += 1;
    map.set(manufacturer.id, entry);
  }

  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, rate: v.total ? (v.answered / v.total) * 100 : 0 }))
    .sort((a, b) => a.rate - b.rate || b.overdue - a.overdue);
}

export default function AdminEnquiriesPage() {
  const { data: rows, loading } = useQuery(() => adminRepo.enquiryRows(), []);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");

  const all = rows ?? [];

  const filtered = all.filter(({ enquiry, manufacturer }) => {
    if (status && enquiry.status !== status) return false;
    if (query.trim()) {
      const haystack = [
        enquiry.shopName,
        enquiry.contactName,
        enquiry.productName,
        enquiry.county,
        manufacturer.tradingName,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const unanswered = all.filter((r) => r.enquiry.status === "new");
  const answered = all.filter((r) => r.enquiry.status !== "new");
  const lateReplies = all.filter(
    (r) =>
      r.responseHours !== null &&
      r.responseHours > (r.manufacturer.storefront.avgResponseHours || 24),
  ).length;

  // Response performance per supplier, worst answer-rate first. Left as a plain
  // derivation rather than a useMemo: `rows` only changes when the data does, so
  // the compiler memoizes this for free and a manual dependency array on a
  // `rows ?? []` fallback would defeat it.
  const bySupplier = summariseSuppliers(all);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every quote request on the platform, and who is answering them."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Enquiries" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total enquiries"
          tone="info"
          value={<Num value={all.length} />}
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label="Unanswered"
          tone="warning"
          value={unanswered.length}
          hint={
            unanswered.length
              ? `Longest waiting ${Math.round(unanswered[0]?.waitedHours ?? 0)}h`
              : "All answered"
          }
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Answer rate"
          tone="success"
          value={<Pct value={all.length ? (answered.length / all.length) * 100 : 0} />}
          hint={
            lateReplies
              ? `${lateReplies} answered later than promised`
              : "All replies inside the promise"
          }
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Suppliers receiving"
          tone="info"
          value={bySupplier.length}
          hint="With at least one enquiry"
          icon={<MessageSquare className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <Card>
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Shop, product or supplier"
                aria-label="Search enquiries"
                className="h-9 pl-8"
              />
            </div>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="h-9 w-auto"
            >
              <option value="">All statuses</option>
              {ENQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENQUIRY_STATUS_LABELS[s]}
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
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="size-5" />}
                title="No enquiries match"
                description="Try clearing the status filter."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setStatus("");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered
                  .slice(0, 60)
                  .map(({ enquiry, manufacturer, waitedHours, responseHours }) => {
                  const promised = manufacturer.storefront.avgResponseHours || 24;
                  const elapsed = waitedHours ?? responseHours;
                  const overdue = elapsed !== null && elapsed > promised;

                  return (
                    <li key={enquiry.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={ENQUIRY_STATUS_TONE[enquiry.status]}>
                              {ENQUIRY_STATUS_LABELS[enquiry.status]}
                            </StatusPill>
                            <p className="text-sm font-medium text-foreground">
                              {enquiry.shopName}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              → {manufacturer.tradingName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            <Num value={enquiry.quantity} /> {enquiry.unit}
                            {enquiry.quantity === 1 ? "" : "s"} of {enquiry.productName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {enquiry.county} · {formatRelative(enquiry.createdAt)}
                          </p>
                        </div>
                        {elapsed !== null ? (
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "inline-flex items-center gap-1 text-sm font-medium text-numeric",
                                overdue
                                  ? "text-danger"
                                  : waitedHours !== null
                                    ? "text-muted-foreground"
                                    : "text-success",
                              )}
                            >
                              {overdue ? (
                                <AlertTriangle className="size-3.5" aria-hidden="true" />
                              ) : null}
                              {waitedHours !== null
                                ? `${Math.round(waitedHours)}h waiting`
                                : `answered in ${Math.round(responseHours ?? 0)}h`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              advertises {promised}h
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                  })}
              </ul>
            )}
            {filtered.length > 60 ? (
              <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                Showing the 60 longest-waiting of {filtered.length}. Narrow the filter to
                see the rest — nothing is hidden silently.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle>Who is answering</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer rate per supplier, worst first.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="max-h-[30rem] divide-y divide-border overflow-y-auto">
              {bySupplier.map((s) => (
                <li key={s.id} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/admin/manufacturers/${s.id}`}
                      className="min-w-0 truncate text-sm text-foreground hover:text-brand hover:underline"
                    >
                      {s.name}
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold text-numeric",
                        s.rate < 50 ? "text-danger" : s.rate < 80 ? "text-warning" : "text-success",
                      )}
                    >
                      <Pct value={s.rate} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        s.rate < 50 ? "bg-danger" : s.rate < 80 ? "bg-warning" : "bg-success",
                      )}
                      style={{ width: `${Math.max(s.rate, 2)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-numeric">
                    {s.answered} of {s.total} answered
                    {s.overdue > 0 ? ` · ${s.overdue} past their own ${s.promisedHours}h` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
