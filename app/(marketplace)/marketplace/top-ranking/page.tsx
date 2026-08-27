"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import type { MarketplaceListing } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  PRODUCT_CATEGORIES,
  REGIONS,
  type ProductCategory,
  type Region,
} from "@/lib/schemas/common";
import { formatLeadTime, priceRange } from "@/lib/schemas/product";
import { Select } from "@/components/ui/field";
import { QueryError } from "@/components/ui/query-state";
import { EmptyState } from "@/components/ui/primitives";
import {
  RankingBlock,
  RankingBlockSkeleton,
  moqCaption,
  type RankingMetric,
} from "@/components/marketplace/ranking-block";
import { asOption, cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

/*
  Top ranking.

  Built as many small leaderboards rather than one long list, the way the large
  B2B marketplaces build theirs: "the top three roofing sheets delivered to
  Nyanza" is a question a buyer can act on, where "the 400th ranked product
  overall" is not.

  Two levels, mirroring that shape. With no category selected each block is a
  category; select one and the blocks become the regions that category is
  actually delivered to — which is the Kenyan version of the reference site's
  global/region switch, and the question a hardware shop actually has.

  Every ranking is a number the platform already holds. There is deliberately no
  "best reviewed": the marketplace has no reviews, and a star rating invented to
  fill a tab would undermine the enquiry counts next to it.
*/

const METRICS: RankingMetric[] = [
  {
    key: "enquired",
    label: "Most enquired",
    caption: (l) =>
      `${l.enquiryCount} ${l.enquiryCount === 1 ? "enquiry" : "enquiries"}`,
    compare: (a, b) => b.enquiryCount - a.enquiryCount,
  },
  {
    key: "value",
    label: "Best value",
    caption: (l) => moqCaption(l.product),
    compare: (a, b) =>
      priceRange(a.product.priceBands).min - priceRange(b.product.priceBands).min,
  },
  {
    key: "lead",
    label: "Fastest delivery",
    caption: (l) => formatLeadTime(l.product.leadTimeDays),
    compare: (a, b) => a.product.leadTimeDays - b.product.leadTimeDays,
  },
];

/** How many blocks arrive at a time as the page is scrolled. */
const PAGE = 6;

/*
  Annotated rather than inferred: without the type, the "All" entry widens
  `value` to `string` and the tab can no longer set the category state.
*/
const CATEGORY_TABS: { value: ProductCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function TopRankingPage() {
  const [category, setCategory] = React.useState<ProductCategory | "">("");
  const [region, setRegion] = React.useState<Region | "">("");
  const [metricKey, setMetricKey] = React.useState(METRICS[0].key);
  const [shown, setShown] = React.useState(PAGE);

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const { data, loading, error, refetch } = useQuery(
    () => marketplaceRepo.search({ sort: "relevance" }),
    [],
  );

  const all = React.useMemo(() => data?.listings ?? [], [data]);

  const scoped = React.useMemo(
    () =>
      all.filter(
        (l) =>
          (!region || l.product.availableRegions.includes(region)) &&
          (!category || l.product.category === category),
      ),
    [all, region, category],
  );

  /*
    The blocks themselves. Without a category the page ranks each category
    against itself; with one, it ranks that category region by region — the same
    two-level shape as the reference, on the axis that matters here.
  */
  const blocks = React.useMemo(() => {
    const build = <K extends string>(
      keys: readonly K[],
      pick: (listing: MarketplaceListing, key: K) => boolean,
      href: (key: K) => string,
      subtitle: (n: number) => string,
    ) =>
      keys
        .map((key) => {
          const items = scoped.filter((l) => pick(l, key));
          return { key, title: key, items, href: href(key), subtitle: subtitle(items.length) };
        })
        .filter((b) => b.items.length > 0)
        // Deepest first: a leaderboard of one is not a leaderboard.
        .sort((a, b) => b.items.length - a.items.length);

    if (!category) {
      return build(
        PRODUCT_CATEGORIES,
        (l, key) => l.product.category === key,
        (key) =>
          `/marketplace/search?category=${encodeURIComponent(key)}${region ? `&region=${encodeURIComponent(region)}` : ""}`,
        (n) => `${n} listing${n === 1 ? "" : "s"} ranked`,
      );
    }

    return build(
      REGIONS,
      (l, key) => l.product.availableRegions.includes(key),
      (key) =>
        `/marketplace/search?category=${encodeURIComponent(category)}&region=${encodeURIComponent(key)}`,
      (n) => `${category} · ${n} delivered here`,
    );
  }, [scoped, category, region]);

  /*
    Reset the waterfall whenever the question changes — otherwise switching
    category keeps however many blocks were already unrolled.

    React's documented adjust-state-during-render pattern rather than an effect:
    an effect would paint the old list first and then correct it, and a ref read
    during render is exactly what the compiler rejects.
  */
  const resetKey = `${category}|${region}|${metricKey}`;
  const [lastKey, setLastKey] = React.useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setShown(PAGE);
  }

  /*
    Progressive loading. A sentinel below the last block asks for six more when
    it comes into view — the "waterfall" the reference site uses, and the reason
    thirteen leaderboards do not all render at once on a phone.

    Attached through a callback ref rather than an effect, because the sentinel
    does not exist on the first render: the page shows skeletons until the
    listings arrive. An effect keyed on mount looked for a node that was not
    there yet, found null, and silently never observed anything — so the page
    stopped at six leaderboards and looked complete.
  */
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const sentinelRef = React.useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShown((current) => current + PAGE);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const visible = blocks.slice(0, shown);
  const more = blocks.length - visible.length;

  return (
    <div>
      {/* Hero band — the page announces what it is, in brand colour. */}
      <section className="on-brand">
        <div className="mx-auto max-w-[112rem] px-4 py-10 text-center sm:px-6 sm:py-14 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Top Ranking
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/75">
            Ranked by what the hardware network actually does — enquiries sent, prices
            published, lead times quoted. No paid placement.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <label className="sr-only" htmlFor="rank-region">
              Delivery region
            </label>
            <Select
              id="rank-region"
              value={region}
              onChange={(event) => setRegion(asOption(REGIONS, event.target.value))}
              className="h-11 w-auto rounded-full border-white/25 bg-white/10 px-5 font-medium text-white [&>option]:text-foreground"
            >
              <option value="">All Kenya</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>

            <label className="sr-only" htmlFor="rank-category">
              Category
            </label>
            <Select
              id="rank-category"
              value={category}
              onChange={(event) => setCategory(asOption(PRODUCT_CATEGORIES, event.target.value))}
              className="h-11 w-auto rounded-full border-white/25 bg-white/10 px-5 font-medium text-white [&>option]:text-foreground"
            >
              <option value="">All categories</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Category tabs, scrolling sideways like the reference's. */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[112rem] px-4 sm:px-6 lg:px-8">
          <div role="tablist" aria-label="Rank by category" className="scroll-x flex gap-1">
            {CATEGORY_TABS.map((tab) => {
              const active = tab.value === category;
              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(tab.value)}
                  className={cn(
                    "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
                    active
                      ? "border-brand font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: "Marketplace", href: "/marketplace" },
            { label: "Top ranking" },
          ]}
        />

        <QueryError error={error} onRetry={refetch} />

        {/* What "top" means, chosen explicitly rather than assumed. */}
        <div
          role="group"
          aria-label="Rank by"
          className="scroll-x flex items-center gap-2 pb-1"
        >
          {METRICS.map((m) => {
            const active = m.key === metricKey;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => setMetricKey(m.key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "border-brand bg-brand font-medium text-brand-foreground"
                    : "border-border-strong bg-surface text-muted-foreground hover:border-brand hover:text-brand",
                )}
              >
                {m.label}
              </button>
            );
          })}
          <p className="ml-auto hidden shrink-0 text-sm text-muted-foreground sm:block">
            {loading && all.length === 0
              ? "Ranking…"
              : `${blocks.length} ${blocks.length === 1 ? "leaderboard" : "leaderboards"}`}
          </p>
        </div>

        {loading && all.length === 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <RankingBlockSkeleton key={i} />
            ))}
          </div>
        ) : blocks.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<Trophy className="size-5" />}
              title="Nothing to rank here yet"
              description="No listings match that combination of category and delivery region."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((block, index) => (
                <RankingBlock
                  key={block.key}
                  title={block.title}
                  subtitle={block.subtitle}
                  href={block.href}
                  listings={block.items}
                  metric={metric}
                  priority={index < 3}
                />
              ))}
            </div>

            {/* Asking for the next six. */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />

            {more > 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading {Math.min(more, PAGE)} more…
              </p>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                That is every leaderboard for this selection.{" "}
                <Link href="/marketplace/search" className="text-brand hover:underline">
                  Browse all listings
                  <ChevronRight className="inline size-3.5 align-[-2px]" aria-hidden="true" />
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
