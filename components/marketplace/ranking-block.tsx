"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Currency, Num } from "@/components/shared/format";
import { priceRange, type Product } from "@/lib/schemas/product";
import type { MarketplaceListing } from "@/lib/data";
import { cn } from "@/lib/utils";

/*
  One ranking block: a heading and its top three.

  The reference marketplace's ranking page is built from many small leaderboards
  rather than one long list, and that is the better shape — "the top three
  roofing sheets" is a question a buyer can act on, where "the 400th ranked
  product overall" is not.

  What a block ranks is stated on the card, because a rank with no stated basis
  is just an assertion. Here it is always a number the platform actually holds:
  enquiries received, entry price, or quoted lead time.
*/

/** Podium colouring: gold for first, brand blue behind it. */
function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "absolute left-0 top-0 z-10 rounded-br-lg rounded-tl-lg px-1.5 py-0.5 font-display text-xs font-bold",
        rank === 1
          ? "bg-primary text-primary-foreground"
          : "bg-brand text-brand-foreground",
      )}
    >
      #{rank}
    </span>
  );
}

export type RankingMetric = {
  key: string;
  label: string;
  /** What the number under each tile means. */
  caption: (listing: MarketplaceListing) => React.ReactNode;
  compare: (a: MarketplaceListing, b: MarketplaceListing) => number;
};

export function RankingBlock({
  title,
  subtitle,
  href,
  listings,
  metric,
  priority = false,
}: {
  title: string;
  subtitle?: string;
  href: string;
  listings: MarketplaceListing[];
  metric: RankingMetric;
  priority?: boolean;
}) {
  const top = [...listings].sort(metric.compare).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section
      aria-label={title}
      className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-md p-1 text-subtle-foreground transition-colors hover:text-brand"
          aria-label={`See all ${title}`}
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-3">
        {top.map((listing, index) => (
          <li key={listing.product.id} className="min-w-0">
            <Link href={`/marketplace/product/${listing.product.id}`} className="group block">
              <div className="relative">
                <RankBadge rank={index + 1} />
                <ProductThumb
                  productId={listing.product.id}
                  category={listing.product.category}
                  className="aspect-square rounded-lg border border-border transition-colors group-hover:border-brand"
                  iconClassName="size-5"
                  sizes="140px"
                  priority={priority && index === 0}
                />
              </div>
              <p className="mt-1.5 truncate font-semibold text-foreground text-numeric">
                <Currency value={priceRange(listing.product.priceBands).min} />
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {metric.caption(listing)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground group-hover:text-foreground">
                {listing.product.name}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RankingBlockSkeleton() {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded-lg bg-surface-muted" />
            <div className="mt-1.5 h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** MOQ line, shown under every tile the way the reference does. */
export function moqCaption(product: Product) {
  return (
    <>
      MOQ: <Num value={product.moq} /> {product.unit}
      {product.moq === 1 ? "" : "s"}
    </>
  );
}
