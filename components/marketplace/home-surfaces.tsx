"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Factory,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import {
  ManufacturerRow,
  ManufacturerRowSkeleton,
} from "@/components/marketplace/manufacturer-row";
import { SUPPLIER_CAPABILITIES } from "@/lib/rules/suppliers";
import { SOURCING_EXAMPLES } from "@/lib/rules/sourcing";
import { PRODUCT_CATEGORIES, REGIONS, COUNTIES, type Region } from "@/lib/schemas/common";
import { priceRange, type Product } from "@/lib/schemas/product";
import { REGION_REACH } from "@/lib/schemas/campaign";
import { cn } from "@/lib/utils";

/*
  The home page's non-product surfaces.

  Each scope tab shows real content in place rather than sending the buyer to
  another page — the behaviour the reference marketplace has, and the reason its
  tabs feel like tabs. Each surface fetches only what it needs, so choosing a tab
  is the thing that triggers its data, and the ones you never open cost nothing.
*/

/**
 * The claim strip under the search field.
 *
 * The reference site runs "Connect with 34K+ verified manufacturers" with three
 * proof points. Ours says the same kind of thing with numbers that are true of
 * the actual catalogue, counted rather than asserted.
 */
export function SurfaceHeadline({
  headline,
  points,
}: {
  headline: React.ReactNode;
  points: string[];
}) {
  return (
    <div className="pb-8 text-center">
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {headline}
      </h2>
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-3.5 text-success" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manufacturers
// ---------------------------------------------------------------------------

export function ManufacturersSurface() {
  const { data: storefronts, loading } = useQuery(
    () => marketplaceRepo.listStorefronts(),
    [],
  );
  const { data: search } = useQuery(
    () => marketplaceRepo.search({ sort: "relevance" }),
    [],
  );
  const [category, setCategory] = React.useState("");
  const [capabilities, setCapabilities] = React.useState<string[]>([]);

  // Each supplier's own listings, so a row can show what they actually make.
  const productsBySupplier = new Map<string, Product[]>();
  for (const listing of search?.listings ?? []) {
    const strip = productsBySupplier.get(listing.manufacturer.id) ?? [];
    strip.push(listing.product);
    productsBySupplier.set(listing.manufacturer.id, strip);
  }

  const rows = (storefronts ?? [])
    .map((row) => ({
      ...row,
      products: productsBySupplier.get(row.manufacturer.id) ?? [],
    }))
    .filter(({ manufacturer, products }) => {
      if (category && !manufacturer.categories.includes(category as never)) return false;
      return capabilities.every((key) => {
        const meta = SUPPLIER_CAPABILITIES.find((c) => c.key === key);
        return meta ? meta.matches(manufacturer, products) : true;
      });
    })
    // Widest range first: a buyer shopping by supplier usually wants one
    // delivery to cover several lines.
    .sort((a, b) => b.productCount - a.productCount);

  // Only offer a capability chip that would actually return something.
  const available = SUPPLIER_CAPABILITIES.filter((capability) =>
    (storefronts ?? []).some(({ manufacturer }) =>
      capability.matches(manufacturer, productsBySupplier.get(manufacturer.id) ?? []),
    ),
  );

  const categoriesInUse = PRODUCT_CATEGORIES.filter((c) =>
    (storefronts ?? []).some(({ manufacturer }) =>
      manufacturer.categories.includes(c),
    ),
  );

  function toggleCapability(key: string) {
    setCapabilities((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  return (
    <>
      <SurfaceHeadline
        headline={
          <>
            Connect with{" "}
            <span className="text-numeric">{storefronts?.length ?? "—"}</span> verified
            manufacturers
          </>
        }
        points={[
          `${categoriesInUse.length} categories covered`,
          "Factory-direct pricing",
          "Checked against BRS, KRA and IPRS",
        ]}
      />

      {/* Category row, then capability chips — the reference site's two filter rows. */}
      <div className="border-t border-border">
        <div className="scroll-x flex gap-1 py-2">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
              category === ""
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            All categories
          </button>
          {categoriesInUse.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c === category ? "" : c)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                c === category
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {available.length > 0 ? (
          <div
            role="group"
            aria-label="Filter by factory capability"
            className="scroll-x flex gap-2 border-t border-border py-2.5"
          >
            {available.map((capability) => {
              const on = capabilities.includes(capability.key);
              return (
                <button
                  key={capability.key}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  title={capability.hint}
                  onClick={() => toggleCapability(capability.key)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors",
                    on
                      ? "border-brand bg-brand-soft font-medium text-foreground"
                      : "border-border bg-surface-muted text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {capability.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground text-numeric">{rows.length}</span>{" "}
        {rows.length === 1 ? "supplier" : "suppliers"}
        {capabilities.length > 0 || category ? " match" : ""}
      </p>

      {loading && rows.length === 0 ? (
        <ul className="space-y-4">
          {[0, 1, 2].map((i) => (
            <ManufacturerRowSkeleton key={i} />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Factory className="size-5" />}
          title="No suppliers match those capabilities"
          description="Every filter here is a real credential, so combining several can narrow to nothing."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setCapabilities([]);
                setCategory("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-4">
            {rows.slice(0, 6).map((row) => (
              <ManufacturerRow
                key={row.manufacturer.id}
                manufacturer={row.manufacturer}
                products={row.products}
                productCount={row.productCount}
              />
            ))}
          </ul>
          {rows.length > 6 ? (
            <div className="mt-5 text-center">
              <Button variant="secondary" asChild>
                <Link href="/marketplace/manufacturers">
                  See all {rows.length} suppliers
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

/** Per-region coverage, counted from the listings themselves. */
export function summariseByRegion(
  listings: { product: Product; manufacturer: { id: string } }[],
) {
  const byRegion = new Map<
    Region,
    { listings: number; suppliers: Set<string>; cheapest: number }
  >();
  for (const region of REGIONS) {
    byRegion.set(region, { listings: 0, suppliers: new Set(), cheapest: Infinity });
  }
  for (const { product, manufacturer } of listings) {
    for (const region of product.availableRegions) {
      const entry = byRegion.get(region as Region);
      if (!entry) continue;
      entry.listings += 1;
      entry.suppliers.add(manufacturer.id);
      entry.cheapest = Math.min(entry.cheapest, priceRange(product.priceBands).min);
    }
  }
  return byRegion;
}

export function RegionsSurface() {
  const { data, loading } = useQuery(
    () => marketplaceRepo.search({ sort: "relevance" }),
    [],
  );
  const listings = data?.listings ?? [];
  const byRegion = summariseByRegion(listings);
  const covered = REGIONS.filter((r) => (byRegion.get(r)?.listings ?? 0) > 0).length;

  return (
    <>
      <SurfaceHeadline
        headline={
          <>
            Suppliers delivering across{" "}
            <span className="text-numeric">{loading ? "—" : covered}</span> of{" "}
            {REGIONS.length} regions
          </>
        }
        points={[
          "Coverage counted from real listings",
          "Delivery terms stated per supplier",
          `${COUNTIES.length} counties mapped`,
        ]}
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REGIONS.map((region) => {
          const entry = byRegion.get(region)!;
          const reach = REGION_REACH[region];
          const counties = COUNTIES.filter((c) => c.region === region);
          return (
            <li key={region}>
              <Link
                href={`/marketplace/search?region=${encodeURIComponent(region)}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-brand"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-brand">
                    {region}
                  </h3>
                  <Truck
                    className="size-4 shrink-0 text-subtle-foreground"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {counties.length} counties ·{" "}
                  <span className="text-numeric">
                    <Num value={reach.shops} />
                  </span>{" "}
                  hardware shops
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Listings</dt>
                    <dd className="font-semibold text-foreground text-numeric">
                      {loading ? "—" : <Num value={entry.listings} />}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Suppliers</dt>
                    <dd className="font-semibold text-foreground text-numeric">
                      {loading ? "—" : entry.suppliers.size}
                    </dd>
                  </div>
                </dl>
                {entry.cheapest !== Infinity ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    From{" "}
                    <span className="font-semibold text-foreground">
                      <Currency value={entry.cheapest} />
                    </span>
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Ask AI
// ---------------------------------------------------------------------------

export function AskSurface() {
  const router = useRouter();

  return (
    <>
      <SurfaceHeadline
        headline={
          <>
            <Sparkles
              className="mr-1.5 inline size-5 align-[-3px] text-primary"
              aria-hidden="true"
            />
            Describe the job, not the product code
          </>
        }
        points={[
          "Reads material, quantity, county and urgency",
          "Matches against the real catalogue",
          "Shows you exactly what it understood",
        ]}
      />

      <div className="mx-auto max-w-3xl">
        <p className="text-center text-sm text-muted-foreground">
          Try one of these, or type your own requirement above.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SOURCING_EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/marketplace/ask?q=${encodeURIComponent(example)}`)
                }
                className="group flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-brand"
              >
                <Sparkles
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-sm text-foreground">
                  &ldquo;{example}&rdquo;
                </span>
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg border border-border bg-surface-muted p-5">
          <p className="text-sm font-semibold text-foreground">
            This is a matcher, not a chatbot
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It parses your requirement against the catalogue&apos;s own vocabulary —
            materials, the 47 counties, quantities and urgency — and returns real
            listings. It is deterministic and cannot invent a supplier or a price.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link href="/marketplace/ask">
              <Store aria-hidden="true" />
              Open Ask AI
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
