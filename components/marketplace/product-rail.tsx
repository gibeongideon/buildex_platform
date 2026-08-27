"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import type { MarketplaceListing } from "@/lib/data";
import { cn } from "@/lib/utils";

/*
  One category, as a horizontal rail.

  A single continuous grid of every listing makes a buyer scan forty unrelated
  products to find the two they care about. Grouping by category turns the page
  into a set of answerable questions — "what cement is there?" — and each rail
  scrolls sideways so a category with twelve products costs the same vertical
  space as one with three.

  The arrows are an affordance, not the mechanism: the rail is a normal scroll
  container, so a trackpad, a touchscreen and the keyboard all work without
  them. They are hidden from assistive technology for that reason.
*/

export function ProductRail({
  title,
  subtitle,
  href,
  linkLabel = "See all",
  icon: Icon,
  listings,
  priority = false,
  className,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel?: string;
  icon?: React.ElementType;
  listings: MarketplaceListing[];
  /** Only the first rail on a page should preload its images. */
  priority?: boolean;
  className?: string;
}) {
  const railRef = React.useRef<HTMLUListElement | null>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  /*
    Measured from the element rather than tracked in state as it scrolls, and
    returning the previous object when nothing changed — otherwise every scroll
    frame would produce a new object and re-render the whole rail.
  */
  const measure = React.useCallback((node: HTMLUListElement | null) => {
    if (!node) return;
    const left = node.scrollLeft > 4;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 4;
    setEdges((current) =>
      current.left === left && current.right === right ? current : { left, right },
    );
  }, []);

  const attach = React.useCallback(
    (node: HTMLUListElement | null) => {
      railRef.current = node;
      measure(node);
    },
    [measure],
  );

  function nudge(direction: -1 | 1) {
    const node = railRef.current;
    if (!node) return;
    // Roughly a screenful, so a click lands on a fresh set rather than nudging
    // one card and leaving the reader to find their place again.
    node.scrollBy({ left: direction * node.clientWidth * 0.9, behavior: "smooth" });
  }

  if (listings.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={cn("rounded-lg border border-border bg-surface p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
            {Icon ? <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" /> : null}
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand hover:underline"
          >
            {linkLabel}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
          {/*
            Decorative: the rail already scrolls by trackpad, touch and keyboard,
            so exposing these to a screen reader would only add two controls that
            duplicate what the container does natively.
          */}
          <div aria-hidden="true" className="hidden items-center gap-1 sm:flex">
            {([-1, 1] as const).map((direction) => {
              const disabled = direction === -1 ? !edges.left : !edges.right;
              return (
                <button
                  key={direction}
                  type="button"
                  tabIndex={-1}
                  disabled={disabled}
                  onClick={() => nudge(direction)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors",
                    disabled
                      ? "cursor-default opacity-30"
                      : "hover:border-brand hover:text-brand",
                  )}
                >
                  {direction === -1 ? (
                    <ChevronLeft className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ul
        ref={attach}
        onScroll={(event) => measure(event.currentTarget)}
        className="scroll-x mt-4 flex snap-x snap-mandatory gap-4 pb-1"
      >
        {listings.map(({ product, manufacturer, enquiryCount }, index) => (
          <li
            key={product.id}
            // Fixed width so the row reads as a row; two-and-a-bit cards visible
            // on a phone, which is what signals it scrolls.
            className="w-[9.5rem] shrink-0 snap-start sm:w-[11.5rem] lg:w-[13rem]"
          >
            {/*
              `h-full` so a card whose supplier line wraps to two lines does not
              stand taller than its neighbours — in a row that reads as a
              misalignment rather than as longer text.
            */}
            <ProductCard
              className="h-full"
              product={product}
              manufacturer={manufacturer}
              enquiryCount={enquiryCount}
              priority={priority && index < 4}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProductRailSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
        {title}
      </h3>
      <ul className="mt-4 flex gap-4 overflow-hidden pb-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <li key={i} className="w-[9.5rem] shrink-0 sm:w-[11.5rem] lg:w-[13rem]">
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}
