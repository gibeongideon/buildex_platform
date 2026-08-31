import type { Offer } from "@/lib/schemas/offer";

/*
  Seeded offers.

  Two public and five member-gated, which is roughly the ratio §9.2 and §9.40
  imply: enough visible before sign-up that the rail is worth reading, enough
  behind membership that upgrading has a concrete answer to "what do I get".

  Every one names a category the catalogue actually stocks, so the repository
  can resolve it to live listings and print a real "from" price beside it. An
  offer that resolved to nothing would be the marketplace advertising a shelf
  it does not have.
*/

function inDays(days: number) {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

export function seedOffers(): Offer[] {
  return [
    {
      id: "ofr_cement_public",
      title: "Cement, priced for the whole slab",
      description:
        "Quantity bands across every listed mill. Open to anyone with a Buildex account.",
      category: "Cement & Concrete",
      region: null,
      minimumTier: null,
      savingPercent: 4,
      endsAt: inDays(21),
    },
    {
      id: "ofr_roofing_public",
      title: "Roofing sheets before the rains",
      description:
        "Gauge, cover width and lead time side by side, from suppliers who deliver to your region.",
      category: "Roofing",
      region: null,
      minimumTier: null,
      savingPercent: 5,
      endsAt: inDays(30),
    },
    {
      id: "ofr_steel_member",
      title: "Member price on reinforcement steel",
      description:
        "Negotiated member rates on Y8 to Y20 bars. Applied at quotation, not at checkout.",
      category: "Steel & Reinforcement",
      region: null,
      minimumTier: "member",
      savingPercent: 6,
      endsAt: inDays(14),
    },
    {
      id: "ofr_paint_member",
      title: "Paints and coatings, member rate",
      description: "Trade pricing on emulsion, gloss and undercoat across listed brands.",
      category: "Paints & Coatings",
      region: null,
      minimumTier: "member",
      savingPercent: 8,
      endsAt: inDays(24),
    },
    {
      id: "ofr_timber_pro",
      title: "Board volume rates for the Rift",
      description:
        "MDF, plywood and blockboard at volume pricing, for buyers taking delivery in the Rift Valley.",
      category: "Timber & Boards",
      region: "Rift Valley",
      minimumTier: "pro",
      savingPercent: 11,
      endsAt: inDays(18),
    },
    {
      id: "ofr_plumbing_pro",
      title: "Plumbing packages priced by the unit count",
      description:
        "Whole-development pricing on pipe, fittings and sanitaryware for multi-unit sites.",
      category: "Plumbing & Sanitaryware",
      region: null,
      minimumTier: "pro",
      savingPercent: 9,
      endsAt: inDays(35),
    },
    {
      id: "ofr_tiles_business",
      title: "Tile and flooring terms for stockists",
      description:
        "Container-scale pricing with negotiated payment terms, for accounts buying to resell.",
      category: "Tiles & Flooring",
      region: null,
      minimumTier: "business",
      savingPercent: 14,
      endsAt: inDays(45),
    },
  ];
}
