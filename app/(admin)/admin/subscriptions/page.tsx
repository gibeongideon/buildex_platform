"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, CreditCard, Layers, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num } from "@/components/shared/format";
import { Select } from "@/components/ui/field";
import { QueryError } from "@/components/ui/query-state";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusPill,
  type Tone,
} from "@/components/ui/primitives";
import { adminRepo, manufacturerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  PACKAGE_KEYS,
  packageMeta,
  packagePrice,
  productLimit,
  type BillingCycle,
  type PackageKey,
} from "@/lib/schemas/subscription";
import { canListProducts } from "@/lib/schemas/verification";
import { cn, formatDate } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";

/*
  Package administration.

  The override exists because the requirements describe VIP as account-managed:
  someone inside Buildex agrees a tier commercially and it has to be settable
  without asking the manufacturer to go through self-serve checkout. Every
  change is written through `manufacturerRepo.setSubscription`, the same path the
  manufacturer's own upgrade flow uses.
*/

const PACKAGE_TONE: Record<PackageKey, Tone> = {
  free: "neutral",
  basic: "info",
  premium: "success",
  vip: "warning",
};

/** Monthly-equivalent value of a subscription, for a run-rate figure. */
function monthlyEquivalent(pkg: PackageKey, cycle: BillingCycle) {
  const price = packagePrice(pkg, cycle);
  return cycle === "annual" ? Math.round(price / 12) : price;
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function AdminSubscriptionsPage() {
  const { data: rows, loading, error, refetch } = useQuery(() => adminRepo.manufacturerRows(), []);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const all = rows ?? [];

  // Suppliers grouped by the package they are on, unsubscribed included.
  const byPackage = new Map<PackageKey | "none", number>();
  for (const { manufacturer } of all) {
    const key = manufacturer.subscription?.package ?? "none";
    byPackage.set(key, (byPackage.get(key) ?? 0) + 1);
  }

  const runRate = all.reduce((sum, { manufacturer }) => {
    const sub = manufacturer.subscription;
    if (!sub) return sum;
    return sum + monthlyEquivalent(sub.package, sub.billingCycle);
  }, 0);

  const paying = all.filter(
    ({ manufacturer }) =>
      manufacturer.subscription && manufacturer.subscription.package !== "free",
  );

  const renewingSoon = all
    .filter(({ manufacturer }) => {
      const renewsAt = manufacturer.subscription?.renewsAt;
      return renewsAt ? daysUntil(renewsAt) <= 30 : false;
    })
    .sort(
      (a, b) =>
        new Date(a.manufacturer.subscription!.renewsAt!).getTime() -
        new Date(b.manufacturer.subscription!.renewsAt!).getTime(),
    );

  async function setPackage(id: string, pkg: PackageKey, cycle: BillingCycle) {
    setBusyId(id);
    try {
      await manufacturerRepo.setSubscription(id, pkg, cycle);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Who is on what package, and what renews when."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Subscriptions" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paying suppliers"
          tone="success"
          value={paying.length}
          hint={`of ${all.length} on the platform`}
          icon={<CreditCard className="size-4" />}
        />
        <StatCard
          label="Monthly run rate"
          tone="info"
          value={<Currency value={runRate} />}
          hint="Indicative pricing"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Renewing within 30 days"
          tone="warning"
          value={renewingSoon.length}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="On no package"
          tone="neutral"
          value={byPackage.get("none") ?? 0}
          hint="Not yet subscribed"
          icon={<Layers className="size-4" />}
        />
      </div>

      <Alert tone="info" className="mt-6" title="Package prices are indicative">
        The figures below use the placeholder pricing in the briefing document, pending the
        commercial model. The run rate is therefore a shape, not a revenue number.
      </Alert>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PACKAGE_KEYS.map((key) => {
          const meta = packageMeta(key);
          const limit = productLimit(key);
          return (
            <Card key={key}>
              <CardBody>
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone={PACKAGE_TONE[key]}>{meta.name}</StatusPill>
                  <span className="text-lg font-semibold text-numeric text-foreground">
                    {byPackage.get(key) ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{meta.tagline}</p>
                <p className="mt-3 text-sm text-foreground text-numeric">
                  {meta.monthly === 0 ? (
                    "No charge"
                  ) : (
                    <>
                      <Currency value={meta.monthly} />
                      <span className="text-muted-foreground"> / month</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {limit === null ? "Unlimited listings" : `Up to ${limit} listings`}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Every supplier</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Change a package directly for an account-managed agreement.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {loading && !rows ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <DataTable
                minWidth="min-w-[54rem]"
                columns={[
                  { label: "Supplier", className: "px-4 py-2.5" },
                  { label: "Package" },
                  { label: "Cycle" },
                  { label: "Renews" },
                  { label: "Listings", align: "right" },
                  { label: "Override", className: "px-4 py-2.5" },
                ]}
              >
                {all.map(({ manufacturer, liveListings, draftListings }) => {
                  const sub = manufacturer.subscription;
                  const busy = busyId === manufacturer.id;
                  const limit = sub ? productLimit(sub.package) : null;
                  const total = liveListings + draftListings;
                  const overLimit = limit !== null && total > limit;

                  return (
                    <tr
                      key={manufacturer.id}
                      className={cn("align-middle", busy && "opacity-50")}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/manufacturers/${manufacturer.id}`}
                          className="font-medium text-foreground hover:text-brand hover:underline"
                        >
                          {manufacturer.tradingName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {manufacturer.county}
                          {canListProducts(manufacturer.status)
                            ? ""
                            : " · not yet cleared to list"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {sub ? (
                          <StatusPill tone={PACKAGE_TONE[sub.package]}>
                            {packageMeta(sub.package).name}
                          </StatusPill>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {sub ? (sub.billingCycle === "annual" ? "Annual" : "Monthly") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {sub?.renewsAt ? (
                          <>
                            <span className="text-muted-foreground text-numeric">
                              {formatDate(sub.renewsAt)}
                            </span>
                            {daysUntil(sub.renewsAt) <= 30 ? (
                              <p
                                className={cn(
                                  "text-xs text-numeric",
                                  daysUntil(sub.renewsAt) <= 7
                                    ? "text-warning"
                                    : "text-muted-foreground",
                                )}
                              >
                                in {daysUntil(sub.renewsAt)} days
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            "text-numeric",
                            overLimit ? "font-medium text-danger" : "text-muted-foreground",
                          )}
                        >
                          <Num value={total} />
                          {limit !== null ? ` / ${limit}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={sub?.package ?? ""}
                          onChange={(event) => {
                            const next = event.target.value as PackageKey;
                            if (!next) return;
                            setPackage(
                              manufacturer.id,
                              next,
                              sub?.billingCycle ?? "monthly",
                            );
                          }}
                          aria-label={`Package for ${manufacturer.tradingName}`}
                          className="h-8 w-auto text-xs"
                          disabled={busy}
                        >
                          {sub ? null : <option value="">Set a package</option>}
                          {PACKAGE_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {packageMeta(key).name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </CardBody>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle>Renewing next</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Within the next 30 days, soonest first.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {renewingSoon.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nothing renews in the next 30 days.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {renewingSoon.map(({ manufacturer }) => {
                  const sub = manufacturer.subscription!;
                  const days = daysUntil(sub.renewsAt!);
                  return (
                    <li key={manufacturer.id} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/admin/manufacturers/${manufacturer.id}`}
                          className="min-w-0 truncate text-sm text-foreground hover:text-brand hover:underline"
                        >
                          {manufacturer.tradingName}
                        </Link>
                        <span
                          className={cn(
                            "shrink-0 text-xs text-numeric",
                            days <= 7 ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          {days}d
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {packageMeta(sub.package).name} ·{" "}
                        <Currency value={packagePrice(sub.package, sub.billingCycle)} />{" "}
                        {sub.billingCycle}
                      </p>
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
