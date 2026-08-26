import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Buildex identity.

  The mark is four blocks on a 2×2 grid — modular construction materials, which
  is literally what the ecosystem moves. The two diagonals differ in weight so
  it still reads at 16px in a browser tab.

  Product accents are identity only. They never carry state.
*/

export type ProductKey = "buildex" | "capital" | "connect";

export const PRODUCT_META: Record<
  ProductKey,
  { name: string; suffix: string; accent: string; description: string }
> = {
  buildex: {
    name: "Buildex",
    suffix: "",
    accent: "text-supply",
    description: "Product supply and distribution",
  },
  capital: {
    name: "Buildex",
    suffix: "Capital",
    accent: "text-capital",
    description: "Credit, financing and collections",
  },
  connect: {
    name: "Buildex",
    suffix: "Connect",
    accent: "text-connect",
    description: "Manufacturer marketplace",
  },
};

export function BuildexMark({
  className,
  product = "buildex",
}: {
  className?: string;
  product?: ProductKey;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", PRODUCT_META[product].accent, className)}
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="13" height="13" rx="2.5" />
      <rect x="17" y="2" width="13" height="13" rx="2.5" opacity="0.45" />
      <rect x="2" y="17" width="13" height="13" rx="2.5" opacity="0.45" />
      <rect x="17" y="17" width="13" height="13" rx="2.5" />
    </svg>
  );
}

export function Wordmark({
  product = "buildex",
  className,
  markClassName,
}: {
  product?: ProductKey;
  className?: string;
  markClassName?: string;
}) {
  const meta = PRODUCT_META[product];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BuildexMark product={product} className={markClassName} />
      <span className="text-base font-semibold tracking-tight text-foreground">
        {meta.name}
        {meta.suffix ? (
          <span className={cn("ml-1.5 font-normal", meta.accent)}>{meta.suffix}</span>
        ) : null}
      </span>
    </span>
  );
}
