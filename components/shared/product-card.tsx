"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, MessageSquare, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Currency } from "./format";
import { ProductThumb } from "./product-thumb";
import { formatLeadTime, priceRange, type Product } from "@/lib/schemas/product";
import type { Manufacturer } from "@/lib/schemas/manufacturer";

/*
  The marketplace product card.

  Modelled on the dense card the large B2B marketplaces use, because in a
  six-across grid the buyer is comparing, not reading. The stack is:

      photo → title (2 lines) → price RANGE → MOQ + traction → trust line

  The price range matters more than a single figure: wholesale listings are
  banded, so "KSh 712–745" tells a buyer what the spread is between their order
  size and the best one. The trust line mirrors the reference site's
  "Verified · 6 yrs · CN" — here it is verification, years trading and county.
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
        <h3 className="text-[13px] font-medium leading-snug text-foreground">
          {/* Stretched link: the whole card is the hit area, but the supplier
              line below sits above it so it stays separately clickable. */}
          <Link
            href={`/marketplace/product/${product.id}`}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-2">
          <p className="flex flex-wrap items-baseline gap-x-1">
            <Currency
              value={range.min}
              className="text-base font-bold text-foreground"
            />
            {range.max !== range.min ? (
              <>
                <span className="text-sm text-muted-foreground">–</span>
                <Currency
                  value={range.max}
                  className="text-base font-bold text-foreground"
                />
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            per {product.unit} · {formatLeadTime(product.leadTimeDays)}
          </p>
        </div>

        <p className="mt-1.5 text-[11px] text-muted-foreground text-numeric">
          MOQ {product.moq} {product.unit}
          {product.moq === 1 ? "" : "s"}
          {enquiryCount > 0 ? (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-subtle-foreground">
              <MessageSquare className="size-3" aria-hidden="true" />
              {enquiryCount}
            </span>
          ) : null}
        </p>

        {hideSupplier ? null : (
          <div className="relative z-10 mt-auto pt-2.5">
            <Link
              href={`/marketplace/manufacturer/${manufacturer.id}`}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-brand"
            >
              {verified ? (
                <>
                  <BadgeCheck
                    className="size-3.5 shrink-0 text-success"
                    aria-label="Verified manufacturer"
                  />
                  <span className="font-semibold text-success">Verified</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : (
                <>
                  <Store className="size-3 shrink-0" aria-hidden="true" />
                </>
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
