"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, Clock, Eye, MapPin, MessageSquare, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num, Pct } from "@/components/shared/format";
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
} from "@/components/ui/primitives";
import { insightsRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { priceRange } from "@/lib/schemas/product";
import { hasRegionalTargeting, packageMeta } from "@/lib/schemas/subscription";
import { cn } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";
import { DataTable } from "@/components/ui/data-table";

/*
  Market insights.

  Every figure here is derived from the campaigns and enquiries the manufacturer
  can already see, never from a separate metrics store. That means this page can
  never disagree with the inbox — a class of bug that plagues dashboards built
  on their own aggregation tables.

  Charts are plain CSS bars rather than a charting library: at this data density
  a bar and a number beat an axis, and it keeps the bundle honest.
*/

function BarRow({
  label,
  value,
  max,
  secondary,
  href,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  secondary?: React.ReactNode;
  href?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-foreground">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-foreground text-numeric">
          {secondary ?? <Num value={value} />}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
    </>
  );

  return (
    <li className="py-2.5">
      {href ? (
        <Link href={href} className="block rounded-md transition-opacity hover:opacity-80">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

export default function InsightsPage() {
  const { data: current, loading: loadingManufacturer } = useCurrentManufacturer();
  const manufacturerId = current?.manufacturer.id ?? null;

  const { data: summary, error, refetch } = useQuery(
    async () => (manufacturerId ? insightsRepo.summary(manufacturerId) : null),
    [manufacturerId],
  );
  const { data: performance, loading } = useQuery(
    async () => (manufacturerId ? insightsRepo.productPerformance(manufacturerId) : []),
    [manufacturerId],
  );
  const { data: regions } = useQuery(
    async () => (manufacturerId ? insightsRepo.regionDemand(manufacturerId) : []),
    [manufacturerId],
  );

  if (loadingManufacturer && !current) {
    return (
      <>
        <PageHeader title="Market insights" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!current) return null;

  const { manufacturer } = current;
  const pkg = manufacturer.subscription?.package ?? "free";
  const fullInsights = hasRegionalTargeting(pkg);

  const rows = performance ?? [];
  const withActivity = rows.filter((r) => r.views > 0 || r.enquiries > 0);
  const maxViews = Math.max(1, ...rows.map((r) => r.views));
  const maxEnquiries = Math.max(1, ...rows.map((r) => r.enquiries));
  const regionRows = regions ?? [];
  const maxRegion = Math.max(1, ...regionRows.map((r) => r.enquiries));

  // Listings drawing views but no enquiries are the actionable ones: buyers are
  // finding them and walking away, which usually means price or lead time.
  const lookersNotBuyers = rows
    .filter((r) => r.views > 500 && r.enquiries === 0)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Market insights"
        description="What the hardware network is actually doing with your listings."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Insights" },
        ]}
      />

        <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Product views"
          tone="info"
          value={<Num value={summary?.views ?? 0} />}
          hint="From your regional campaigns"
          icon={<Eye className="size-4" />}
        />
        <StatCard
          label="Enquiries"
          tone="success"
          value={<Num value={summary?.enquiries ?? 0} />}
          hint={
            summary && summary.views
              ? `${((summary.enquiries / summary.views) * 100).toFixed(2)}% of views`
              : "—"
          }
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label="Accepted value"
          tone="success"
          value={<Currency value={summary?.acceptedValueKsh ?? 0} compact />}
          hint={`${summary?.orders ?? 0} orders won`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Response rate"
          tone="success"
          value={<Pct value={summary?.responseRatePercent ?? 0} />}
          hint={
            summary
              ? `Average reply in ${summary.avgResponseHours.toFixed(1)}h`
              : "—"
          }
          icon={<Clock className="size-4" />}
        />
      </div>

      {!fullInsights ? (
        <Alert
          tone="info"
          className="mt-6"
          title={`You are seeing basic insights on ${packageMeta(pkg).name}`}
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/subscription">Compare packages</Link>
            </Button>
          }
        >
          Premium adds regional demand breakdowns, price positioning against comparable
          listings, and which regions view your products without enquiring.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Most viewed listings</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Views attributed from the campaigns that carried each listing.
            </p>
          </CardHeader>
          <CardBody className="py-2">
            {loading && rows.length === 0 ? (
              <div className="space-y-3 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : withActivity.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="size-5" />}
                title="No campaign activity yet"
                description="Run a regional campaign to start attributing views to your listings."
                action={
                  <Button asChild>
                    <Link href="/connect/campaigns">Set up a campaign</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {withActivity.slice(0, 8).map((row) => (
                  <BarRow
                    key={row.product.id}
                    label={row.product.name}
                    value={row.views}
                    max={maxViews}
                    href={`/connect/catalogue/${row.product.id}`}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most enquired listings</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Where buyers are actually asking for a price.
            </p>
          </CardHeader>
          <CardBody className="py-2">
            {rows.filter((r) => r.enquiries > 0).length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="size-5" />}
                title="No enquiries yet"
                description="Enquiries arrive when hardware shops request a quote from your listings."
              />
            ) : (
              <ul className="divide-y divide-border">
                {rows
                  .filter((r) => r.enquiries > 0)
                  .slice(0, 8)
                  .map((row) => (
                    <BarRow
                      key={row.product.id}
                      label={row.product.name}
                      value={row.enquiries}
                      max={maxEnquiries}
                      href={`/connect/catalogue/${row.product.id}`}
                    />
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card className={cn(!fullInsights && "opacity-60")}>
          <CardHeader>
            <CardTitle>Demand by region</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Share of your enquiries by the buyer&apos;s delivery region.
            </p>
          </CardHeader>
          <CardBody className="py-2">
            {regionRows.length === 0 ? (
              <EmptyState
                icon={<MapPin className="size-5" />}
                title="No regional data yet"
                description="This fills in as enquiries arrive from different regions."
              />
            ) : (
              <ul className="divide-y divide-border">
                {regionRows.map((row) => (
                  <BarRow
                    key={row.region}
                    label={row.region}
                    value={row.enquiries}
                    max={maxRegion}
                    secondary={
                      <>
                        <Num value={row.enquiries} />{" "}
                        <span className="font-normal text-muted-foreground">
                          (<Pct value={row.shareOfEnquiriesPercent} />)
                        </span>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seen but not enquired</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Buyers are finding these and walking away — usually price or lead time.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {lookersNotBuyers.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="size-5" />}
                title="Nothing stalling"
                description="Every listing with meaningful visibility is generating enquiries."
              />
            ) : (
              <DataTable
                minWidth="min-w-[28rem]"
                columns={[
                  { label: "Listing", className: "px-5 py-2.5" },
                  { label: "Views", align: "right" },
                  { label: "Entry price", align: "right" },
                  { label: "Lead time", align: "right", className: "px-5 py-2.5" },
                ]}
              >
                {lookersNotBuyers.map((row) => (
                  <tr key={row.product.id}>
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/connect/catalogue/${row.product.id}`}
                        className="font-medium text-foreground hover:text-brand hover:underline"
                      >
                        {row.product.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      <Num value={row.views} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-foreground">
                      <Currency value={priceRange(row.product.priceBands).min} />
                    </td>
                    <td className="px-5 py-2.5 text-right text-muted-foreground">
                      {row.product.leadTimeDays}d
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </CardBody>
        </Card>
      </div>

      <Alert tone="info" className="mt-6" title="How these figures are built">
        Views come from the regional campaigns that carried each listing. Enquiries and
        orders come from your inbox. Nothing here is stored separately, so these numbers
        always reconcile with what you see on the other pages.
      </Alert>
    </>
  );
}
