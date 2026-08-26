"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Package, Store, Truck } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { COUNTIES, REGIONS, type Region } from "@/lib/schemas/common";
import { REGION_REACH } from "@/lib/schemas/campaign";
import { Currency, Num } from "@/components/shared/format";
import { Card, CardBody, Skeleton } from "@/components/ui/primitives";
import { priceRange } from "@/lib/schemas/product";

/*
  Delivery regions.

  Whether a supplier delivers where you build is the first filter in wholesale
  construction supply — before price, before brand. This page makes that the
  entry point: pick a region and see who serves it, how deep their range is and
  what it starts at.
*/

export default function RegionsPage() {
  const { data, loading } = useQuery(() => marketplaceRepo.search({ sort: "relevance" }), []);
  const listings = data?.listings ?? [];

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
          <li className="text-foreground">Delivery regions</li>
        </ol>
      </nav>

      <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
        <Truck className="size-5 text-brand" aria-hidden="true" />
        Delivery regions
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Whether a supplier delivers where you build decides everything else. Start with the
        region, then compare on price.
      </p>

      {loading && listings.length === 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    <h2 className="font-display text-base font-bold text-foreground group-hover:text-brand">
                      {region}
                    </h2>
                    <ArrowRight
                      className="size-4 shrink-0 text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {counties.map((c) => c.name).join(", ")}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Package className="size-3.5" aria-hidden="true" />
                        Listings delivered
                      </dt>
                      <dd className="font-semibold text-foreground text-numeric">
                        <Num value={entry.listings} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Store className="size-3.5" aria-hidden="true" />
                        Suppliers
                      </dt>
                      <dd className="font-semibold text-foreground text-numeric">
                        <Num value={entry.suppliers.size} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        Hardware shops
                      </dt>
                      <dd className="font-semibold text-foreground text-numeric">
                        <Num value={reach.shops} />
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {entry.cheapest === Infinity ? (
                      "No listings delivered here yet"
                    ) : (
                      <>
                        Listings from{" "}
                        <Currency
                          value={entry.cheapest}
                          className="font-semibold text-foreground"
                        />
                      </>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="mt-8">
        <CardBody>
          <p className="text-sm text-muted-foreground">
            Hardware-shop counts per region are indicative figures pending the approved
            commercial model. Listing and supplier counts are live from the marketplace.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
