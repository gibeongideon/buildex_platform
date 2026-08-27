import * as React from "react";
import { cn } from "@/lib/utils";

/*
  ===========================================================================
  BUILDEX IDENTITY
  ===========================================================================

  Source: "BUILDEX BRANDING FULL.pdf" (Brand Guidelines, Aug 2026).

  The primary logo is a house outline — chimney, asymmetric pitched roof, left
  wall and floor — with "BUILDEX" set heavy across the house body and the
  business descriptor beneath it in brand yellow.

  Geometry below is traced from the artwork on the "Logo Variation" page,
  normalised to a 0 0 184 100 viewBox:

      chimney        x 26.9 → 35.5, rising above the left roof slope
      roof apex      (57.4, 0.9) — left of centre, so the pitch is asymmetric
      left eave      (0, 47.5) with a short overhang to x 18
      left wall      x 18, y 47.5 → 100
      floor          x 18 → 184, y 100
      roof right end (128.6, 45.8) — the right side is deliberately open

  Guideline constraints honoured here:
    · Backgrounds: white or transparent only. On dark grounds the guideline's
      own reversed variant applies, so the outline and wordmark go white while
      the descriptor stays yellow.
    · "Keep the logo large enough for the descriptor to remain clearly
      readable on mobile" — `Wordmark` never renders the descriptor below
      10px, and `BuildexMark` is the mark-only variant for tight spaces
      (favicons, collapsed rails) where a descriptor could not be read.
    · Don'ts: no stretching (the SVG preserves aspect ratio), no recolouring
      (only the two brand colours plus the sanctioned reversal), no shadows.
*/

/*
  Naming
  ------
  The platform is **Buildex Connect**. Inside it sit three businesses:

    Buildex Interiors  — product supply and distribution (the parent company,
                         "BUILDEX INTERIORS CO. LTD." in the brand guidelines)
    Buildex Capital    — credit, financing and collections
    Buildex Connect    — the manufacturer marketplace

  "Buildex Connect" therefore names both the platform and the marketplace
  inside it, in the same way a company and its flagship product often share a
  name. Where the distinction matters, the copy says "the Buildex Connect
  marketplace" for the latter.
*/
export type ProductKey = "interiors" | "capital" | "connect";

/**
 * Each lockup follows the brand's own construction — "BUILDEX" in blue with
 * the descriptor in yellow — exactly as the master logo does with "INTERIORS".
 * The businesses are distinguished by the descriptor word, never by inventing
 * an extra colour.
 */
export const PRODUCT_META: Record<
  ProductKey,
  { name: string; descriptor: string; fullName: string; description: string }
> = {
  interiors: {
    name: "BUILDEX",
    descriptor: "INTERIORS",
    fullName: "Buildex Interiors",
    description: "Product supply and distribution",
  },
  capital: {
    name: "BUILDEX",
    descriptor: "CAPITAL",
    fullName: "Buildex Capital",
    description: "Credit, financing and collections",
  },
  connect: {
    name: "BUILDEX",
    descriptor: "CONNECT",
    fullName: "Buildex Connect",
    description: "Manufacturer marketplace",
  },
};

/**
 * The house outline on its own. Inherits `currentColor`.
 *
 * The master artwork's floor runs the full width of the lockup, under the
 * wordmark. Standalone it is drawn at house proportions (~1.4:1) so it reads
 * as a house rather than a long horizontal rule, keeping the asymmetric pitch
 * and the deliberately open right side.
 *
 * All geometry is inset by at least half the stroke width, so nothing clips
 * against the viewBox edge at small sizes.
 */
export function BuildexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 92"
      className={cn("h-7 w-auto text-brand", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {/* Left eave overhang, left wall, floor */}
      <path d="M5 46H17V86H127" />
      {/* Roof: up the short steep slope to the apex, down the long shallow one */}
      <path d="M5 46L44 6L99 44" />
      {/* Chimney, sitting on the left slope */}
      <path d="M21 29.6V9H28V22.4" />
    </svg>
  );
}

const SIZES = {
  sm: { mark: "h-5", name: "text-sm", descriptor: "text-[10px]" },
  md: { mark: "h-7", name: "text-base", descriptor: "text-[11px]" },
  lg: { mark: "h-9", name: "text-xl", descriptor: "text-[13px]" },
} as const;

/**
 * The full horizontal lockup: house mark, "BUILDEX", descriptor in yellow.
 *
 * The master logo overlaps the wordmark with the house. That reads well at
 * poster scale but collapses in a 64px application header, so app chrome uses
 * this horizontal arrangement instead — same elements, same colours, same
 * hierarchy, legible at 20px.
 */
export function Wordmark({
  product = "connect",
  size = "md",
  reversed = false,
  className,
}: {
  product?: ProductKey;
  size?: keyof typeof SIZES;
  /**
   * For a permanently dark ground — the brand-blue footers — rather than dark
   * *mode*. Without it those surfaces had to hand-copy this lockup to get the
   * reversed treatment, and a hand-copy is what let the public footer drift to
   * the wrong product name.
   */
  reversed?: boolean;
  className?: string;
}) {
  const meta = PRODUCT_META[product];
  const scale = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Reversed to white on dark grounds, per the guideline's own variants. */}
      <BuildexMark className={cn(scale.mark, "w-auto dark:text-white", reversed && "text-white")} />
      <span className="flex flex-col items-start leading-none">
        <span
          className={cn(
            "font-display font-extrabold tracking-tight text-brand dark:text-white",
            reversed && "text-white",
            scale.name,
          )}
        >
          {meta.name}
        </span>
        <span
          className={cn(
            // Brand yellow is a light colour: as text on white it is 1.37:1
            // and unreadable, so in light mode the descriptor sits on a blue
            // chip (8.95:1). On a dark ground the chip is unnecessary — yellow
            // on the dark surface is already 14:1 — so it drops away and the
            // lockup matches the guideline's reversed artwork.
            "mt-1 font-display font-bold uppercase tracking-[0.18em] text-primary",
            "rounded-[3px] bg-brand px-1.5 py-px",
            "dark:bg-transparent dark:px-0 dark:py-0",
            // On a dark ground the chip is unnecessary: yellow already reads at
            // 14:1 there, which is the guideline's own reversed artwork.
            reversed && "bg-transparent px-0 py-0",
            scale.descriptor,
          )}
        >
          {meta.descriptor}
        </span>
      </span>
      <span className="sr-only">
        {meta.name} {meta.descriptor} — {meta.description}
      </span>
    </span>
  );
}
