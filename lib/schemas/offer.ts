import { z } from "zod";
import { productCategorySchema, regionSchema } from "./common";
import { membershipTierSchema } from "./membership";

/*
  Offers — Chapter 9 §9.2 ("selected public offers and categories") and §9.9
  ("member-only deals and negotiated member pricing").

  An offer is deliberately attached to a *category and region*, not to a
  freely-typed headline. The marketplace already knows which listings sit in a
  category and which suppliers deliver to a region, so an offer card can always
  be resolved to real listings a customer can actually open. A promotions table
  with its own prices would be a second source of truth about what things cost,
  and the first thing to go stale.

  `savingPercent` is indicative, for the same reason §9.27's price ladder is:
  actual discounts depend on supplier agreements and marketplace economics,
  neither of which the platform holds yet.
*/

export const offerSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(4),
  description: z.string().trim().min(10),
  category: productCategorySchema,
  /** Null when the offer runs everywhere. */
  region: regionSchema.nullable().default(null),
  /**
   * The lowest membership that can take it up. Null is a public offer — §9.2
   * requires some to be visible before anyone signs up, because an offers rail
   * that is entirely locked teaches a first-time visitor to ignore it.
   */
  minimumTier: membershipTierSchema.nullable().default(null),
  /** Indicative saving against standard marketplace terms. */
  savingPercent: z.number().min(1).max(40),
  endsAt: z.string(),
});

export type Offer = z.infer<typeof offerSchema>;

/** An offer with the catalogue figures that prove it points at something real. */
export type OfferWithReach = {
  offer: Offer;
  /** Live listings the offer resolves to right now. */
  listings: number;
  /** Cheapest entry price among them, for the card's "from" figure. */
  fromKsh: number | null;
};

export function isPublicOffer(offer: Offer) {
  return offer.minimumTier === null;
}
