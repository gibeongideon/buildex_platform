import { spreadBy } from "@/lib/utils";
import type { Product } from "@/lib/schemas/product";

/*
  What a supplier is known for.

  The manufacturer directory and the storefront both lead with a short strip of
  a supplier's products. Until now the platform chose that strip — one per
  category before repeating — which spreads the range but has no idea what the
  supplier actually wants to be judged on. A cement plant whose reputation rests
  on one rapid-hardening grade got whatever the spread happened to pick.

  So the supplier chooses, up to four, on the product form. The automatic spread
  stays as the fallback: a supplier who has chosen nothing still gets a sensible
  strip rather than an empty panel, and one who has chosen two gets those two
  first and the spread behind them.
*/

export const MAIN_PRODUCT_LIMIT = 4;

/** Only a live listing can represent the supplier — a draft is not public. */
function isPublic(product: Product) {
  return product.status === "active";
}

/** The ones the supplier has actually chosen, newest choice last. */
export function chosenMainProducts(products: Product[]): Product[] {
  return products.filter((p) => p.isMainProduct && isPublic(p));
}

/**
 * The strip to show: the supplier's own choices first, then the automatic
 * spread to fill any remaining slots.
 */
export function mainProducts(products: Product[], limit = MAIN_PRODUCT_LIMIT): Product[] {
  const chosen = chosenMainProducts(products).slice(0, limit);
  if (chosen.length >= limit) return chosen;

  const chosenIds = new Set(chosen.map((p) => p.id));
  const rest = products.filter((p) => isPublic(p) && !chosenIds.has(p.id));
  return [...chosen, ...spreadBy(rest, limit - chosen.length, (p) => p.category)];
}

/** Whether the strip on show is the supplier's own selection or our fallback. */
export function hasChosenMainProducts(products: Product[]): boolean {
  return chosenMainProducts(products).length > 0;
}

/**
 * How many slots are left, ignoring the product being edited so that saving an
 * existing main product does not count against itself.
 */
export function mainSlotsRemaining(products: Product[], exceptId?: string): number {
  const used = products.filter(
    (p) => p.isMainProduct && isPublic(p) && p.id !== exceptId,
  ).length;
  return Math.max(0, MAIN_PRODUCT_LIMIT - used);
}

/**
 * The guard behind the form. Returns the reason it cannot be marked, or null.
 *
 * A draft may be marked freely: it takes a slot only when it goes live, which
 * is what `isPublic` above enforces on read. Blocking it at draft time would
 * mean a supplier could not prepare a replacement main product before
 * archiving the old one.
 */
export function mainProductBlockedReason(
  products: Product[],
  candidate: { id?: string; status: Product["status"] },
): string | null {
  if (candidate.status !== "active") return null;
  if (mainSlotsRemaining(products, candidate.id) > 0) return null;
  return `You already show ${MAIN_PRODUCT_LIMIT} main products. Unmark one first.`;
}
