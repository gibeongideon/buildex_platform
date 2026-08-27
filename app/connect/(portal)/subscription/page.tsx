"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  BillingCycleToggle,
  PackageCards,
  PackageComparison,
} from "@/components/shared/package-picker";
import { Alert, Card, CardBody, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Currency, DetailRow } from "@/components/shared/format";
import { manufacturerRepo } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import {
  packageMeta,
  packagePrice,
  productLimit,
  hasRegionalTargeting,
  type BillingCycle,
  type PackageKey,
} from "@/lib/schemas/subscription";
import { useCurrentManufacturer } from "../use-current-manufacturer";
import { QueryError } from "@/components/ui/query-state";

export default function SubscriptionPage() {
  const { data, loading, error, refetch } = useCurrentManufacturer();
  const [saving, setSaving] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  const current = data?.manufacturer.subscription ?? null;

  // Derived rather than synced from the loaded subscription by an effect: the
  // selection is whatever was last clicked, otherwise the current plan.
  const [choice, setChoice] = React.useState<{
    pkg: PackageKey;
    cycle: BillingCycle;
  } | null>(null);

  const selected = choice?.pkg ?? current?.package ?? "free";
  const cycle = choice?.cycle ?? current?.billingCycle ?? "monthly";

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Subscription" />
        <Skeleton className="h-96" />
      </>
    );
  }

  if (!data) return null;
  const { manufacturer, products } = data;
  const limit = productLimit(selected);
  const changed =
    !current || current.package !== selected || current.billingCycle !== cycle;

  async function apply() {
    setSaving(true);
    try {
      await manufacturerRepo.setSubscription(manufacturer.id, selected, cycle);
      setConfirmed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Subscription"
        description="Your Buildex Connect package, and what changes if you move."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Subscription" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="space-y-6">
        {confirmed && !changed ? (
          <Alert tone="success" title="Package updated">
            You are now on {packageMeta(selected).name}, billed {cycle}.
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            <BillingCycleToggle
              cycle={cycle}
              onChange={(nextCycle) => {
                setChoice({ pkg: selected, cycle: nextCycle });
                setConfirmed(false);
              }}
            />
            <PackageCards
              selected={selected}
              cycle={cycle}
              onSelect={(pkg) => {
                setChoice({ pkg, cycle });
                setConfirmed(false);
              }}
              currentPackage={current?.package}
            />
            <PackageComparison highlight={selected} />
          </div>

          <div className="space-y-6">
            <Card className="lg:sticky lg:top-8">
              <CardHeader>
                <CardTitle>Current plan</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="divide-y divide-border">
                  <DetailRow
                    label="Package"
                    value={current ? packageMeta(current.package).name : "None selected"}
                  />
                  <DetailRow
                    label="Billing"
                    value={current ? (current.billingCycle === "annual" ? "Annual" : "Monthly") : "—"}
                  />
                  <DetailRow
                    label="Renews"
                    value={current?.renewsAt ? formatDate(current.renewsAt) : "—"}
                  />
                  <DetailRow
                    label="Listings used"
                    value={
                      <span className="text-numeric">
                        {products.length}
                        {limit === null ? " / unlimited" : ` / ${limit}`}
                      </span>
                    }
                  />
                </dl>

                {changed ? (
                  <div className="mt-4 rounded-md border border-border bg-surface-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">
                      Moving to
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {packageMeta(selected).name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {packagePrice(selected, cycle) === 0 ? (
                        "Free"
                      ) : (
                        <>
                          <Currency value={packagePrice(selected, cycle)} /> per{" "}
                          {cycle === "annual" ? "year" : "month"}
                        </>
                      )}
                    </p>
                    {limit !== null && products.length > limit ? (
                      <p className="mt-2 text-xs text-danger">
                        You have {products.length} listings but this package allows {limit}.
                        The oldest would need archiving.
                      </p>
                    ) : null}
                    {hasRegionalTargeting(selected) ? (
                      <p className="mt-2 text-xs text-success">
                        Unlocks regional targeting campaigns.
                      </p>
                    ) : null}
                    <Button className="mt-3 w-full" loading={saving} onClick={apply}>
                      Confirm change
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>

        <Alert tone="info" title="Pricing shown is indicative">
          Package pricing is still with Management and Commercial for approval. Treat these
          figures as placeholders for the demo, not as an approved commercial offer.
        </Alert>
      </div>
    </>
  );
}
