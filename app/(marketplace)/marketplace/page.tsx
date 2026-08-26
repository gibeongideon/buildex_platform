"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  History,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { browsingRepo, marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import { REGION_REACH } from "@/lib/schemas/campaign";
import { priceRange } from "@/lib/schemas/product";
import { ProductThumb, categoryIcon } from "@/components/shared/product-thumb";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/*
  The marketplace home.

  Laid out the way large B2B marketplaces lay out theirs, because the shape is
  well-tested for the job: quick-action strip, a category rail beside a
  personalised panel, then recommendation rails that get more specific as they
  go down the page.

  Every rail here is backed by real data. "Browsing history" reads what this
  browser actually opened; "Keep looking for" derives its category from that
  history; "Top ranked" is ordered by real enquiry counts. A rail with nothing
  behind it is simply not rendered, rather than padded out.
*/

const QUICK_ACTIONS = [
  {
    href: "/marketplace/rfq",
    icon: FileText,
    title: "Request for Quotation",
    body: "Describe what you need once. We match it to suppliers who can deliver.",
  },
  {
    href: "/marketplace/top-ranking",
    icon: Flame,
    title: "Top ranking",
    body: "The listings the hardware network is actually enquiring about.",
  },
  {
    href: "/marketplace/regions",
    icon: Truck,
    title: "Delivery by region",
    body: "Filter to suppliers who already deliver where you build.",
  },
];

