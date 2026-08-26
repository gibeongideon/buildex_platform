"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Currency } from "./format";
import { ProductThumb } from "./product-thumb";
import { formatLeadTime, priceRange, type Product } from "@/lib/schemas/product";
import type { Manufacturer } from "@/lib/schemas/manufacturer";

/*
  The marketplace product card.

  Type scale and weights follow the reference card closely, because the hierarchy
  is doing real work in a six-across grid: the buyer is comparing, not reading.

      photo
      title        14px / 400  · two lines, so long names do not shout
      PRICE RANGE  20px / 700  · the loudest thing on the card
      MOQ line     13px        · value in foreground, traction muted beside it
      trust line   12px        · "Verified · 17 yrs · Machakos"

  Deliberately: the title is *regular* weight, not medium. Bolding both the name
  and the price gives the eye nowhere to land, and price is what a buyer scans a
  wholesale grid for. The range matters more than a single figure — wholesale
  listings are banded, so "KSh 712-745" shows the spread between the buyer's
  order size and the best one.
*/

export function ProductCard({
  product,
  manufacturer,
  enquiryCount = 0,
  hideSupplier = false,
  priority = false,
  className,
}: {
  product: Product;
  manufacturer: Manufacturer;
  /** Real enquiry volume — the marketplace's traction signal. */
  enquiryCount?: number;
  /** Set on a manufacturer's own storefront, where the supplier line repeats. */
  hideSupplier?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const range = priceRange(product.priceBands);
  const verified = manufacturer.status === "approved";
  const years = new Date().getFullYear() - manufacturer.yearEstablished;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-brand hover:shadow-overlay",
        className,
      )}
    >
      <Link
        href={`/marketplace/product/${product.id}`}
        className="block focus-visible:outline-none"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductThumb
          productId={product.id}
          category={product.category}
          priority={priority}
          className="aspect-square border-b border-border"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-normal leading-[1.4] text-foreground">
          {/* Stretched link: the whole card is the hit area, but the supplier
              line below sits above it so it stays separately clickable. */}
          <Link
            href={`/marketplace/product/${product.id}`}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {product.name}
          </Link>
        </h3>

        {/* The price owns the card. A tight hyphen, not a spaced dash — the two
            figures read as one range rather than two numbers. */}
        <p className="mt-2 font-display text-lg font-bold leading-none text-foreground">
          <Currency value={range.min} />
          {range.max !== range.min ? (
            <>
              <span aria-hidden="true">-</span>
              <Currency value={range.max} hideSymbol />
            </>
          ) : null}
        </p>

        <p className="mt-1.5 text-[13px] leading-snug">
          <span className="text-foreground text-numeric">
            MOQ {product.moq} {product.unit}
            {product.moq === 1 ? "" : "s"}
          </span>
          {enquiryCount > 0 ? (
            <span className="ml-1.5 text-muted-foreground text-numeric">
              {enquiryCount} {enquiryCount === 1 ? "enquiry" : "enquiries"}
            </span>
          ) : null}
        </p>

        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {formatLeadTime(product.leadTimeDays)} · per {product.unit}
        </p>

        {hideSupplier ? null : (
          <div className="relative z-10 mt-auto pt-2">
            <Link
              href={`/marketplace/manufacturer/${manufacturer.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand"
            >
              {verified ? (
                <>
                  <BadgeCheck
                    className="size-4 shrink-0 text-success"
                    aria-label="Verified manufacturer"
                  />
                  <span className="font-bold text-success">Verified</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : (
                <Store className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="text-numeric">{years} yrs</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{manufacturer.county}</span>
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

/** Matches the card's footprint so the grid doesn't jump while loading. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-square animate-pulse border-b border-border bg-surface-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
