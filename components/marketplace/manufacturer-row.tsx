"use client";

import * as React from "react";
import Link from "next/link";
import { Factory, MapPin, MessageSquare, Store } from "lucide-react";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { capabilitiesOf, supplierCredentials } from "@/lib/rules/suppliers";
import { priceRange, type Product } from "@/lib/schemas/product";
import type { Manufacturer } from "@/lib/schemas/manufacturer";
import { cn } from "@/lib/utils";
import { hasChosenMainProducts, mainProducts } from "@/lib/rules/catalogue";
import { VerifiedMark, verifiedLevel } from "@/components/shared/verified-mark";

/*
  One supplier, as the Manufacturers surface lists them.

  The reference marketplace's factory list puts credentials down the left and a
  strip of that supplier's actual products down the right, each product carrying
  its price and minimum order. That is the right shape: a buyer shopping by
  supplier is deciding between companies, and the only honest evidence of what a
  company makes is what it has listed.

  Shared by the home page's Manufacturers tab and the full directory so the two
  can never drift — the same reason `publicListings()` is the only place
  visibility is decided.

  What is deliberately absent: star ratings. The platform has no reviews, and a
  fabricated 4.8/5 would undermine every real number beside it.
*/

export function ManufacturerRow({
  manufacturer,
  products,
  productCount,
  className,
}: {
  manufacturer: Manufacturer;
  products: Product[];
  productCount: number;
  className?: string;
}) {
  const level = verifiedLevel(manufacturer.status);
  const credentials = supplierCredentials(manufacturer, products);
  const capabilities = capabilitiesOf(manufacturer, products);
  const cheapest = products.length
    ? Math.min(...products.map((p) => priceRange(p.priceBands).min))
    : null;
  /*
    One per category before repeating any. A supplier's strip is meant to show
    the breadth of what they make; four listings from the same category show
    four near-identical photos and say nothing a buyer can use.
  */
  /*
    The supplier's own four, where they have chosen them, with the automatic
    spread filling any slots they have left empty. See `lib/rules/catalogue.ts`.
  */
  const strip = mainProducts(products);
  const supplierChose = hasChosenMainProducts(products);

  return (
    <li
      className={cn(
        "rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand sm:p-5",
        className,
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_auto]">
        {/* Who they are, and what they can be held to. */}
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Factory className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Link
                href={`/marketplace/manufacturer/${manufacturer.id}`}
                className="flex items-center gap-1.5 font-semibold text-foreground hover:text-brand hover:underline"
              >
                <span className="truncate">{manufacturer.tradingName}</span>
                {level ? (
                  <VerifiedMark level={level} subject="supplier" />
                ) : null}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden="true" />
                  {manufacturer.county}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-numeric">{credentials.yearsLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{credentials.capacityLabel}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivers to {credentials.regionsLabel} ·{" "}
                <span className="text-numeric">
                  <Num value={credentials.ordersFulfilled} />
                </span>{" "}
                orders fulfilled
              </p>
            </div>
          </div>

          {capabilities.length > 0 ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Factory capabilities
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {capabilities.slice(0, 4).map((capability) => (
                  <li
                    key={capability.key}
                    className="flex gap-1.5 text-xs text-muted-foreground"
                  >
                    <span aria-hidden="true">·</span>
                    {capability.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* What they actually make. */}
        <div className="min-w-0">
          {/*
            Whose selection this is, said plainly. "Main products" is the
            supplier's own claim about what they are known for; where they have
            not chosen, this is our spread across their range and should not
            borrow their voice.
          */}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {supplierChose ? "Main products" : "From their range"}
          </p>
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing published yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {strip.map((product) => {
                const range = priceRange(product.priceBands);
                return (
                  <li key={product.id} className="min-w-0">
                    <Link
                      href={`/marketplace/product/${product.id}`}
                      className="group block min-w-0"
                    >
                      <ProductThumb
                        productId={product.id}
                        category={product.category}
                        className="aspect-square rounded-md border border-border transition-colors group-hover:border-brand"
                        iconClassName="size-5"
                        sizes="150px"
                      />
                      <p className="mt-1.5 truncate text-xs font-semibold text-price text-numeric">
                        <Currency value={range.min} />
                        {range.max !== range.min ? (
                          <>
                            <span aria-hidden="true">–</span>
                            <Currency value={range.max} hideSymbol />
                          </>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Min. order: <Num value={product.moq} /> {product.unit}
                        {product.moq === 1 ? "" : "s"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground group-hover:text-foreground">
                        {product.name}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Act. */}
        <div className="flex flex-row items-center gap-2 xl:w-40 xl:flex-col xl:items-stretch xl:justify-center">
          <div className="min-w-0 flex-1 xl:mb-1 xl:flex-none xl:text-center">
            <p className="text-[11px] text-muted-foreground">Listings from</p>
            <p className="font-display text-lg font-bold text-price">
              {cheapest !== null ? <Currency value={cheapest} /> : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground text-numeric">
              <Num value={productCount} /> products
            </p>
          </div>
          <Button size="sm" className="shrink-0 xl:w-full" asChild>
            <Link href={`/marketplace/manufacturer/${manufacturer.id}`}>
              <Store aria-hidden="true" />
              Visit store
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="shrink-0 xl:w-full" asChild>
            <Link href="/marketplace/rfq">
              <MessageSquare aria-hidden="true" />
              Contact
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

export function ManufacturerRowSkeleton() {
  return (
    <li className="rounded-lg border border-border bg-surface p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_auto]">
        <div className="flex gap-3">
          <Skeleton className="size-11 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
        <Skeleton className="h-20 xl:w-40" />
      </div>
    </li>
  );
}
