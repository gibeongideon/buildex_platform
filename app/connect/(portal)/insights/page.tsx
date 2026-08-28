"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, Clock, Eye, Layers, MapPin, MessageSquare, Repeat, TrendingUp } from "lucide-react";
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
import { cn, formatRelative } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/field";
import { CountyMap } from "@/components/shared/county-map";

/*
  Market insights.

  Every figure here is derived from the campaigns and enquiries the manufacturer
  can already see, never from a separate metrics store. That means this page can
  never disagree with the inbox — a class of bug that plagues dashboards built
  on their own aggregation tables.

  Charts are plain CSS bars rather than a charting library: at this data density
  a bar and a number beat an axis, and it keeps the bundle honest.
*/

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { month: "short", year: "numeric" });

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

  /*
    The destination map and its trend read the delivery history. The filter is
    one control over both: a category, or a single listing within it.
  */
  const [scope, setScope] = React.useState<{ category?: string; productId?: string }>(
    {},
  );
  const scopeKey = `${scope.category ?? ""}:${scope.productId ?? ""}`;
  const [selectedCounty, setSelectedCounty] = React.useState<string | null>(null);

  const { data: counties, loading: loadingMap } = useQuery(
    async () => (manufacturerId ? insightsRepo.demandByCounty(manufacturerId, scope) : []),
    [manufacturerId, scopeKey],
  );
  const { data: trend } = useQuery(
    async () => (manufacturerId ? insightsRepo.demandTrend(manufacturerId, scope) : []),
    [manufacturerId, scopeKey],
  );
  const { data: gaps, loading: loadingGaps } = useQuery(
    async () => (manufacturerId ? insightsRepo.categoryGaps(manufacturerId) : []),
    [manufacturerId],
  );
  const { data: pricing, loading: loadingPricing } = useQuery(
    async () => (manufacturerId ? insightsRepo.pricePosition(manufacturerId) : []),
    [manufacturerId],
  );
  const { data: repeats, loading: loadingRepeats } = useQuery(
    async () => (manufacturerId ? insightsRepo.repeatBuyers(manufacturerId) : []),
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

  const countyRows = counties ?? [];
  const trendRows = trend ?? [];
  const gapRows = (gaps ?? []).slice(0, 5);
  const pricingRows = pricing ?? [];
  const repeatRows = (repeats ?? []).slice(0, 6);

  const ownCategories = [...new Set(rows.map((r) => r.product.category))].sort();
  const scopedProducts = rows
    .map((r) => r.product)
    .filter((p) => !scope.category || p.category === scope.category);

  const deliveredValue = countyRows.reduce((sum, r) => sum + r.valueKsh, 0);
  const deliveries = countyRows.reduce((sum, r) => sum + r.deliveries, 0);
  const maxMonth = Math.max(1, ...trendRows.map((t) => t.valueKsh));

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

      {/*
        Where the material actually goes.

        The map answers a question the enquiry counts cannot: an enquiry is
        interest, a delivery is a market. Filtering narrows both the map and the
        trend, so "who buys my rapid-hardening cement, and where" is two clicks.
      */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Where your material goes</CardTitle>
              {/*
                The window is derived, not asserted. History starts when a
                listing was published, so "the last twelve months" would be a
                claim about data that does not exist for a catalogue added
                three months ago.
              */}
              <p className="mt-1 text-sm text-muted-foreground">
                {trendRows.length > 0
                  ? `Deliveries by destination county, since ${monthLabel(trendRows[0].month)}.`
                  : "Deliveries by destination county."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={scope.category ?? ""}
                onChange={(event) =>
                  setScope({ category: event.target.value || undefined })
                }
                aria-label="Filter by category"
                className="h-9 w-auto"
              >
                <option value="">All categories</option>
                {ownCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
              <Select
                value={scope.productId ?? ""}
                onChange={(event) =>
                  setScope((current) => ({
                    ...current,
                    productId: event.target.value || undefined,
                  }))
                }
                aria-label="Filter by listing"
                className="h-9 w-auto"
              >
                <option value="">All listings</option>
                {scopedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {loadingMap && countyRows.length === 0 ? (
            <Skeleton className="h-80" />
          ) : countyRows.length === 0 ? (
            <EmptyState
              icon={<MapPin className="size-5" />}
              title="No deliveries in this selection"
              description="Widen the filter, or publish a listing into another region."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] [&>*]:min-w-0">
              <div>
                <CountyMap
                  rows={countyRows}
                  selected={selectedCounty}
                  onSelect={setSelectedCounty}
                />
              </div>

              <div className="min-w-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Delivered value
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-price">
                      <Currency value={deliveredValue} compact />
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Deliveries
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-foreground text-numeric">
                      <Num value={deliveries} />
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Counties reached
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-foreground text-numeric">
                      {countyRows.length}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        of 47
                      </span>
                    </p>
                  </div>
                </div>

                <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                  Top destinations
                </p>
                <ul className="divide-y divide-border">
                  {countyRows.slice(0, 8).map((row) => (
                    <BarRow
                      key={row.county}
                      label={
                        <span
                          className={cn(
                            selectedCounty === row.county && "font-semibold text-brand",
                          )}
                        >
                          {row.county}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {row.region}
                          </span>
                        </span>
                      }
                      value={row.valueKsh}
                      max={countyRows[0].valueKsh}
                      secondary={<Currency value={row.valueKsh} compact />}
                    />
                  ))}
                </ul>

                {trendRows.length > 1 ? (
                  <>
                    <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                      By month
                    </p>
                    {/*
                      Bars, not a line chart: twelve points do not need an axis,
                      and this keeps the page free of a charting dependency.
                    */}
                    <div className="flex h-20 items-end gap-1">
                      {trendRows.map((point) => (
                        <div
                          key={point.month}
                          className="group relative flex-1 rounded-t bg-brand-soft"
                          style={{
                            height: `${Math.max(4, (point.valueKsh / maxMonth) * 100)}%`,
                          }}
                          title={`${monthLabel(point.month)} — KSh ${Math.round(
                            point.valueKsh,
                          ).toLocaleString("en-KE")}`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-subtle-foreground">
                      <span>{monthLabel(trendRows[0].month)}</span>
                      <span>{monthLabel(trendRows[trendRows.length - 1].month)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

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

      {/*
        The three questions a supplier asks after "where is my material going":
        what should I sell next, am I priced right, and who keeps coming back.
      */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Categories you could add</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Moving in the regions you already deliver to, and not in your catalogue.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {loadingGaps && !gaps ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : gapRows.length === 0 ? (
              <EmptyState
                icon={<Layers className="size-5" />}
                title="Nothing obvious to add"
                description="You already list every category with volume in your regions."
              />
            ) : (
              <DataTable
                minWidth="min-w-[30rem]"
                columns={[
                  { label: "Category", className: "px-5 py-2.5" },
                  { label: "Delivered", align: "right" },
                  { label: "Suppliers there", align: "right", className: "px-5 py-2.5" },
                ]}
              >
                {gapRows.map((gap) => (
                  <tr key={gap.category} className="align-middle">
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {gap.category}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Currency value={gap.valueKsh} compact className="text-price font-semibold" />
                      <span className="ml-1.5 text-xs text-muted-foreground text-numeric">
                        {gap.deliveries} deliveries
                      </span>
                    </td>
                    {/*
                      Competitor count is the other half of the story: a big
                      number with one supplier in it is an opening, the same
                      number with nine is a fight.
                    */}
                    <td className="px-5 py-2.5 text-right text-numeric text-muted-foreground">
                      {gap.competitors}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where you sit on price</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Your entry price against the median live listing in the same category,
              sold by the same unit.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {loadingPricing && !pricing ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : pricingRows.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="size-5" />}
                title="Not enough of a market to compare against"
                description="Price position needs at least three live listings in the same category sold by the same unit."
              />
            ) : (
              <DataTable
                minWidth="min-w-[32rem]"
                columns={[
                  { label: "Listing", className: "px-5 py-2.5" },
                  { label: "Yours", align: "right" },
                  { label: "Market median", align: "right" },
                  { label: "Gap", align: "right", className: "px-5 py-2.5" },
                ]}
              >
                {pricingRows.slice(0, 6).map((row) => {
                  const cheaper = row.differencePercent < 0;
                  return (
                    <tr key={row.product.id} className="align-middle">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/connect/catalogue/${row.product.id}`}
                          className="font-medium text-foreground hover:text-brand hover:underline"
                        >
                          {row.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          against{" "}
                          <span className="text-numeric">{row.listingsCompared}</span>{" "}
                          {row.listingsCompared === 1 ? "listing" : "listings"} per{" "}
                          {row.product.unit}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Currency value={row.yourEntryKsh} className="text-price font-semibold" />
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        <Currency value={row.marketMedianKsh} />
                      </td>
                      <td
                        className={cn(
                          "px-5 py-2.5 text-right font-semibold text-numeric",
                          cheaper ? "text-success" : "text-warning",
                        )}
                      >
                        {cheaper ? "" : "+"}
                        {row.differencePercent.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shops that came back</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            More than one delivery. Repeat trade is cheaper to keep than to win.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {loadingRepeats && !repeats ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : repeatRows.length === 0 ? (
            <EmptyState
              icon={<Repeat className="size-5" />}
              title="No repeat buyers yet"
              description="This fills in once a shop orders from you a second time."
            />
          ) : (
            <DataTable
              minWidth="min-w-[40rem]"
              columns={[
                { label: "Shop", className: "px-5 py-2.5" },
                { label: "Deliveries", align: "right" },
                { label: "Value", align: "right" },
                { label: "Delivered to", className: "px-5 py-2.5" },
              ]}
            >
              {repeatRows.map((buyer) => (
                <tr key={buyer.buyerId} className="align-middle">
                  <td className="px-5 py-2.5 font-medium text-foreground">
                    {buyer.buyerName}
                    <p className="text-xs text-muted-foreground">
                      Last {formatRelative(buyer.lastAt)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-numeric text-muted-foreground">
                    {buyer.deliveries}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Currency value={buyer.valueKsh} compact className="text-price font-semibold" />
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">
                    {buyer.counties.slice(0, 4).join(", ")}
                    {buyer.counties.length > 4 ? ` +${buyer.counties.length - 4}` : ""}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Alert tone="info" className="mt-6" title="How these figures are built">
        Views come from the regional campaigns that carried each listing. Enquiries and
        orders come from your inbox. Nothing here is stored separately, so these numbers
        always reconcile with what you see on the other pages.
      </Alert>
    </>
  );
}
