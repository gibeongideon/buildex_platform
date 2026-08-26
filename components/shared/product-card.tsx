"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Currency } from "./format";
import { ProductThumb } from "./product-thumb";
import { StatusPill } from "@/components/ui/primitives";
import { formatLeadTime, priceRange, type Product } from "@/lib/schemas/product";
import type { Manufacturer } from "@/lib/schemas/manufacturer";

/*
  The marketplace product card.

  Wholesale buyers scan for four things before they open anything: what it is,
  who makes it, the entry price at their order size, and how fast it ships. The
  card shows exactly those, in that order, and nothing else — a denser card
  scans worse, not better.

  Two links, deliberately: the card body goes to the product, and the supplier
  line goes to that manufacturer's own storefront. That is the whole two-tier
  navigation in one component.
*/

export function ProductCard({
  product,
  manufacturer,
  hideSupplier = false,
  className,
}: {
  product: Product;
  manufacturer: Manufacturer;
  /** Set on a manufacturer's own storefront, where the supplier line repeats. */
  hideSupplier?: boolean;
  className?: string;
}) {
  const range = priceRange(product.priceBands);
  const verified = manufacturer.status === "approved";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong",
        className,
      )}
    >
      <Link
        href={`/marketplace/product/${product.id}`}
        className="focus-visible:outline-none"
      >
        <ProductThumb
          productId={product.id}
          category={product.category}
          className="h-36 border-b border-border"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {product.category}
        </p>

        <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
          {/* Stretched link: the whole card is the hit area, but the supplier
              line below sits above it so it stays separately clickable. */}
          <Link
            href={`/marketplace/product/${product.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>

        {hideSupplier ? null : (
        <div className="relative z-10 mt-1.5">
          <Link
            href={`/marketplace/manufacturer/${manufacturer.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand hover:underline"
          >
            <Store className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{manufacturer.tradingName}</span>
            {verified ? (
              <BadgeCheck
                className="size-3.5 shrink-0 text-success"
                aria-label="Verified manufacturer"
              />
            ) : null}
          </Link>
        </div>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2 border-t border-border pt-3">
            <div>
              <p className="text-[11px] text-muted-foreground">from</p>
              <p className="flex items-baseline gap-1">
                <Currency
                  value={range.min}
                  className="text-base font-semibold text-foreground"
                />
                <span className="text-xs text-muted-foreground">/{product.unit}</span>
              </p>
            </div>
            {product.status === "out_of_stock" ? (
              <StatusPill tone="warning">Out of stock</StatusPill>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="text-numeric">
              MOQ {product.moq} {product.unit}
              {product.moq === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="size-3.5" aria-hidden="true" />
              {formatLeadTime(product.leadTimeDays)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Matches the card's footprint so the grid doesn't jump while loading. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="h-36 animate-pulse border-b border-border bg-surface-muted" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
        <div className="h-6 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
