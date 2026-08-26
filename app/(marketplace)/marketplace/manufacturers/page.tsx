"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, CalendarDays, Clock, MapPin, Package, Search, Store } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS, regionForCounty } from "@/lib/schemas/common";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardBody, EmptyState, Skeleton, StatusPill } from "@/components/ui/primitives";
import { priceRange } from "@/lib/schemas/product";

/*
  The supplier directory — the "Manufacturers" search tab.

  Buyers who shop by supplier rather than by product are usually looking for
  someone who can cover a whole category in one delivery, so the card leads with
  range depth, location and responsiveness rather than a single price.
*/

type Sort = "range" | "response" | "established" | "name";

function ManufacturersDirectoryInner() {
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");
  const [region, setRegion] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("range");

  const { data, loading } = useQuery(() => marketplaceRepo.listStorefronts(), []);
  const { data: search } = useQuery(() => marketplaceRepo.search({ sort: "relevance" }), []);

  const priceByManufacturer = new Map<string, number>();
  for (const listing of search?.listings ?? []) {
    const min = priceRange(listing.product.priceBands).min;
    const current = priceByManufacturer.get(listing.manufacturer.id);
    if (current === undefined || min < current) {
      priceByManufacturer.set(listing.manufacturer.id, min);
    }
  }

  const rows = (data ?? [])
    .filter(({ manufacturer }) => {
      if (region && !manufacturer.distributionRegions.includes(region as never)) return false;
      if (category && !manufacturer.categories.includes(category as never)) return false;
      if (query.trim()) {
        const haystack = [
          manufacturer.tradingName,
          manufacturer.legalName,
          manufacturer.county,
          manufacturer.categories.join(" "),
          manufacturer.storefront.tagline,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "response":
          return (
            a.manufacturer.storefront.avgResponseHours -
            b.manufacturer.storefront.avgResponseHours
          );
        case "established":
          return a.manufacturer.yearEstablished - b.manufacturer.yearEstablished;
        case "name":
          return a.manufacturer.tradingName.localeCompare(b.manufacturer.tradingName);
        default:
          return b.productCount - a.productCount;
      }
    });

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/marketplace" className="hover:text-foreground hover:underline">
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Verified manufacturers</li>
        </ol>
      </nav>

      <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
        Verified manufacturers
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every supplier here has cleared checks against BRS, KRA and IPRS records before any
        of their listings went live.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search suppliers"
            aria-label="Search suppliers"
            className="h-9 pl-8"
          />
        </div>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
          className="h-9 w-auto"
        >
          <option value="">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          aria-label="Filter by delivery region"
          className="h-9 w-auto"
        >
          <option value="">Delivers anywhere</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          aria-label="Sort suppliers"
          className="h-9 w-auto sm:ml-auto"
        >
          <option value="range">Widest range</option>
          <option value="response">Fastest to reply</option>
          <option value="established">Longest trading</option>
          <option value="name">A–Z</option>
        </Select>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground text-numeric">{rows.length}</span>{" "}
        {rows.length === 1 ? "supplier" : "suppliers"}
      </p>

      {loading && rows.length === 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <CardBody className="p-0">
            <EmptyState
              icon={<Store className="size-5" />}
              title="No suppliers match"
              description="Try a broader search, or clear the category and region filters."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCategory("");
                    setRegion("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ manufacturer, productCount }) => {
            const from = priceByManufacturer.get(manufacturer.id);
            return (
              <li key={manufacturer.id}>
                <Link
                  href={`/marketplace/manufacturer/${manufacturer.id}`}
                  className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-brand"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground group-hover:text-brand">
                        {manufacturer.tradingName}
                        {manufacturer.status === "approved" ? (
                          <BadgeCheck
                            className="size-4 shrink-0 text-success"
                            aria-label="Verified"
                          />
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {manufacturer.storefront.tagline}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {manufacturer.county}, {regionForCounty(manufacturer.county)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      since {manufacturer.yearEstablished}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {manufacturer.categories.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-subtle-foreground">Listings</dt>
                      <dd className="font-semibold text-foreground text-numeric">
                        <Num value={productCount} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">From</dt>
                      <dd className="font-semibold text-foreground">
                        {from ? <Currency value={from} /> : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">Replies in</dt>
                      <dd className="font-semibold text-foreground">
                        {manufacturer.storefront.avgResponseHours}h
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/*
  `useSearchParams()` opts a page out of static prerendering unless it sits
  inside a Suspense boundary, so the reading component is split out and wrapped.
  The fallback matches the loaded layout closely enough that nothing jumps.
*/

export default function ManufacturersDirectoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-7 w-64" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>
      }
    >
      <ManufacturersDirectoryInner />
    </React.Suspense>
  );
}
