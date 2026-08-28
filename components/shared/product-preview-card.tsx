"use client";

import * as React from "react";
import { ImageIcon, MapPin, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Currency } from "./format";
import { VerifiedMark } from "@/components/shared/verified-mark";
import {
  formatBandRange,
  formatLeadTime,
  priceRange,
  type PriceBand,
} from "@/lib/schemas/product";

/*
  The card a hardware shop sees on the marketplace.

  It lives here rather than inside the wizard because the whole point is that
  the manufacturer's preview and the real listing are the same component —
  a preview that drifts from the real thing is worse than no preview.
*/

export type ProductPreview = {
  name: string;
  category: string;
  packSize: string;
  unit: string;
  priceBands: PriceBand[];
  moq: number;
  leadTimeDays: number;
  availableRegions: string[];
  manufacturerName: string;
  verified: boolean;
};

export function ProductPreviewCard({
  product,
  className,
}: {
  product: ProductPreview;
  className?: string;
}) {
  const bands = product.priceBands.filter((b) => b.unitPrice > 0);
  const range = bands.length ? priceRange(bands) : null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <div className="flex h-32 items-center justify-center border-b border-border bg-surface-muted">
        <div className="flex flex-col items-center gap-1 text-subtle-foreground">
          <ImageIcon className="size-6" aria-hidden="true" />
          <span className="text-xs">No image yet</span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand">
          {product.category || "Category"}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
          {product.name || "Your product name"}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {product.manufacturerName}
          {product.verified ? (
            <VerifiedMark subject="manufacturer" />
          ) : null}
        </p>

        <div className="mt-3 border-t border-border pt-3">
          {range ? (
            <p className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted-foreground">from</span>
              <Currency value={range.min} className="text-base font-semibold text-price" />
              <span className="text-xs text-muted-foreground">
                / {product.unit || "unit"}
              </span>
            </p>
          ) : (
            <p className="text-sm text-subtle-foreground">Add a price band</p>
          )}

          {bands.length > 1 ? (
            <ul className="mt-2 space-y-1">
              {bands.map((band, index) => (
                <li
                  key={index}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <span className="text-muted-foreground">
                    {formatBandRange(band, product.unit || "unit")}
                  </span>
                  <Currency value={band.unitPrice} className="font-medium text-foreground" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Minimum order</dt>
            <dd>
              MOQ{" "}
              <span className="font-medium text-foreground text-numeric">{product.moq || "—"}</span>{" "}
              {product.unit ? `${product.unit}s` : ""}
              {product.packSize ? ` · ${product.packSize}` : ""}
            </dd>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Lead time</dt>
            <dd>{formatLeadTime(product.leadTimeDays)} lead time</dd>
          </div>
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Delivers to</dt>
            <dd>
              {product.availableRegions.length
                ? product.availableRegions.join(", ")
                : "No regions selected"}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
