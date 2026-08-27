"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import { Card, CardBody, EmptyState, Skeleton } from "@/components/ui/primitives";
import { priceRange, type Product } from "@/lib/schemas/product";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { SearchField } from "@/components/ui/filter-bar";
import {
  ManufacturerRow,
  ManufacturerRowSkeleton,
} from "@/components/marketplace/manufacturer-row";

/*
  The supplier directory — the full "Manufacturers" surface.

  Buyers who shop by supplier rather than by product are usually looking for
  someone who can cover a whole category in one delivery, so the row leads with
  range depth, location and responsiveness rather than a single price.

  The row itself is `ManufacturerRow`, shared with the home page's Manufacturers
  tab. One definition, two surfaces: the shortlist on the home page and the full
  directory here can never describe the same supplier differently.
*/

type Sort = "range" | "response" | "established" | "name";

function ManufacturersDirectoryInner() {
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");
  const [region, setRegion] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("range");

  const { data, loading, error, refetch } = useQuery(() => marketplaceRepo.listStorefronts(), []);
  const { data: search } = useQuery(() => marketplaceRepo.search({ sort: "relevance" }), []);

  const priceByManufacturer = new Map<string, number>();
  const productsByManufacturer = new Map<string, Product[]>();
  for (const listing of search?.listings ?? []) {
    const min = priceRange(listing.product.priceBands).min;
    const current = priceByManufacturer.get(listing.manufacturer.id);
    if (current === undefined || min < current) {
      priceByManufacturer.set(listing.manufacturer.id, min);
    }
    const strip = productsByManufacturer.get(listing.manufacturer.id) ?? [];
    strip.push(listing.product);
    productsByManufacturer.set(listing.manufacturer.id, strip);
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
    <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: "Marketplace", href: "/marketplace" },
          { label: "Verified manufacturers" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
        Verified manufacturers
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every supplier here has cleared checks against BRS, KRA and IPRS records before any
        of their listings went live.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search suppliers"
          label="Search suppliers"
          className="sm:w-72"
        />
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
        <ul className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ManufacturerRowSkeleton key={i} />
          ))}
        </ul>
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
        <ul className="mt-4 space-y-4">
          {rows.map(({ manufacturer, productCount }) => (
            <ManufacturerRow
              key={manufacturer.id}
              manufacturer={manufacturer}
              products={productsByManufacturer.get(manufacturer.id) ?? []}
              productCount={productCount}
            />
          ))}
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
        <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
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
