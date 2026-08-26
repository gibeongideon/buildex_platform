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
  doesn't dismiss it), and on click/Enter for keyboard and touch. Escape closes.
*/

const CLOSE_DELAY_MS = 180;

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
  const regions = data?.facets.regions ?? [];

  return (
    <div className="flex min-h-[26rem] flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-6 py-4">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
            {category}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading && !data ? (
              "Loading…"
            ) : (
              <>
                <span className="font-medium text-foreground text-numeric">
                  {listings.length}
                </span>{" "}
                listings from{" "}
                <span className="font-medium text-foreground text-numeric">
                  {suppliers.length}
                </span>{" "}
                {suppliers.length === 1 ? "supplier" : "suppliers"}
              </>
            )}
          </p>
        </div>
        <Link
          href={`/marketplace/search?category=${encodeURIComponent(category)}`}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          View all
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid flex-1 gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          {loading && !data ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-square animate-pulse rounded-lg bg-surface-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No published listings in this category yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
              {listings.slice(0, 8).map(({ product }: { product: Product }) => (
                <li key={product.id}>
                  <Link
                    href={`/marketplace/product/${product.id}`}
                    onClick={onNavigate}
                    className="group block"
                  >
                    <ProductThumb
                      productId={product.id}
                      category={product.category}
                      className="aspect-square rounded-lg border border-border transition-colors group-hover:border-brand"
                      iconClassName="size-9"
                    />
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-brand">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      from{" "}
                      <Currency
                        value={priceRange(product.priceBands).min}
                        className="font-semibold text-foreground"
                      />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Suppliers
            </p>
            <ul className="mt-2 space-y-0.5">
              {suppliers.slice(0, 6).map((supplier) => (
                <li key={supplier.id}>
                  <Link
                    href={`/marketplace/manufacturer/${supplier.id}`}
                    onClick={onNavigate}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <span className="truncate">{supplier.name}</span>
                    <span className="shrink-0 text-xs text-subtle-foreground text-numeric">
                      {supplier.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Delivers to
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {regions.slice(0, 8).map((region) => (
                <li key={region.value}>
                  <Link
                    href={`/marketplace/search?category=${encodeURIComponent(category)}&region=${encodeURIComponent(region.value)}`}
                    onClick={onNavigate}
                    className="inline-block rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                  >
                    {region.value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
        onClick={() => setOpen((v) => !v)}
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
            <div className="mx-auto grid max-w-[90rem] grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <ul
                className="max-h-[30rem] overflow-y-auto border-b border-border py-2 lg:border-b-0 lg:border-r"
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
