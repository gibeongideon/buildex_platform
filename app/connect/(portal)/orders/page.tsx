"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  MessageSquare,
  Package,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Field, Input, Label, MoneyInput, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  CardBody,
  EmptyState,
  Separator,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { enquiryRepo, productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_TONE,
  enquiryValue,
  type Enquiry,
} from "@/lib/schemas/enquiry";
import { priceAtQuantity, priceRange } from "@/lib/schemas/product";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";

/*
  The enquiry inbox.

  Every enquiry a hardware shop sends from the marketplace lands here. The list
  is ordered newest-first because an unanswered enquiry loses value by the hour,
  and the quote panel pre-fills the price the shop's own quantity falls into —
  so the common case (accept your own published band) is one click, and
  overriding it is deliberate.
*/

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All enquiries" },
  { value: "new", label: "Needs a reply" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "closed", label: "Closed" },
];

function QuotePanel({
  enquiry,
  suggestedPrice,
  onDone,
}: {
  enquiry: Enquiry;
  suggestedPrice: number;
  onDone: () => void;
}) {
  const [unitPrice, setUnitPrice] = React.useState(
    enquiry.quotedUnitPrice ?? suggestedPrice,
  );
  const [leadDays, setLeadDays] = React.useState(enquiry.quotedLeadTimeDays ?? 3);
  const [note, setNote] = React.useState(enquiry.quoteNote ?? "");
  const [busy, setBusy] = React.useState(false);

  async function send() {
    setBusy(true);
    try {
      await enquiryRepo.quote(enquiry.id, {
        unitPrice,
        leadTimeDays: leadDays,
        note: note.trim() || undefined,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-surface-muted p-4">
      <p className="text-sm font-semibold text-foreground">
        {enquiry.quotedUnitPrice ? "Revise your quote" : "Send a quote"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field>
          <Label className="text-xs">Price per {enquiry.unit}</Label>
          <MoneyInput
            value={unitPrice}
            onChange={(event) => setUnitPrice(Number(event.target.value) || 0)}
            min={0}
            step="0.01"
          />
        </Field>
        <Field>
          <Label className="text-xs">Lead time (days)</Label>
          <Input
            type="number"
            min={0}
            max={120}
            value={leadDays}
            onChange={(event) => setLeadDays(Number(event.target.value) || 0)}
            className="text-right text-numeric"
          />
        </Field>
      </div>
      <Field className="mt-3">
        <Label className="text-xs">Note to the buyer</Label>
        <Textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Delivery arrangements, batch availability, payment terms."
        />
      </Field>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">
          Line total{" "}
          <Currency
            value={unitPrice * enquiry.quantity}
            className="font-semibold text-foreground"
          />
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button size="sm" loading={busy} onClick={send}>
            <Send aria-hidden="true" />
            Send quote
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EnquiriesPage() {
  const { data: current, loading: loadingManufacturer } = useCurrentManufacturer();
  const manufacturerId = current?.manufacturer.id ?? null;

  const [statusFilter, setStatusFilter] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [quotingId, setQuotingId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const { data: enquiries, loading, error, refetch } = useQuery(
    async () =>
      manufacturerId
        ? enquiryRepo.list({
            manufacturerId,
            status: statusFilter ? [statusFilter as Enquiry["status"]] : undefined,
            query,
          })
        : [],
    [manufacturerId, statusFilter, query],
  );

  const { data: products } = useQuery(
    async () => (manufacturerId ? productRepo.listByManufacturer(manufacturerId) : []),
    [manufacturerId],
  );

  if (loadingManufacturer && !current) {
    return (
      <>
        <PageHeader title="Orders & enquiries" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!current) return null;

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const rows = enquiries ?? [];

  const all = rows;
  const needsReply = all.filter((e) => e.status === "new");
  const accepted = all.filter((e) => e.status === "accepted");

  const fallbackPrice = (e: Enquiry) => {
    const product = byId.get(e.productId);
    if (!product) return 0;
    return priceAtQuantity(product.priceBands, e.quantity) ?? priceRange(product.priceBands).min;
  };

  const pipelineValue = all
    .filter((e) => e.status === "new" || e.status === "quoted")
    .reduce((sum, e) => sum + enquiryValue(e, fallbackPrice(e)), 0);
  const wonValue = accepted.reduce((sum, e) => sum + enquiryValue(e, fallbackPrice(e)), 0);

  async function setStatus(enquiry: Enquiry, status: Enquiry["status"]) {
    setBusyId(enquiry.id);
    try {
      await enquiryRepo.setStatus(enquiry.id, status);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Orders & enquiries"
        description="Quote requests from hardware shops browsing the Buildex Connect marketplace."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Orders & enquiries" },
        ]}
      />

        <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Needs a reply"
          tone="warning"
          value={needsReply.length}
          hint={
            needsReply.length
              ? `Oldest ${formatRelative(needsReply[needsReply.length - 1].createdAt)}`
              : "Inbox clear"
          }
          icon={<Inbox className="size-4" />}
        />
        <StatCard
          label="Open pipeline"
          tone="info"
          value={<Currency value={pipelineValue} compact />}
          hint="New and quoted, at enquiry quantity"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Accepted"
          tone="success"
          value={accepted.length}
          hint="Converted to orders"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Accepted value"
          tone="success"
          value={<Currency value={wonValue} compact />}
          hint="Lifetime through Buildex Connect"
          icon={<Package className="size-4" />}
        />
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shop, contact or product"
              aria-label="Search enquiries"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              className="h-9 w-auto"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
            <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric">
              {rows.length} shown
            </p>
          </div>
        </div>

        <CardBody className="p-0">
          {loading && rows.length === 0 ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="No enquiries here"
              description={
                statusFilter || query
                  ? "Try clearing the filter or search term."
                  : "Enquiries arrive when hardware shops request a quote from your listings."
              }
              action={
                statusFilter || query ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatusFilter("");
                      setQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/connect/catalogue">Review your catalogue</Link>
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((enquiry) => {
                const open = openId === enquiry.id;
                const suggested = fallbackPrice(enquiry);
                const value = enquiryValue(enquiry, suggested);
                const busy = busyId === enquiry.id;

                return (
                  <li key={enquiry.id} className={cn("p-4", busy && "opacity-50")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={ENQUIRY_STATUS_TONE[enquiry.status]}>
                            {ENQUIRY_STATUS_LABELS[enquiry.status]}
                          </StatusPill>
                          <p className="text-sm font-semibold text-foreground">
                            {enquiry.shopName}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            {enquiry.county}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm text-muted-foreground">
                          <Num value={enquiry.quantity} /> × {enquiry.unit}
                          {enquiry.quantity === 1 ? "" : "s"} of{" "}
                          <Link
                            href={`/connect/catalogue/${enquiry.productId}`}
                            className="font-medium text-foreground hover:text-brand hover:underline"
                          >
                            {enquiry.productName}
                          </Link>
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelative(enquiry.createdAt)}
                          {enquiry.neededBy
                            ? ` · needed by ${formatDate(enquiry.neededBy)}`
                            : ""}
                          {enquiry.quotedUnitPrice
                            ? ` · quoted at KSh ${enquiry.quotedUnitPrice.toLocaleString("en-KE")}/${enquiry.unit}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-subtle-foreground">
                            {enquiry.quotedUnitPrice ? "Quoted" : "At list"}
                          </p>
                          <Currency
                            value={value}
                            className="text-sm font-semibold text-foreground"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setOpenId(open ? null : enquiry.id);
                            setQuotingId(null);
                          }}
                          aria-expanded={open}
                        >
                          {open ? "Hide" : "Open"}
                        </Button>
                      </div>
                    </div>

                    {open ? (
                      <div className="mt-4 rounded-md border border-border bg-surface p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                              Buyer
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                              {enquiry.contactName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {enquiry.phone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {enquiry.email}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {enquiry.county} · {enquiry.region}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                              Message
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {enquiry.message || "No message provided."}
                            </p>
                            {enquiry.quoteNote ? (
                              <>
                                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                                  Your note
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {enquiry.quoteNote}
                                </p>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <Separator className="my-4" />

                        {quotingId === enquiry.id ? (
                          <QuotePanel
                            enquiry={enquiry}
                            suggestedPrice={suggested}
                            onDone={() => setQuotingId(null)}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => setQuotingId(enquiry.id)}>
                              <MessageSquare aria-hidden="true" />
                              {enquiry.quotedUnitPrice ? "Revise quote" : "Send quote"}
                            </Button>
                            {enquiry.status !== "accepted" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setStatus(enquiry, "accepted")}
                              >
                                <CheckCircle2 aria-hidden="true" />
                                Mark accepted
                              </Button>
                            ) : null}
                            {enquiry.status !== "declined" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus(enquiry, "declined")}
                              >
                                <XCircle aria-hidden="true" />
                                Decline
                              </Button>
                            ) : null}
                            {enquiry.status !== "closed" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus(enquiry, "closed")}
                              >
                                Close
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
