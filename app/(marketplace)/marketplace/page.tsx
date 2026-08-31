"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  FileText,
  Flame,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { browsingRepo, marketplaceRepo, offerRepo } from "@/lib/data";
import { useMarketplaceCustomer } from "@/components/marketplace/top-bar";
import { membershipMeta } from "@/lib/schemas/membership";
import { useHomeScope } from "@/components/marketplace/home-scope";
import {
  AskSurface,
  ManufacturersSurface,
  RegionsSurface,
  ServicesSurface,
} from "@/components/marketplace/home-surfaces";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import { REGION_REACH } from "@/lib/schemas/campaign";
import { priceRange } from "@/lib/schemas/product";
import { ProductThumb, categoryIcon } from "@/components/shared/product-thumb";
import {
  ProductRail,
  ProductRailSkeleton,
} from "@/components/marketplace/product-rail";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/primitives";
import { cn, spreadBy } from "@/lib/utils";
import { VerifiedBadge, verifiedLevel } from "@/components/shared/verified-mark";

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
    href: "/marketplace/ask",
    icon: Sparkles,
    title: "Ask AI",
    body: "Describe the job in plain words and get the suppliers who can serve it.",
  },
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

function PanelCard({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-brand hover:underline"
        >
          More
        </Link>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ThumbGrid({
  items,
}: {
  items: {
    id: string;
    name: string;
    category: string;
    priceBands: Parameters<typeof priceRange>[0];
  }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((product) => (
        <Link
          key={product.id}
          href={`/marketplace/product/${product.id}`}
          className="group"
        >
          <ProductThumb
            productId={product.id}
            category={product.category}
            className="aspect-square rounded-md border border-border transition-colors group-hover:border-brand"
            iconClassName="size-6"
            sizes="120px"
          />
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            <Currency
              value={priceRange(product.priceBands).min}
              className="font-semibold text-foreground"
            />
          </p>
          {/* Without this the link announces only its price. */}
          <span className="sr-only">{product.name}</span>
        </Link>
      ))}
    </div>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 font-display text-sm font-bold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded-md bg-surface-muted" />
            <div className="mt-1 h-3 w-12 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PromoPanel({
  eyebrow,
  title,
  body,
  cta,
  href,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="on-brand group flex flex-col justify-between overflow-hidden rounded-lg p-5"
    >
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <p className="mt-2 font-display text-lg font-extrabold leading-tight text-white">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
      </div>
      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        {cta}
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default function MarketplaceHomePage() {
  /*
    Which scope tab is selected. The tabs live in the marketplace layout and the
    content lives here, so the choice arrives through context — see
    `components/marketplace/home-scope.tsx` for why it is not in the URL.
  */
  const home = useHomeScope();
  const scope = home?.scope ?? "products";

  const { data: search, loading, error, refetch } = useQuery(
    () => marketplaceRepo.search({ sort: "relevance" }),
    [],
  );
  const { data: storefronts } = useQuery(() => marketplaceRepo.listStorefronts(), []);
  const { data: recent } = useQuery(() => browsingRepo.recent(6), []);

  /*
    §9.2: "See selected public offers and categories."

    Read at the customer's own tier, so a member sees their deals and a visitor
    sees only the public ones. `offerRepo` drops any offer whose category has
    nothing live behind it, so this rail can never advertise an empty shelf.
  */
  const customer = useMarketplaceCustomer();
  const { data: offers } = useQuery(
    () => offerRepo.list(customer?.membership ?? null),
    [customer?.membership ?? ""],
  );

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

  const newest = spreadBy(
    [...listings].sort(
      (a, b) =>
        new Date(b.product.createdAt).getTime() -
        new Date(a.product.createdAt).getTime(),
    ),
    4,
    (l) => l.product.category,
  );

  const mostWanted = spreadBy(listings, 4, (l) => l.product.category);

  /*
    One rail per category that actually has listings, deepest first — a category
    with one product is a thin row and belongs below the ones worth browsing.
    `listings` arrives demand-ranked, so each rail is ordered by demand too
    without a second sort.
  */
  const categoryRails = PRODUCT_CATEGORIES.map((category) => ({
    category,
    items: listings.filter((l) => l.product.category === category),
  }))
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  const panels: React.ReactNode[] = [];

  if (recent && recent.length > 0) {
    panels.push(
      <PanelCard key="history" title="Browsing history" href="/marketplace/search">
        <ThumbGrid items={recent.slice(0, 4)} />
      </PanelCard>,
    );
  }
  if (followUpCategory && followUps.length > 0) {
    panels.push(
      <PanelCard
        key="followup"
        title="Keep looking for"
        subtitle={followUpCategory}
        href={`/marketplace/search?category=${encodeURIComponent(followUpCategory)}`}
      >
        <ThumbGrid items={followUps.slice(0, 4).map((l) => l.product)} />
      </PanelCard>,
    );
  }
  if (newest.length > 0) {
    panels.push(
      <PanelCard key="newest" title="New listings" href="/marketplace/search">
        <ThumbGrid items={newest.map((l) => l.product)} />
      </PanelCard>,
    );
  } else if (loading) {
    panels.push(<PanelSkeleton key="newest-skeleton" title="New listings" />);
  }
  if (mostWanted.length > 0) {
    panels.push(
      <PanelCard
        key="wanted"
        title="Most enquired"
        subtitle="What buyers are pricing this week"
        href="/marketplace/top-ranking"
      >
        <ThumbGrid items={mostWanted.map((l) => l.product)} />
      </PanelCard>,
    );
  } else if (loading) {
    panels.push(<PanelSkeleton key="wanted-skeleton" title="Most enquired" />);
  }
  // Exactly one promo, and only ever as the last slot.
  panels.push(
    <PromoPanel
      key="ranking"
      eyebrow="Top ranking"
      title="What the hardware network is buying right now"
      body="Ranked by real enquiry volume, not paid placement."
      cta="View ranking"
      href="/marketplace/top-ranking"
    />,
  );

  const shown = panels.slice(0, 3);

  return (
    <>
      {/* Welcome bar: name the platform, then the three actions that skip search. */}
      <div className="mx-auto max-w-[112rem] px-4 pt-6 sm:px-6 lg:px-8">
        <QueryError error={error} onRetry={refetch} className="mb-0" />
      </div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[112rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
              Welcome to Buildex Connect
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {facets ? (
                <>
                  <span className="font-medium text-foreground text-numeric">
                    <Num value={facets.total} />
                  </span>{" "}
                  listings from{" "}
                  <span className="font-medium text-foreground text-numeric">
                    <Num value={storefronts?.length ?? 0} />
                  </span>{" "}
                  verified suppliers, delivered across {REGIONS.length} regions
                </>
              ) : (
                "Loading the catalogue…"
              )}
            </p>
          </div>
          <nav aria-label="Quick actions" className="flex flex-wrap items-center">
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              return (
                <React.Fragment key={action.href}>
                  {index > 0 ? (
                    <span aria-hidden="true" className="mx-3 h-5 w-px bg-border" />
                  ) : null}
                  <Link
                    href={action.href}
                    className="group flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-foreground transition-colors hover:text-brand"
                  >
                    <Icon className="size-5 text-brand" aria-hidden="true" />
                    {action.title}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
      {scope === "manufacturers" ? (
        <ManufacturersSurface />
      ) : scope === "regions" ? (
        <RegionsSurface />
      ) : scope === "ask" ? (
        <AskSurface />
      ) : scope === "services" ? (
        <ServicesSurface />
      ) : (
        <>

      {offers && offers.length > 0 ? (
        <section className="mb-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {customer ? "Offers and member deals" : "Offers open to everyone"}
            </h2>
            {!customer ? (
              <Link
                href="/join"
                className="shrink-0 text-sm font-medium text-brand hover:underline"
              >
                More with a membership
              </Link>
            ) : null}
          </div>
          <ul className="scroll-x flex snap-x gap-3 pb-1">
            {offers.slice(0, 6).map(({ offer, listings: count, fromKsh }) => (
              <li key={offer.id} className="w-64 shrink-0 snap-start">
                <Link
                  href={`/marketplace/search?category=${encodeURIComponent(offer.category)}${
                    offer.region ? `&region=${encodeURIComponent(offer.region)}` : ""
                  }`}
                  className="flex h-full flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {offer.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground text-numeric">
                      -{offer.savingPercent}%
                    </span>
                  </span>
                  <span className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {offer.description}
                  </span>
                  <span className="mt-2.5 text-xs text-subtle-foreground">
                    {count} listing{count === 1 ? "" : "s"}
                    {fromKsh !== null ? (
                      <>
                        {" · from "}
                        <Currency value={fromKsh} />
                      </>
                    ) : null}
                  </span>
                  {offer.minimumTier ? (
                    <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
                      {membershipMeta(offer.minimumTier).name}
                    </span>
                  ) : (
                    <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                      Open to all
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-subtle-foreground">
            Savings are indicative. Actual pricing depends on the supplier agreement
            behind each listing.
          </p>
        </section>
      ) : null}

      <section className="grid items-stretch gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="flex max-h-[26rem] flex-col rounded-lg border border-border bg-surface">
          <p className="shrink-0 border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Categories for you
          </p>
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {PRODUCT_CATEGORIES.map((category) => {
              const Icon = categoryIcon(category);
              const count = categoryCounts.get(category);
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
                    {count === undefined ? (
                      <span
                        aria-hidden="true"
                        className="h-3 w-4 shrink-0 animate-pulse rounded bg-surface-muted"
                      />
                    ) : (
                      <span className="shrink-0 text-xs text-subtle-foreground text-numeric">
                        {count}
                      </span>
                    )}
                    <ChevronRight
                      className="size-3.5 shrink-0 text-subtle-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/*
          The reference site runs browsing history, follow-up recommendations
          and a promo across one row beside the category rail. Ours builds the
          row from whatever is actually available — history first when there is
          any, then evergreen panels — and always fills three slots, so a
          first-time visitor never sees a two-thirds-empty row.
        */}
        {/*
          Column count follows the number of panels, so a short row never leaves
          dead columns on the right.
        */}
        <div
          className={cn(
            "grid min-w-0 gap-4",
            shown.length === 1 && "grid-cols-1",
            shown.length === 2 && "sm:grid-cols-2",
            shown.length >= 3 && "sm:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {shown}
        </div>
      </section>

      <div className="mt-8 space-y-6">
          {/*
            Grouped into per-category rails rather than one continuous grid. A
            single grid of every listing makes a buyer scan forty unrelated
            products to find the two they care about; a rail per category turns
            the page into a set of answerable questions, and each one scrolls
            sideways so a deep category costs no more vertical space than a
            shallow one.
          */}
          <section id="listings" className="space-y-6">
            {loading && listings.length === 0 ? (
              <>
                <ProductRailSkeleton title="Most in demand" />
                <ProductRailSkeleton title="Cement & Concrete" />
                <ProductRailSkeleton title="Steel & Reinforcement" />
              </>
            ) : (
              <>
                {/*
                  Demand first: it is the one ranking the platform can defend,
                  and it cuts across every category.
                */}
                <ProductRail
                  title="Most in demand"
                  subtitle="Ranked by real enquiry volume, not paid placement"
                  icon={Flame}
                  href="/marketplace/top-ranking"
                  linkLabel="See ranking"
                  listings={listings.slice(0, 12)}
                  priority
                />

                {categoryRails.map(({ category, items }) => (
                  <ProductRail
                    key={category}
                    title={category}
                    subtitle={`${items.length} listing${items.length === 1 ? "" : "s"}`}
                    icon={categoryIcon(category)}
                    href={`/marketplace/search?category=${encodeURIComponent(category)}`}
                    listings={items}
                  />
                ))}
              </>
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
                const count = categoryCounts.get(category);
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
                        {count === undefined
                          ? "\u00a0"
                          : `${count} ${count === 1 ? "listing" : "listings"}`}
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
                    {verifiedLevel(manufacturer.status) ? (
                      <VerifiedBadge
                        level={verifiedLevel(manufacturer.status)!}
                        size="md"
                        className="text-[13px]"
                      />
                    ) : (
                      <StatusPill tone="warning">Verification in progress</StatusPill>
                    )}
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
        </>
      )}
      </div>
    </>
  );
}