function SectionHeading({
  title,
  href,
  linkLabel = "View all",
  icon: Icon,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground">
        {Icon ? <Icon className="size-5 text-brand" aria-hidden="true" /> : null}
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          {linkLabel}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default function MarketplaceHomePage() {
  const { data: search, loading } = useQuery(
    () => marketplaceRepo.search({ sort: "relevance" }),
    [],
  );
  const { data: storefronts } = useQuery(() => marketplaceRepo.listStorefronts(), []);
  const { data: recent } = useQuery(() => browsingRepo.recent(6), []);

  const listings = search?.listings ?? [];
  const facets = search?.facets;

  // "Keep looking for" follows the category of the last thing opened, which is
  // the only signal a marketplace has before an account exists.
  const followUpCategory = recent?.[0]?.category ?? null;
  const followUps = followUpCategory
    ? listings
        .filter(
          (l) =>
            l.product.category === followUpCategory &&
            !recent?.some((r) => r.id === l.product.id),
        )
        .slice(0, 6)
    : [];

  const categoryCounts = new Map(
    (facets?.categories ?? []).map((c) => [c.value, c.count]),
  );

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {action.title}
                  <ArrowRight
                    className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {action.body}
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border border-border bg-surface">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
              Categories
            </p>
            <ul className="max-h-[32rem] overflow-y-auto py-1">
              {PRODUCT_CATEGORIES.map((category) => {
                const Icon = categoryIcon(category);
                const count = categoryCounts.get(category) ?? 0;
                return (
                  <li key={category}>
                    <Link
                      href={`/marketplace/search?category=${encodeURIComponent(category)}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <Icon
                        className="size-4 shrink-0 text-subtle-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{category}</span>
                      <span className="shrink-0 text-xs text-subtle-foreground text-numeric">
                        {count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <section className="overflow-hidden rounded-lg border border-border">
            <div className="on-brand grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Buildex Connect
                </p>
                <h1 className="mt-2 max-w-xl font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Source building materials directly from verified manufacturers.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
                  Wholesale price bands, minimum order quantities and lead times published
                  up front. Compare on the quantity you actually buy, then enquire
                  directly with the plant.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button size="lg" asChild>
                    <Link href="/marketplace/search">
                      Browse all listings
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="border-white/25 bg-white/10 text-white hover:bg-white/20"
                    asChild
                  >
                    <Link href="/marketplace/rfq">Request a quote</Link>
                  </Button>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-5 lg:shrink-0">
                {[
                  { label: "Listings", value: facets?.total ?? 0 },
                  { label: "Suppliers", value: storefronts?.length ?? 0 },
                  { label: "Regions", value: REGIONS.length },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[11px] uppercase tracking-wider text-white/50">
                      {stat.label}
                    </dt>
                    <dd className="mt-0.5 font-display text-xl font-bold text-white text-numeric">
                      <Num value={stat.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {recent && recent.length > 0 ? (
            <section>
              <SectionHeading
                title="Browsing history"
                icon={History}
                href="/marketplace/search"
                linkLabel="Browse more"
              />
              <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {recent.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/marketplace/product/${product.id}`}
                      className="group block"
                    >
                      <ProductThumb
                        productId={product.id}
                        category={product.category}
                        className="aspect-square rounded-lg border border-border transition-colors group-hover:border-brand"
                        iconClassName="size-8"
                      />
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-brand">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <Currency
                          value={priceRange(product.priceBands).min}
                          className="font-semibold text-foreground"
                        />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {followUps.length > 0 && followUpCategory ? (
            <section>
              <SectionHeading
                title={`Keep looking for ${followUpCategory}`}
                icon={Zap}
                href={`/marketplace/search?category=${encodeURIComponent(followUpCategory)}`}
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {followUps.slice(0, 3).map(({ product, manufacturer }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    manufacturer={manufacturer}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionHeading
              title="Most in demand"
              icon={Flame}
              href="/marketplace/top-ranking"
              linkLabel="Top ranking"
            />
            {loading && listings.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {listings.slice(0, 6).map(({ product, manufacturer }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    manufacturer={manufacturer}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Shop by category"
              href="/marketplace/search"
              linkLabel="All listings"
            />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {PRODUCT_CATEGORIES.map((category) => {
                const Icon = categoryIcon(category);
                const count = categoryCounts.get(category) ?? 0;
                return (
                  <li key={category}>
                    <Link
                      href={`/marketplace/search?category=${encodeURIComponent(category)}`}
                      className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3 text-center transition-colors hover:border-brand"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="text-xs font-medium leading-snug text-foreground">
                        {category}
                      </span>
                      <span className="text-[11px] text-subtle-foreground text-numeric">
                        {count} {count === 1 ? "listing" : "listings"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <SectionHeading
              title="Verified manufacturers"
              icon={BadgeCheck}
              href="/marketplace/manufacturers"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(storefronts ?? []).slice(0, 8).map(({ manufacturer, productCount }) => (
                <Link
                  key={manufacturer.id}
                  href={`/marketplace/manufacturer/${manufacturer.id}`}
                  className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand">
                        {manufacturer.tradingName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {manufacturer.county}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-subtle-foreground">Listings</dt>
                      <dd className="font-semibold text-foreground text-numeric">
                        {productCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">Replies in</dt>
                      <dd className="font-semibold text-foreground">
                        {manufacturer.storefront.avgResponseHours}h
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3">
                    <StatusPill
                      tone={manufacturer.status === "approved" ? "success" : "warning"}
                    >
                      {manufacturer.status === "approved"
                        ? "Verified supplier"
                        : "Verification in progress"}
                    </StatusPill>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Delivering across Kenya" icon={Truck} href="/marketplace/regions" />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {REGIONS.map((region) => {
                const reach = REGION_REACH[region];
                return (
                  <li key={region}>
                    <Link
                      href={`/marketplace/search?region=${encodeURIComponent(region)}`}
                      className="block rounded-lg border border-border bg-surface p-3 transition-colors hover:border-brand"
                    >
                      <p className="text-sm font-semibold text-foreground">{region}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground text-numeric">
                        <Num value={reach.shops} /> hardware shops
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-surface-muted p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-6 shrink-0 text-success"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Every supplier is checked before they can list
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Company registration against BRS, tax PIN against KRA, and every
                    director against IPRS. Newer manufacturers also get a plant visit
                    before orders are enabled.
                  </p>
                </div>
              </div>
              <Button variant="secondary" asChild>
                <Link href="/marketplace/manufacturers">
                  <BadgeCheck aria-hidden="true" />
                  See verified suppliers
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
