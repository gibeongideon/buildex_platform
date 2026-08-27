"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Factory,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { priceRange, type Product } from "@/lib/schemas/product";
import { canTransact } from "@/lib/schemas/verification";
import { capacityBandLabel, regionForCounty } from "@/lib/schemas/common";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { BuildexMark } from "@/components/shared/brand";
import { Currency, DetailRow, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Separator,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";

/*
  A manufacturer's own storefront.

  This is the second tier of the marketplace: the central catalogue lists
  everything, and each supplier gets a page carrying only their range. It uses
  the Buildex Connect palette rather than per-supplier colours — buyers should
  read it as a verified page *inside* the platform, not as an off-site website,
  and it keeps 200 storefronts from turning the marketplace into a colour riot.

  What differentiates one store from another is therefore substance: their
  range, their terms, their trading record.
*/

type StoreSort = "name" | "price-asc" | "price-desc" | "lead-time";

export default function ManufacturerStorefrontPage() {
  const params = useParams<{ id: string }>();
  const manufacturerId = params.id;

  const { data, loading, error, refetch } = useQuery(
    () => marketplaceRepo.getStorefront(manufacturerId),
    [manufacturerId],
  );

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState<StoreSort>("name");

  if (loading && !data) {
    return (
      <div>
        <Skeleton className="h-48 w-full" />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /*
    Ahead of the "not available" branch on purpose. A failed load and an
    unverified supplier both leave `data` undefined, and falling through would
    tell a buyer this supplier has not completed verification — a claim about
    the supplier, made because a fetch failed.
  */
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <QueryError
          error={error}
          onRetry={refetch}
          title="Could not load this storefront"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Store className="size-5" />}
              title="Store not available"
              description="This supplier has not completed verification, so their storefront is not published on the marketplace yet."
              action={
                <Button asChild>
                  <Link href="/marketplace">Browse the marketplace</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const { manufacturer, products } = data;
  const { storefront } = manufacturer;
  const verified = manufacturer.status === "approved";
  const ordersEnabled = canTransact(manufacturer.status);

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filtered = products
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (query.trim()) {
        const haystack = `${p.name} ${p.sku} ${p.description}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a: Product, b: Product) => {
      switch (sort) {
        case "price-asc":
          return priceRange(a.priceBands).min - priceRange(b.priceBands).min;
        case "price-desc":
          return priceRange(b.priceBands).min - priceRange(a.priceBands).min;
        case "lead-time":
          return a.leadTimeDays - b.leadTimeDays;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const cheapest = products.length
    ? Math.min(...products.map((p) => priceRange(p.priceBands).min))
    : 0;
  const fastest = products.length
    ? Math.min(...products.map((p) => p.leadTimeDays))
    : 0;

  return (
    <>
      {/* Store banner — Buildex Connect chrome, supplier content. */}
      <section className="on-brand">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Buildex Connect marketplace
          </Link>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                <Factory className="size-7 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                    {manufacturer.tradingName}
                  </h1>
                  {verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-white">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Verified supplier
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      <Clock className="size-3.5" aria-hidden="true" />
                      Verification in progress
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-xl text-sm text-white/75">
                  {storefront.tagline}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {manufacturer.county}, {regionForCounty(manufacturer.county)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Trading since {manufacturer.yearEstablished}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="size-3.5" aria-hidden="true" />
                    {products.length} products
                  </span>
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-4 lg:shrink-0">
              {[
                {
                  label: "Response rate",
                  value: `${storefront.responseRatePercent}%`,
                },
                {
                  label: "Replies within",
                  value: `${storefront.avgResponseHours}h`,
                },
                {
                  label: "Orders fulfilled",
                  value: storefront.ordersFulfilled.toLocaleString("en-KE"),
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[11px] uppercase tracking-wider text-white/50">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 font-display text-lg font-bold text-white text-numeric">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!ordersEnabled ? (
          <Alert
            tone="warning"
            className="mb-6"
            title="Orders are not yet enabled for this supplier"
          >
            {manufacturer.tradingName} has cleared document, registry and identity
            checks and is completing a physical site visit. You can browse the range
            and send enquiries; orders open when the visit clears.
          </Alert>
        ) : null}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
          <main className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Product range
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search this store"
                    aria-label={`Search ${manufacturer.tradingName} products`}
                    className="h-9 w-full pl-8 sm:w-48"
                  />
                </div>
                <Select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-label="Filter by category"
                  className="h-9 w-auto"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as StoreSort)}
                  aria-label="Sort products"
                  className="h-9 w-auto"
                >
                  <option value="name">A–Z</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="lead-time">Fastest delivery</option>
                </Select>
              </div>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground text-numeric">
                {filtered.length}
              </span>{" "}
              of {products.length} products
              {category ? ` in ${category}` : ""}
            </p>

            {filtered.length === 0 ? (
              <Card className="mt-4">
                <CardBody className="p-0">
                  <EmptyState
                    icon={<Search className="size-5" />}
                    title="Nothing matches in this store"
                    description="Try a broader search term or clear the category filter."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setQuery("");
                          setCategory("");
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                </CardBody>
              </Card>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    manufacturer={manufacturer}
                    hideSupplier
                  />
                ))}
              </div>
            )}

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>About {manufacturer.tradingName}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {storefront.about}
                </p>

                <Separator className="my-4" />

                <dl className="divide-y divide-border">
                  <DetailRow label="Registered name" value={manufacturer.legalName} />
                  <DetailRow
                    label="Categories"
                    value={manufacturer.categories.join(", ")}
                  />
                  <DetailRow
                    label="Production capacity"
                    value={capacityBandLabel(manufacturer.capacityBand)}
                  />
                  <DetailRow
                    label="Distributes to"
                    value={manufacturer.distributionRegions.join(", ")}
                  />
                  <DetailRow label="Plant" value={manufacturer.physicalAddress} />
                  {manufacturer.website ? (
                    <DetailRow
                      label="Website"
                      value={
                        <a
                          href={manufacturer.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-brand hover:underline"
                        >
                          {manufacturer.website.replace(/^https?:\/\//, "")}
                        </a>
                      }
                    />
                  ) : null}
                </dl>
              </CardBody>
            </Card>
          </main>

          <aside className="mt-8 space-y-5 lg:mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Store at a glance</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">Prices from</dt>
                    <dd className="text-sm font-semibold text-foreground">
                      <Currency value={cheapest} />
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">Fastest lead time</dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {fastest === 0 ? "Same day" : `${fastest} days`}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">Categories</dt>
                    <dd className="text-sm font-semibold text-foreground text-numeric">
                      <Num value={categories.length} />
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading terms</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Payment
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {storefront.paymentTerms.map((term) => (
                      <li
                        key={term}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2
                          className="mt-0.5 size-3.5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        {term}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Delivery
                  </p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground">
                    <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {storefront.deliveryPolicy}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Minimum order
                  </p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground">
                    <Package className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {storefront.minOrderPolicy}
                  </p>
                </div>
              </CardBody>
            </Card>

            {storefront.certifications.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-2">
                    {storefront.certifications.map((cert) => (
                      <li key={cert} className="flex items-start gap-2 text-sm">
                        <ShieldCheck
                          className="mt-0.5 size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{cert}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Verification</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2.5">
                {[
                  { label: "Business registration (BRS)", key: "brs_lookup" },
                  { label: "Tax PIN (KRA)", key: "kra_pin_validation" },
                  { label: "Director identity (IPRS)", key: "iprs_director_id" },
                  { label: "Physical site visit", key: "site_visit" },
                ].map((row) => {
                  const check = manufacturer.checks.find((c) => c.key === row.key);
                  const passed = check?.status === "passed";
                  const notRequired = check?.status === "not_required";
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <StatusPill
                        tone={passed ? "success" : notRequired ? "neutral" : "warning"}
                      >
                        {passed ? "Passed" : notRequired ? "Not required" : "Pending"}
                      </StatusPill>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <div className="rounded-lg border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2">
                <BuildexMark className="h-5" />
                <p className="font-display text-xs font-bold uppercase tracking-wider text-brand">
                  Buildex Connect
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This store is hosted on Buildex Connect. Supplier details are verified
                against government registries before any listing goes live.
              </p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
                <Link href="/marketplace">
                  <Building2 aria-hidden="true" />
                  Browse all suppliers
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
