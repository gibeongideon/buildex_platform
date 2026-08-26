"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Currency } from "@/components/shared/format";
import { ProductThumb, categoryIcon } from "@/components/shared/product-thumb";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/schemas/common";
import { priceRange, type Product } from "@/lib/schemas/product";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";

/*
  The "All categories" mega menu.

  Large B2B marketplaces open a panel that covers most of the viewport: a
  category rail on the left, and the hovered category's contents on the right.
  It works because it turns two clicks into one hover, and because seeing real
  products under a category tells a buyer whether it is worth entering.

  Ours shows real listings, so the panel is only as full as the catalogue
  actually is — a category with three products says three, which is more useful
  than a padded grid.

  Opens on hover with a short close delay (so a diagonal mouse path to the panel
  doesn't dismiss it), and on click or Enter for keyboard and touch.

  Click only ever *opens*. Toggling looked right but broke for mouse users: the
  hover fires first, so the click that followed closed the panel they had just
  opened. Escape, moving away, or picking something closes it.
*/

const CLOSE_DELAY_MS = 180;

/**
 * Column count that leaves the fewest empty cells in the last row.
 *
 * A fixed seven-wide grid is right for a catalogue with hundreds of items per
 * category, but ours has single digits — eight tiles in a seven-wide grid strand
 * one on its own with six dead cells beside it. Choosing four instead fills two
 * clean rows. Wider is preferred on ties, so a full row still reads as dense.
 */
function bestColumns(count: number) {
  if (count <= 4) return count || 1;
  let best = 7;
  let fewestGaps = Number.POSITIVE_INFINITY;
  for (const cols of [7, 6, 5, 4]) {
    const gaps = (cols - (count % cols)) % cols;
    if (gaps < fewestGaps) {
      fewestGaps = gaps;
      best = cols;
    }
  }
  return best;
}

const COLUMN_CLASS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-5 lg:grid-cols-6",
  7: "sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
};

/*
  The panel body.

  Modelled on the reference's "Categories for you" pane: a heading, then a dense
  grid of circular tiles filling the whole width. No side column — that was the
  part that left dead space whenever a category had few suppliers, and the tiles
  carry more information per pixel anyway.
*/
function CategoryPanel({
  category,
  onNavigate,
}: {
  category: ProductCategory;
  onNavigate: () => void;
}) {
  const { data, loading } = useQuery(
    () => marketplaceRepo.search({ categories: [category], sort: "relevance" }),
    [category],
  );

  const listings = data?.listings ?? [];
  const suppliers = data?.facets.manufacturers ?? [];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
          {category}
        </h3>
        <Link
          href={`/marketplace/search?category=${encodeURIComponent(category)}`}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          {loading && !data ? (
            "View all"
          ) : (
            <>
              View all {listings.length} from {suppliers.length}{" "}
              {suppliers.length === 1 ? "supplier" : "suppliers"}
            </>
          )}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {loading && !data ? (
          <ul className="grid grid-cols-4 gap-x-4 gap-y-5 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {Array.from({ length: 14 }).map((_, i) => (
              <li key={i} className="flex flex-col items-center gap-2">
                <div className="aspect-square w-full animate-pulse rounded-full bg-surface-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
              </li>
            ))}
          </ul>
        ) : listings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No published listings in this category yet.
          </p>
        ) : (
          <ul
            className={cn(
              "grid grid-cols-3 gap-x-4 gap-y-5",
              COLUMN_CLASS[bestColumns(listings.length)],
            )}
          >
            {listings.map(({ product }: { product: Product }) => (
              <li key={product.id}>
                <Link
                  href={`/marketplace/product/${product.id}`}
                  onClick={onNavigate}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <ProductThumb
                    productId={product.id}
                    category={product.category}
                    className="aspect-square w-full rounded-full ring-1 ring-border transition-all group-hover:ring-2 group-hover:ring-brand"
                    iconClassName="size-7"
                    sizes="120px"
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-brand">
                    {product.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    from{" "}
                    <Currency
                      value={priceRange(product.priceBands).min}
                      className="font-semibold text-foreground"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function CategoryMegaMenu() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<ProductCategory>(PRODUCT_CATEGORIES[0]);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  // A short delay so a diagonal mouse path from the trigger into the panel
  // does not dismiss it on the way.
  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  React.useEffect(() => () => cancelClose(), [cancelClose]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="static"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-surface-muted text-foreground"
            : "text-foreground hover:bg-surface-muted",
        )}
      >
        <Menu className="size-4" aria-hidden="true" />
        All categories
      </button>

      {open ? (
        <>
          {/* Dim the page behind, the way a full-bleed panel should. */}
          <div
            aria-hidden="true"
            className="fixed inset-0 top-[var(--mega-top,10rem)] z-30 bg-black/25"
            onMouseEnter={scheduleClose}
          />
          <div
            className="absolute inset-x-0 z-40 border-y border-border bg-surface shadow-overlay"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="mx-auto grid h-[min(32rem,70vh)] max-w-[112rem] grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <ul
                className="min-h-0 overflow-y-auto border-b border-border py-2 lg:border-b-0 lg:border-r"
                role="tablist"
                aria-orientation="vertical"
              >
                {PRODUCT_CATEGORIES.map((category) => {
                  const Icon = categoryIcon(category);
                  const isActive = category === active;
                  return (
                    <li key={category}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(category)}
                        onFocus={() => setActive(category)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-brand-soft font-semibold text-foreground"
                            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-brand" : "text-subtle-foreground",
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{category}</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto size-3.5 shrink-0",
                            isActive ? "text-brand" : "text-transparent",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <CategoryPanel category={active} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
