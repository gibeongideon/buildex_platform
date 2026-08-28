"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { marketplaceRepo, type MarketplaceSort } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { Currency } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import { Card, CardBody, EmptyState, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

/*
  Marketplace results.

  Full-bleed, six across, no persistent sidebar — the way the large B2B
  marketplaces lay results out. Products get the whole page; refinement lives in
  a horizontal bar above the grid that expands into a panel when you want it.
  A permanent left rail would cost roughly two columns of listings, and buyers
  scanning a grid want density far more often than they want facets.
*/

const SORTS: { value: MarketplaceSort; label: string }[] = [
  { value: "relevance", label: "Most in demand" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "lead-time", label: "Fastest delivery" },
  { value: "newest", label: "Newest listings" },
];

function FacetChips({
  options,
  selected,
  onToggle,
  limit = 12,
}: {
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  limit?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? options : options.slice(0, limit);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => onToggle(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-brand bg-brand-soft font-semibold text-brand"
                : "border-border bg-surface text-muted-foreground hover:border-brand hover:text-foreground",
            )}
          >
            {option.value}
            <span className="ml-1.5 text-subtle-foreground text-numeric">
              {option.count}
            </span>
          </button>
        );
      })}
      {options.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2 text-xs font-medium text-brand hover:underline"
        >
          {expanded ? "Show fewer" : `+${options.length - limit} more`}
        </button>
      ) : null}
    </div>
  );
}

function MarketplaceSearchInner() {
  // Deep links carry the query and filters, so the mega menu, hero tabs and
  // suggestion chips can all land the buyer on a pre-filtered result set.
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const initialCategory = params.get("category");
  const initialRegion = params.get("region");

  const [submittedQuery, setSubmittedQuery] = React.useState(initialQuery);
  const [categories, setCategories] = React.useState<string[]>(
    initialCategory ? [initialCategory] : [],
  );
  const [regions, setRegions] = React.useState<string[]>(
    initialRegion ? [initialRegion] : [],
  );
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [sort, setSort] = React.useState<MarketplaceSort>("relevance");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const { data, loading, error, refetch } = useQuery(
    () =>
      marketplaceRepo.search({
        query: submittedQuery,
        categories,
        regions,
        verifiedOnly,
        sort,
      }),
    [submittedQuery, categories.join(","), regions.join(","), verifiedOnly, sort],
  );

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const activeFilters = categories.length + regions.length + (verifiedOnly ? 1 : 0);

  function clearAll() {
    setCategories([]);
    setRegions([]);
    setVerifiedOnly(false);
    setSubmittedQuery("");
  }

  const facets = data?.facets;
  const listings = data?.listings ?? [];

  const heading = submittedQuery
    ? `Results for “${submittedQuery}”`
    : categories.length === 1
      ? categories[0]
      : regions.length === 1
        ? `Delivering to ${regions[0]}`
        : "All listings";

  return (
    <div className="mx-auto max-w-[112rem] px-4 py-5 sm:px-6 lg:px-8">
      <Breadcrumbs
        className="mb-3"
        items={[
          { label: "Marketplace", href: "/marketplace" },
          { label: heading },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="text-sm text-muted-foreground">
          {loading && !data ? (
            "Searching…"
          ) : (
            <>
              <span className="font-semibold text-foreground text-numeric">
                {facets?.total ?? 0}
              </span>{" "}
              {facets?.total === 1 ? "listing" : "listings"}
              {facets && facets.priceRange.max > 0 ? (
                <>
                  {" · "}
                  <Currency value={facets.priceRange.min} /> –{" "}
                  <Currency value={facets.priceRange.max} />
                </>
              ) : null}
            </>
          )}
        </p>
      </div>

      {/* Refinement bar — horizontal, so the grid keeps the full width. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-border py-3">
        <Button
          variant={filtersOpen ? "brand" : "secondary"}
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {activeFilters > 0 ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground text-numeric">
              {activeFilters}
            </span>
          ) : null}
          <ChevronDown
            className={cn("transition-transform", filtersOpen && "rotate-180")}
            aria-hidden="true"
          />
        </Button>

        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs transition-colors hover:border-brand">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
            className="size-3.5 accent-[var(--brand)]"
          />
          <span className="font-medium text-foreground">Fully verified only</span>
        </label>

        {[...categories, ...regions].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setCategories((c) => c.filter((v) => v !== value));
              setRegions((r) => r.filter((v) => v !== value));
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger"
          >
            {value}
            <X className="size-3" aria-hidden="true" />
          </button>
        ))}

        {activeFilters > 0 || submittedQuery ? (
          <button
            type="button"
            onClick={clearAll}
            className="px-2 text-xs font-medium text-muted-foreground hover:text-danger hover:underline"
          >
            Clear all
          </button>
        ) : null}

        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as MarketplaceSort)}
            className="h-9 w-auto"
            aria-label="Sort listings"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {filtersOpen ? (
        <div className="space-y-4 border-b border-border bg-surface-muted px-4 py-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Category
            </p>
            <FacetChips
              options={
                facets?.categories ??
                PRODUCT_CATEGORIES.map((c) => ({ value: c as string, count: 0 }))
              }
              selected={categories}
              onToggle={(v) => setCategories((c) => toggle(c, v))}
              limit={14}
            />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Delivers to
            </p>
            <FacetChips
              options={
                facets?.regions ?? REGIONS.map((r) => ({ value: r as string, count: 0 }))
              }
              selected={regions}
              onToggle={(v) => setRegions((r) => toggle(r, v))}
              limit={8}
            />
          </div>
          {facets && facets.manufacturers.length > 1 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                Suppliers in these results
              </p>
              <div className="flex flex-wrap gap-1.5">
                {facets.manufacturers.slice(0, 10).map((supplier) => (
                  <Link
                    key={supplier.id}
                    href={`/marketplace/manufacturer/${supplier.id}`}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                  >
                    {supplier.name}
                    <span className="ml-1.5 text-subtle-foreground text-numeric">
                      {supplier.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1700px]:grid-cols-7">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="mt-5">
          <CardBody className="p-0">
            <EmptyState
              icon={<Search className="size-5" />}
              title="No listings match those filters"
              description="Try removing a filter, widening the delivery region, or searching a broader term."
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Clear all filters
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div
          className={cn(
            "mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1700px]:grid-cols-7",
            loading && "opacity-60 transition-opacity",
          )}
        >
          {listings.map(({ product, manufacturer, enquiryCount }, index) => (
            <ProductCard
              key={product.id}
              product={product}
              manufacturer={manufacturer}
              enquiryCount={enquiryCount}
              priority={index < 6}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/*
  `useSearchParams()` opts a page out of static prerendering unless it sits
  inside a Suspense boundary, so the reading component is split out and wrapped.
  The fallback matches the loaded layout closely enough that nothing jumps.
*/
export default function MarketplaceSearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-[112rem] px-4 py-5 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-7 w-64" />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1700px]:grid-cols-7">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <MarketplaceSearchInner />
    </React.Suspense>
  );
}
