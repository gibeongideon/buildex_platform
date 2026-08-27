"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, X } from "lucide-react";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  Comparing the same material across suppliers.

  The thing that makes this worth building here rather than leaving to a buyer's
  spreadsheet: on this marketplace a price is not a number, it is a set of
  quantity bands. Two suppliers can each look cheaper than the other depending
  on how much you order, and a supplier with a 100-unit minimum cannot serve an
  order of 20 at any price. So the comparison is driven by *your quantity*, and
  says plainly when a supplier cannot serve it.

  Selection lives in context rather than the URL so it survives moving between
  search, a listing and a storefront — which is exactly the path a buyer takes
  while building a shortlist.
*/

/** Four columns is what fits side by side before the table stops being readable. */
export const COMPARE_LIMIT = 4;

type CompareValue = {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  full: boolean;
};

const CompareContext = React.createContext<CompareValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = React.useState<string[]>([]);

  const value = React.useMemo<CompareValue>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      full: ids.length >= COMPARE_LIMIT,
      toggle: (id) =>
        setIds((current) =>
          current.includes(id)
            ? current.filter((x) => x !== id)
            : current.length >= COMPARE_LIMIT
              ? current
              : [...current, id],
        ),
      remove: (id) => setIds((current) => current.filter((x) => x !== id)),
      clear: () => setIds([]),
    }),
    [ids],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

/** Null outside the marketplace, where comparing has no meaning. */
export function useCompare() {
  return React.useContext(CompareContext);
}

/**
 * The per-listing control. A checkbox rather than a button: it is a selection
 * that persists, and it has to read as one at a glance on a grid of cards.
 */
export function CompareToggle({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const compare = useCompare();
  if (!compare) return null;

  const selected = compare.has(productId);
  const blocked = !selected && compare.full;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={blocked}
      title={
        blocked ? `Comparing ${COMPARE_LIMIT} already — remove one first` : "Compare"
      }
      onClick={(event) => {
        // Sits inside a card that is itself a link.
        event.preventDefault();
        event.stopPropagation();
        compare.toggle(productId);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border-strong bg-surface text-muted-foreground hover:border-brand hover:text-brand",
        blocked && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <Scale className="size-3.5" aria-hidden="true" />
      {selected ? "Comparing" : "Compare"}
    </button>
  );
}

/**
 * The floating tray. Shows what is selected and gets you to the comparison in
 * one click — the shortlist is worthless if you have to go looking for it.
 */
export function CompareTray() {
  const compare = useCompare();
  const router = useRouter();
  if (!compare || compare.ids.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Products selected for comparison"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-[112rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Scale className="size-4 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {compare.ids.length} of {COMPARE_LIMIT} selected
        </p>

        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {compare.ids.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => compare.remove(id)}
                title="Remove from comparison"
                className="group relative block size-10 overflow-hidden rounded-md border border-border"
              >
                <ProductThumb
                  productId={id}
                  category=""
                  className="size-full"
                  iconClassName="size-4"
                  sizes="40px"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-brand/0 transition-colors group-hover:bg-brand/70">
                  <X
                    className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="sr-only">Remove from comparison</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={compare.clear}>
            Clear
          </Button>
          <Button
            size="sm"
            disabled={compare.ids.length < 2}
            title={
              compare.ids.length < 2 ? "Pick at least two to compare" : undefined
            }
            onClick={() =>
              router.push(`/marketplace/compare?ids=${compare.ids.join(",")}`)
            }
          >
            Compare
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A quiet entry point for pages that want to link to an existing shortlist. */
export function CompareLink() {
  const compare = useCompare();
  if (!compare || compare.ids.length < 2) return null;
  return (
    <Link
      href={`/marketplace/compare?ids=${compare.ids.join(",")}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
    >
      <Scale className="size-4" aria-hidden="true" />
      Compare {compare.ids.length} products
    </Link>
  );
}
