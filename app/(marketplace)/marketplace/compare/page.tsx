"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Check, MapPin, Minus, Scale, X } from "lucide-react";
import { marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { Currency, Num } from "@/components/shared/format";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Input } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { useCompare } from "@/components/marketplace/compare";
import {
  formatBandRange,
  formatLeadTime,
  priceAtQuantity,
} from "@/lib/schemas/product";
import { cn } from "@/lib/utils";

/*
  Side-by-side comparison, driven by quantity.

  On this marketplace a price is a set of quantity bands, not a number, so "who
  is cheapest" has no answer until you say how much you are buying — two
  suppliers can each win at different volumes. The quantity field at the top is
  therefore the control the whole page hangs off, and the cheapest column is
  marked only once there is a quantity to be cheapest *at*.

  The other half of the honesty here is minimum order. A supplier whose MOQ is
  100 cannot serve an order of 20 at any price, so their column says so instead
  of showing a unit price the buyer could not actually get.
*/

type Row = {
  label: string;
  hint?: string;
  render: (ctx: {
    listing: NonNullable<Awaited<ReturnType<typeof marketplaceRepo.getListing>>>;
    quantity: number;
    cheapest: boolean;
  }) => React.ReactNode;
};

function CompareInner() {
  const params = useSearchParams();
  const compare = useCompare();
  const ids = React.useMemo(
    () => (params.get("ids") ?? "").split(",").filter(Boolean),
    [params],
  );
  const key = ids.join(",");

  const { data: listings, loading, error, refetch } = useQuery(
    () => marketplaceRepo.listingsByIds(ids),
    [key],
  );

  const [quantityText, setQuantityText] = React.useState("");
  const rows = listings ?? [];

  // Default to the largest minimum in the set, so the first thing shown is a
  // quantity every supplier here can actually serve.
  const defaultQuantity = rows.length
    ? Math.max(...rows.map((l) => l.product.moq))
    : 1;
  const quantity = quantityText.trim() === "" ? defaultQuantity : Number(quantityText);
  const validQuantity = Number.isFinite(quantity) && quantity > 0;

  /** Unit price at this quantity, or null when the supplier cannot serve it. */
  function unitPrice(listing: (typeof rows)[number]) {
    if (!validQuantity || quantity < listing.product.moq) return null;
    return priceAtQuantity(listing.product.priceBands, quantity);
  }

  const prices = rows.map((l) => unitPrice(l));
  const servable = prices.filter((p): p is number => p !== null);
  const best = servable.length ? Math.min(...servable) : null;

  if (!loading && rows.length < 2) {
    return (
      <div className="mx-auto max-w-[112rem] px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Scale className="size-5" />}
              title="Pick at least two products to compare"
              description="Use the Compare button on any listing. You can line up four side by side."
              action={
                <Button asChild>
                  <Link href="/marketplace/search">Browse listings</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/marketplace" className="hover:text-foreground hover:underline">
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Compare</li>
        </ol>
      </nav>

      <QueryError error={error} onRetry={refetch} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
            <Scale className="size-5 text-brand" aria-hidden="true" />
            Compare {rows.length} products
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Prices here are quantity bands, so who is cheapest depends on how much you
            buy. Set your quantity and the table re-prices.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <label
              htmlFor="compare-quantity"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Your quantity
            </label>
            <Input
              id="compare-quantity"
              type="number"
              min={1}
              inputMode="numeric"
              value={quantityText}
              placeholder={String(defaultQuantity)}
              onChange={(event) => setQuantityText(event.target.value)}
              className="h-10 w-36"
            />
          </div>
          {compare && compare.ids.length > 0 ? (
            <Button variant="secondary" onClick={compare.clear}>
              Clear selection
            </Button>
          ) : null}
        </div>
      </div>

      {!validQuantity ? (
        <Alert tone="warning" className="mt-4" title="Enter a quantity above zero">
          Without one there is nothing to compare prices at.
        </Alert>
      ) : servable.length === 0 ? (
        <Alert
          tone="warning"
          className="mt-4"
          title={`No supplier here sells as few as ${quantity}`}
        >
          The lowest minimum order in this set is{" "}
          <span className="font-medium">{defaultQuantity}</span>. Raise the quantity, or
          compare different suppliers.
        </Alert>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="scroll-x mt-6">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Products compared at a quantity of {quantity}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-44 border-b border-border p-3 text-left align-bottom">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    At {validQuantity ? quantity : "—"} units
                  </span>
                </th>
                {rows.map((listing, index) => {
                  const cheapest = best !== null && prices[index] === best;
                  return (
                    <th
                      key={listing.product.id}
                      scope="col"
                      className={cn(
                        "border-b border-border p-3 text-left align-bottom",
                        cheapest && "bg-success-soft",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/marketplace/product/${listing.product.id}`}
                          className="group block min-w-0"
                        >
                          <ProductThumb
                            productId={listing.product.id}
                            category={listing.product.category}
                            className="mb-2 aspect-square w-24 rounded-md border border-border"
                            iconClassName="size-5"
                            sizes="96px"
                          />
                          <span className="block text-sm font-semibold leading-snug text-foreground group-hover:text-brand">
                            {listing.product.name}
                          </span>
                        </Link>
                        {compare ? (
                          <button
                            type="button"
                            onClick={() => compare.remove(listing.product.id)}
                            className="rounded-md p-1 text-subtle-foreground hover:bg-surface-muted hover:text-foreground"
                            title="Remove from comparison"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">
                              Remove {listing.product.name}
                            </span>
                          </button>
                        ) : null}
                      </div>
                      {cheapest ? (
                        <StatusPill tone="success" className="mt-2">
                          <Check className="size-3" aria-hidden="true" />
                          Cheapest at this quantity
                        </StatusPill>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-border p-3 text-left font-medium text-muted-foreground"
                  >
                    {row.label}
                    {row.hint ? (
                      <span className="mt-0.5 block text-xs font-normal text-subtle-foreground">
                        {row.hint}
                      </span>
                    ) : null}
                  </th>
                  {rows.map((listing, index) => {
                    const cheapest = best !== null && prices[index] === best;
                    return (
                      <td
                        key={listing.product.id}
                        className={cn(
                          "border-b border-border p-3",
                          cheapest && "bg-success-soft",
                        )}
                      >
                        {row.render({ listing, quantity, cheapest })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/*
  The rows, declared once. Order matters: the two figures a buyer decides on —
  unit price at their quantity, and what that costs in total — come first, and
  everything that qualifies those numbers follows.
*/
const COMPARISON_ROWS: Row[] = [
  {
    label: "Unit price",
    hint: "At your quantity",
    render: ({ listing, quantity }) => {
      if (quantity < listing.product.moq) {
        return (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning">
            <Minus className="size-3.5" aria-hidden="true" />
            Below their minimum
          </span>
        );
      }
      const price = priceAtQuantity(listing.product.priceBands, quantity);
      if (price === null) {
        return <span className="text-sm text-muted-foreground">No band covers this</span>;
      }
      return (
        <span className="font-display text-lg font-bold text-foreground">
          <Currency value={price} />
          <span className="text-xs font-normal text-muted-foreground">
            {" "}
            /{listing.product.unit}
          </span>
        </span>
      );
    },
  },
  {
    label: "Line total",
    hint: "Unit price × quantity",
    render: ({ listing, quantity }) => {
      if (quantity < listing.product.moq) return <Dash />;
      const price = priceAtQuantity(listing.product.priceBands, quantity);
      if (price === null) return <Dash />;
      return (
        <span className="font-semibold text-foreground text-numeric">
          <Currency value={price * quantity} />
        </span>
      );
    },
  },
  {
    label: "Minimum order",
    render: ({ listing, quantity }) => (
      <span
        className={cn(
          "text-numeric",
          quantity < listing.product.moq
            ? "font-medium text-warning"
            : "text-muted-foreground",
        )}
      >
        <Num value={listing.product.moq} /> {listing.product.unit}
        {listing.product.moq === 1 ? "" : "s"}
      </span>
    ),
  },
  {
    label: "Lead time",
    render: ({ listing }) => (
      <span className="text-muted-foreground">
        {formatLeadTime(listing.product.leadTimeDays)}
      </span>
    ),
  },
  {
    label: "Price bands",
    hint: "The supplier's full ladder",
    render: ({ listing }) => (
      <ul className="space-y-0.5">
        {listing.product.priceBands.map((band) => (
          <li key={band.minQty} className="text-xs text-muted-foreground text-numeric">
            {formatBandRange(band, listing.product.unit)} ·{" "}
            <span className="text-foreground">
              <Currency value={band.unitPrice} />
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    label: "Supplier",
    render: ({ listing }) => (
      <div className="min-w-0">
        <Link
          href={`/marketplace/manufacturer/${listing.manufacturer.id}`}
          className="flex items-center gap-1.5 font-medium text-foreground hover:text-brand hover:underline"
        >
          <span className="truncate">{listing.manufacturer.tradingName}</span>
          {listing.manufacturer.status === "approved" ? (
            <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label="Verified" />
          ) : null}
        </Link>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" aria-hidden="true" />
          {listing.manufacturer.county}
        </p>
      </div>
    ),
  },
  {
    label: "Replies in",
    hint: "The time they advertise",
    render: ({ listing }) => (
      <span className="text-muted-foreground text-numeric">
        {listing.manufacturer.storefront.avgResponseHours
          ? `${listing.manufacturer.storefront.avgResponseHours}h`
          : "Not stated"}
      </span>
    ),
  },
  {
    label: "Delivers to",
    render: ({ listing }) => (
      <span className="text-xs text-muted-foreground">
        {listing.product.availableRegions.join(", ")}
      </span>
    ),
  },
  {
    label: "Certifications",
    render: ({ listing }) =>
      listing.manufacturer.storefront.certifications.length ? (
        <ul className="space-y-0.5">
          {listing.manufacturer.storefront.certifications.map((c) => (
            <li key={c} className="text-xs text-muted-foreground">
              {c}
            </li>
          ))}
        </ul>
      ) : (
        <Dash />
      ),
  },
  {
    label: "",
    render: ({ listing }) => (
      <Button size="sm" className="w-full" asChild>
        <Link href={`/marketplace/product/${listing.product.id}#enquire`}>
          Request a quote
        </Link>
      </Button>
    ),
  },
];

function Dash() {
  return <span className="text-subtle-foreground">—</span>;
}

/*
  `useSearchParams()` opts a page out of static prerendering unless it sits
  inside a Suspense boundary.
*/
export default function ComparePage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-8 w-64" />
          <Skeleton className="mt-6 h-96" />
        </div>
      }
    >
      <CompareInner />
    </React.Suspense>
  );
}
