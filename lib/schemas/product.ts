import { z } from "zod";
import { productCategorySchema, regionSchema } from "./common";

/*
  Manufacturer product listing.

  Wholesale construction supply is priced in quantity bands, not at a single
  unit price, so the band table is part of the core record rather than an
  add-on. Hardware shops compare on landed price at *their* order size, which
  is why the marketplace preview always shows the band, MOQ and lead time
  together.
*/

export const PRODUCT_UNITS = [
  "bag",
  "tonne",
  "piece",
  "litre",
  "square metre",
  "linear metre",
  "sheet",
  "roll",
  "bundle",
  "box",
] as const;

export const productUnitSchema = z.enum(PRODUCT_UNITS);

export const priceBandSchema = z.object({
  minQty: z.number().int().positive("Minimum quantity must be at least 1"),
  /** null = "and above", which must be the final band. */
  maxQty: z.number().int().positive().nullable(),
  unitPrice: z.number().positive("Enter a price above zero"),
});

export type PriceBand = z.infer<typeof priceBandSchema>;

export const PRODUCT_STATUSES = ["draft", "active", "out_of_stock", "archived"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

/**
 * The fields a manufacturer actually fills in.
 *
 * Kept separate from the stored record so the create form and the persisted
 * product validate against exactly the same rules — including the price-band
 * refinement below, which is where most of the real logic lives.
 */
export const listingFieldsSchema = z.object({
  name: z.string().trim().min(3, "Give the product a descriptive name"),
  category: productCategorySchema,
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "SKU is required")
    .max(24, "Keep SKUs under 24 characters"),
  // No .default() here: it would make the schema's input type diverge from its
  // output type and break the react-hook-form resolver generics. The create
  // form supplies "" through defaultValues instead.
  description: z.string().trim().max(600),
  unit: productUnitSchema,
  /** e.g. "50 kg" for a cement bag, "20 L" for a paint drum. */
  packSize: z.string().trim().max(40),
  priceBands: z
    .array(priceBandSchema)
    .min(1, "Add at least one price band")
    .max(5, "Five bands is the practical maximum"),
  moq: z.number().int().positive("Minimum order quantity must be at least 1"),
  leadTimeDays: z
    .number()
    .int()
    .min(0, "Lead time cannot be negative")
    .max(120, "Lead times over 120 days need an account manager"),
  availableRegions: z.array(regionSchema).min(1, "Select at least one region"),
});

export type ListingFields = z.infer<typeof listingFieldsSchema>;

/**
 * Price bands have to tile the whole quantity range without gaps, overlaps or
 * inversions. A gap means an order quantity with no price; an inversion means
 * buying more costs more per unit, which no wholesale buyer will accept.
 */
function refineBands(
  value: { priceBands: PriceBand[]; moq: number },
  ctx: z.RefinementCtx,
) {
  const bands = value.priceBands;

  bands.forEach((band, index) => {
    if (band.maxQty !== null && band.maxQty < band.minQty) {
      ctx.addIssue({
        code: "custom",
        path: ["priceBands", index, "maxQty"],
        message: "Band maximum must be at or above its minimum",
      });
    }
    // Only the last band may be open-ended, otherwise quantities above it
    // would have no price at all.
    if (band.maxQty === null && index !== bands.length - 1) {
      ctx.addIssue({
        code: "custom",
        path: ["priceBands", index, "maxQty"],
        message: "Only the final band can be open-ended",
      });
    }
    if (index > 0) {
      const previous = bands[index - 1];
      if (previous.maxQty !== null && band.minQty !== previous.maxQty + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["priceBands", index, "minQty"],
          message: `Should start at ${previous.maxQty + 1} so no quantity is left unpriced`,
        });
      }
      if (band.unitPrice > previous.unitPrice) {
        ctx.addIssue({
          code: "custom",
          path: ["priceBands", index, "unitPrice"],
          message: "Larger quantities should not cost more per unit",
        });
      }
    }
  });

  if (bands[0] && value.moq < bands[0].minQty) {
    ctx.addIssue({
      code: "custom",
      path: ["moq"],
      message: `MOQ cannot be below the first price band (${bands[0].minQty})`,
    });
  }
}

/** What the create-listing form validates against. */
export const listingDraftSchema = listingFieldsSchema.superRefine(refineBands);

/** The stored record. */
export const productSchema = listingFieldsSchema
  .extend({
    id: z.string(),
    manufacturerId: z.string(),
    imageUrls: z.array(z.string()).default([]),
    status: productStatusSchema.default("draft"),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine(refineBands);

export type Product = z.infer<typeof productSchema>;

/** The unit price a shop actually pays at a given order quantity. */
export function priceAtQuantity(bands: PriceBand[], quantity: number): number | null {
  const band = bands.find(
    (b) => quantity >= b.minQty && (b.maxQty === null || quantity <= b.maxQty),
  );
  return band?.unitPrice ?? null;
}

export function priceRange(bands: PriceBand[]) {
  const prices = bands.map((b) => b.unitPrice);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatBandRange(band: PriceBand, unit: string) {
  const plural = band.maxQty === 1 ? unit : `${unit}s`;
  if (band.maxQty === null) return `${band.minQty}+ ${plural}`;
  if (band.minQty === band.maxQty) return `${band.minQty} ${plural}`;
  return `${band.minQty}–${band.maxQty} ${plural}`;
}

export function formatLeadTime(days: number) {
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  if (days <= 7) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"}`;
}
