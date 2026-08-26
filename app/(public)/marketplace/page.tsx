"use client";

import * as React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Store, X } from "lucide-react";
import { marketplaceRepo, type MarketplaceSort } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { Currency } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Separator,
  StatusPill,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/*
  The central Buildex Connect marketplace.

  Everything a manufacturer publishes lands here. From any listing a buyer can
  go two ways — into the product, or into that manufacturer's own storefront —
  which is the two-tier structure the whole marketplace rests on.

  Filter state lives in this component rather than the URL for now; when the
  backend lands, lifting it into searchParams makes results shareable without
  touching the filter UI.
*/

const SORTS: { value: MarketplaceSort; label: string }[] = [
  { value: "relevance", label: "Most in demand" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "lead-time", label: "Fastest delivery" },
  { value: "newest", label: "Newest listings" },
];

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  limit = 8,
}: {
  title: string;
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  limit?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? options : options.slice(0, limit);

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const active = selected.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "bg-brand-soft font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <span className="truncate">{option.value}</span>
                <span className="shrink-0 text-xs text-subtle-foreground text-numeric">
                  {option.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {options.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 px-2 text-xs font-medium text-brand hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${options.length}`}
        </button>
      ) : null}
    </div>
  );
}

export default function MarketplacePage() {
  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [categories, setCategories] = React.useState<string[]>([]);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [sort, setSort] = React.useState<MarketplaceSort>("relevance");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const { data, loading } = useQuery(
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

  const { data: storefronts } = useQuery(() => marketplaceRepo.listStorefronts(), []);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const activeFilters = categories.length + regions.length + (verifiedOnly ? 1 : 0);

  function clearAll() {
    setCategories([]);
    setRegions([]);
    setVerifiedOnly(false);
    setQuery("");
    setSubmittedQuery("");
  }

  const facets = data?.facets;
  const listings = data?.listings ?? [];

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span className="text-sm">
            <span className="font-medium text-foreground">Fully verified only</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Excludes suppliers still completing a site visit.
            </span>
          </span>
        </label>
      </div>

      <Separator />

      <FacetGroup
        title="Category"
        options={
          facets?.categories ??
          PRODUCT_CATEGORIES.map((c) => ({ value: c as string, count: 0 }))
        }
        selected={categories}
        onToggle={(v) => setCategories((c) => toggle(c, v))}
      />

      <Separator />

      <FacetGroup
        title="Delivers to"
        options={
          facets?.regions ?? REGIONS.map((r) => ({ value: r as string, count: 0 }))
        }
        selected={regions}
        onToggle={(v) => setRegions((r) => toggle(r, v))}
        limit={8}
      />

      {facets && facets.priceRange.max > 0 ? (
        <>
          <Separator />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Entry price range
            </p>
            <p className="text-sm text-muted-foreground">
              <Currency value={facets.priceRange.min} /> —{" "}
              <Currency value={facets.priceRange.max} />
            </p>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <section className="on-brand">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Buildex Connect Marketplace
          </p>
          <h1 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white">
            Source building materials directly from verified manufacturers.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Wholesale price bands, minimum order quantities and lead times published
            up front — compare on the quantity you actually buy.
          </p>

          <form
            className="mt-6 flex max-w-2xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(query);
              setSort("relevance");
            }}
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cement, rebar, tiles, cable…"
                aria-label="Search the marketplace"
                className="h-11 pl-9"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Filters</p>
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="mt-4">{filterPanel}</div>

            {storefronts?.length ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Browse by supplier</CardTitle>
                </CardHeader>
                <CardBody className="space-y-0.5 py-2">
                  {storefronts.slice(0, 8).map(({ manufacturer, productCount }) => (
                    <Link
                      key={manufacturer.id}
                      href={`/marketplace/manufacturer/${manufacturer.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <span className="truncate">{manufacturer.tradingName}</span>
                      <span className="shrink-0 text-xs text-subtle-foreground text-numeric">
                        {productCount}
                      </span>
                    </Link>
                  ))}
                </CardBody>
              </Card>
            ) : null}
          </aside>

          <main className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setFiltersOpen((v) => !v)}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filters
                  {activeFilters > 0 ? (
                    <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">
                      {activeFilters}
                    </span>
                  ) : null}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {loading && !data ? (
                    "Searching…"
                  ) : (
                    <>
                      <span className="font-medium text-foreground text-numeric">
                        {facets?.total ?? 0}
                      </span>{" "}
                      {facets?.total === 1 ? "listing" : "listings"}
                      {submittedQuery ? (
                        <>
                          {" "}
                          for &ldquo;
                          <span className="text-foreground">{submittedQuery}</span>&rdquo;
                        </>
                      ) : null}
                    </>
                  )}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
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

            {activeFilters > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[...categories, ...regions].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setCategories((c) => c.filter((v) => v !== value));
                      setRegions((r) => r.filter((v) => v !== value));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-foreground transition-colors hover:border-danger hover:text-danger"
                  >
                    {value}
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ))}
                {verifiedOnly ? (
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-foreground transition-colors hover:border-danger hover:text-danger"
                  >
                    Fully verified only
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}

            {filtersOpen ? (
              <Card className="mt-4 lg:hidden">
                <CardBody>{filterPanel}</CardBody>
              </Card>
            ) : null}

            {loading && !data ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
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
                  "mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
                  loading && "opacity-60 transition-opacity",
                )}
              >
                {listings.map(({ product, manufacturer }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    manufacturer={manufacturer}
                  />
                ))}
              </div>
            )}

            {storefronts?.length ? (
              <section className="mt-12">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Suppliers on Buildex Connect
                  </h2>
                  <p className="text-sm text-muted-foreground text-numeric">
                    {storefronts.length} verified
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {storefronts.map(({ manufacturer, productCount }) => (
                    <Link
                      key={manufacturer.id}
                      href={`/marketplace/manufacturer/${manufacturer.id}`}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-brand">
                        <Store className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {manufacturer.tradingName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {manufacturer.county} · {productCount} products
                        </span>
                        <span className="mt-1.5 block">
                          <StatusPill
                            tone={
                              manufacturer.status === "approved" ? "success" : "warning"
                            }
                          >
                            {manufacturer.status === "approved"
                              ? "Verified"
                              : "Verification in progress"}
                          </StatusPill>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <Alert tone="info" className="mt-10" title="Prototype marketplace">
              Listings, suppliers and prices are mock data for demonstration. Enquiries
              you send are stored in your browser only.
            </Alert>
          </main>
        </div>
      </div>
    </>
  );
}
