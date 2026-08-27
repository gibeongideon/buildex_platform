import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import { capacityBandLabel } from "@/lib/schemas/common";

/*
  What a buyer can filter a supplier on, and the credentials worth showing beside
  one.

  The reference marketplace puts a row of capability chips over its factory list
  — low MOQ, certified, response time, customisation — because a buyer shopping
  by supplier is really asking "can this one actually serve me". Ours are the
  same idea over the fields we genuinely hold: certifications, the supplier's own
  response record, delivery reach, payment terms and real minimum order
  quantities.

  Every predicate reads existing data. Nothing here is a marketing label a
  supplier typed in, and there is deliberately no rating: the platform has no
  reviews, and inventing stars is exactly the kind of thing that makes a
  directory untrustworthy.
*/

export type SupplierCapability = {
  key: string;
  label: string;
  /** Shown on the chip row as a short explanation of what the filter means. */
  hint: string;
  matches: (manufacturer: Manufacturer, products: Product[]) => boolean;
};

/** Lowest minimum-order quantity across a supplier's listings. */
export function lowestMoq(products: Product[]) {
  if (products.length === 0) return null;
  return products.reduce((min, p) => Math.min(min, p.moq), Infinity);
}

export const SUPPLIER_CAPABILITIES: SupplierCapability[] = [
  {
    key: "kebs",
    label: "KEBS certified",
    hint: "Holds a KEBS Standardisation Mark",
    matches: (m) =>
      m.storefront.certifications.some((c) => c.toUpperCase().includes("KEBS")),
  },
  {
    key: "iso",
    label: "ISO 9001",
    hint: "Certified quality management system",
    matches: (m) => m.storefront.certifications.some((c) => c.includes("ISO 9001")),
  },
  {
    key: "fast",
    label: "Replies within 6h",
    hint: "Advertises a response time of 6 hours or better",
    matches: (m) =>
      m.storefront.avgResponseHours > 0 && m.storefront.avgResponseHours <= 6,
  },
  {
    key: "reliable",
    label: "Answers 90%+ of enquiries",
    hint: "Response rate on their own storefront",
    matches: (m) => m.storefront.responseRatePercent >= 90,
  },
  {
    key: "nationwide",
    label: "Delivers nationwide",
    hint: "Covers four or more of the eight regions",
    matches: (m) => m.distributionRegions.length >= 4,
  },
  {
    key: "credit",
    label: "Offers credit terms",
    hint: "Accepts approved accounts on credit, not just cash",
    matches: (m) =>
      m.storefront.paymentTerms.some((t) => t.toLowerCase().includes("credit")),
  },
  {
    key: "low_moq",
    label: "Low minimum order",
    hint: "Sells from 20 units or fewer on at least one listing",
    matches: (_m, products) => {
      const moq = lowestMoq(products);
      return moq !== null && moq <= 20;
    },
  },
  {
    key: "established",
    label: "Trading 8+ years",
    hint: "Established long enough to have a track record",
    matches: (m) => new Date().getFullYear() - m.yearEstablished >= 8,
  },
];

export function capabilityMeta(key: string) {
  const meta = SUPPLIER_CAPABILITIES.find((c) => c.key === key);
  if (!meta) throw new Error(`Unknown supplier capability: ${key}`);
  return meta;
}

/**
 * The capability labels true of one supplier, in the order they are declared.
 *
 * Used both to filter the directory and to print the "factory capabilities"
 * bullets on a supplier's row, so a chip a buyer filtered on is the same claim
 * they then see on the card.
 */
export function capabilitiesOf(manufacturer: Manufacturer, products: Product[]) {
  return SUPPLIER_CAPABILITIES.filter((c) => c.matches(manufacturer, products));
}

/** Headline credentials, formatted the way the supplier row prints them. */
export function supplierCredentials(manufacturer: Manufacturer, products: Product[]) {
  const years = new Date().getFullYear() - manufacturer.yearEstablished;
  const moq = lowestMoq(products);
  return {
    years,
    yearsLabel: `${years} yr${years === 1 ? "" : "s"}`,
    capacityLabel: capacityBandLabel(manufacturer.capacityBand),
    regionsLabel:
      manufacturer.distributionRegions.length >= 8
        ? "All 8 regions"
        : `${manufacturer.distributionRegions.length} region${manufacturer.distributionRegions.length === 1 ? "" : "s"}`,
    moq,
    ordersFulfilled: manufacturer.storefront.ordersFulfilled,
  };
}
