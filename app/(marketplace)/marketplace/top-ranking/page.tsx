"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, MessageSquare, Store, Trophy } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES } from "@/lib/schemas/common";
import { formatLeadTime, priceRange } from "@/lib/schemas/product";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Currency } from "@/components/shared/format";
import { Select } from "@/components/ui/field";
import { Card, CardBody, EmptyState, Skeleton, StatusPill } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/*
  Top ranking.

  Ordered by the marketplace's real demand signal — how many enquiries each
  listing has drawn — which is exactly what the default marketplace sort uses.
  Presented as a numbered leaderboard rather than a card grid, because rank is
  the whole point of the page.
*/

export default function TopRankingPage() {
  const [category, setCategory] = React.useState("");

  const { data, loading } = useQuery(
    () =>
      marketplaceRepo.search({
        categories: category ? [category] : undefined,
        sort: "relevance",
      }),
    [category],
  );

  const listings = data?.listings ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/marketplace" className="hover:text-foreground hover:underline">
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Top ranking</li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
            <Trophy className="size-5 text-primary" aria-hidden="true" />
            Top ranking
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ranked by enquiries from the hardware network — what buyers are actually
            asking suppliers to price, not what suppliers are promoting.
          </p>
        </div>
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
      </div>

      <Card className="mt-5">
        <CardBody className="p-0">
          {loading && listings.length === 0 ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState
              icon={<Flame className="size-5" />}
              title="Nothing ranked in this category yet"
              description="Rankings appear once buyers start enquiring about listings here."
            />
          ) : (
            <ol className="divide-y divide-border">
              {listings.slice(0, 20).map(({ product, manufacturer }, index) => (
                <li key={product.id} className="flex items-center gap-4 p-4">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-numeric",
                      index === 0 && "bg-primary text-primary-foreground",
                      index === 1 && "bg-brand text-brand-foreground",
                      index === 2 && "bg-brand-soft text-brand",
                      index > 2 && "border border-border text-muted-foreground",
                    )}
                    aria-label={`Rank ${index + 1}`}
                  >
                    {index + 1}
                  </span>

                  <Link href={`/marketplace/product/${product.id}`} className="shrink-0">
                    <ProductThumb
                      productId={product.id}
                      category={product.category}
                      className="size-14 rounded-md border border-border"
                      iconClassName="size-5"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/marketplace/product/${product.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-brand hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {product.category} · {formatLeadTime(product.leadTimeDays)} lead time
                    </p>
                    <Link
                      href={`/marketplace/manufacturer/${manufacturer.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand hover:underline"
                    >
                      <Store className="size-3" aria-hidden="true" />
                      {manufacturer.tradingName}
                    </Link>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[11px] uppercase tracking-wider text-subtle-foreground">
                      from
                    </p>
                    <Currency
                      value={priceRange(product.priceBands).min}
                      className="text-sm font-semibold text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">/{product.unit}</p>
                  </div>

                  {index < 3 ? (
                    <StatusPill tone="warning" className="hidden shrink-0 md:inline-flex">
                      <Flame className="size-3" aria-hidden="true" />
                      High demand
                    </StatusPill>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Ranking uses enquiry volume across the whole marketplace. It is not paid
        placement — regional campaigns affect visibility in search, never this list.
      </p>
    </div>
  );
}
