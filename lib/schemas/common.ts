import { z } from "zod";

/*
  Shared primitives and reference data.

  These schemas are the contract for the future Postgres/Drizzle tables. Field
  names, enum members and validation rules defined here are what the backend
  should implement — the mockup exists partly to settle them.
*/

/** Safaricom/Airtel format as entered by Kenyan users: +254 7xx / 1xx. */
export const kenyanPhone = z
  .string()
  .trim()
  .regex(/^\+254[17]\d{8}$/, "Enter a valid Kenyan number, e.g. +254712345678");

/** KRA PIN: letter, 9 digits, letter — e.g. P051234567M. */
export const kraPin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]\d{9}[A-Z]$/, "KRA PIN looks like P051234567M");

/** Business Registration Service number, e.g. PVT-7XKLM9Y or CPR/2019/123456. */
export const brsNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^(PVT-[A-Z0-9]{6,9}|CPR\/\d{4}\/\d{4,7}|BN-[A-Z0-9]{6,9})$/,
    "Enter a valid BRS number, e.g. PVT-7XKLM9Y or CPR/2019/123456",
  );

/** Kenyan national ID: 7 or 8 digits. */
export const nationalId = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, "National ID is 7 or 8 digits");

export const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const REGIONS = [
  "Nairobi Metro",
  "Central",
  "Coast",
  "Eastern",
  "North Eastern",
  "Nyanza",
  "Rift Valley",
  "Western",
] as const;

export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

/** All 47 counties, grouped so regional targeting can roll up cleanly. */
export const COUNTIES: { name: string; region: Region }[] = [
  { name: "Nairobi", region: "Nairobi Metro" },
  { name: "Kiambu", region: "Nairobi Metro" },
  { name: "Machakos", region: "Nairobi Metro" },
  { name: "Kajiado", region: "Nairobi Metro" },
  { name: "Murang'a", region: "Central" },
  { name: "Nyeri", region: "Central" },
  { name: "Kirinyaga", region: "Central" },
  { name: "Nyandarua", region: "Central" },
  { name: "Mombasa", region: "Coast" },
  { name: "Kilifi", region: "Coast" },
  { name: "Kwale", region: "Coast" },
  { name: "Lamu", region: "Coast" },
  { name: "Taita Taveta", region: "Coast" },
  { name: "Tana River", region: "Coast" },
  { name: "Embu", region: "Eastern" },
  { name: "Kitui", region: "Eastern" },
  { name: "Makueni", region: "Eastern" },
  { name: "Meru", region: "Eastern" },
  { name: "Tharaka Nithi", region: "Eastern" },
  { name: "Isiolo", region: "Eastern" },
  { name: "Marsabit", region: "Eastern" },
  { name: "Garissa", region: "North Eastern" },
  { name: "Wajir", region: "North Eastern" },
  { name: "Mandera", region: "North Eastern" },
  { name: "Kisumu", region: "Nyanza" },
  { name: "Siaya", region: "Nyanza" },
  { name: "Homa Bay", region: "Nyanza" },
  { name: "Migori", region: "Nyanza" },
  { name: "Kisii", region: "Nyanza" },
  { name: "Nyamira", region: "Nyanza" },
  { name: "Nakuru", region: "Rift Valley" },
  { name: "Uasin Gishu", region: "Rift Valley" },
  { name: "Kericho", region: "Rift Valley" },
  { name: "Bomet", region: "Rift Valley" },
  { name: "Nandi", region: "Rift Valley" },
  { name: "Baringo", region: "Rift Valley" },
  { name: "Laikipia", region: "Rift Valley" },
  { name: "Narok", region: "Rift Valley" },
  { name: "Trans Nzoia", region: "Rift Valley" },
  { name: "Elgeyo Marakwet", region: "Rift Valley" },
  { name: "West Pokot", region: "Rift Valley" },
  { name: "Samburu", region: "Rift Valley" },
  { name: "Turkana", region: "Rift Valley" },
  { name: "Kakamega", region: "Western" },
  { name: "Bungoma", region: "Western" },
  { name: "Vihiga", region: "Western" },
  { name: "Busia", region: "Western" },
];

export const COUNTY_NAMES = COUNTIES.map((c) => c.name);
export const countySchema = z.string().refine((v) => COUNTY_NAMES.includes(v), {
  message: "Select a county",
});

export function regionForCounty(county: string): Region | undefined {
  return COUNTIES.find((c) => c.name === county)?.region;
}

/** Construction-supply categories carried by Buildex and Buildex Connect. */
export const PRODUCT_CATEGORIES = [
  "Cement & Concrete",
  "Steel & Reinforcement",
  "Timber & Boards",
  "Paints & Coatings",
  "Roofing",
  "Plumbing & Sanitaryware",
  "Electrical",
  "Tiles & Flooring",
  "Doors & Windows",
  "Hardware & Fasteners",
  "Adhesives & Sealants",
  "Insulation",
  "Glass & Glazing",
  "Interior Finishes",
] as const;

export const productCategorySchema = z.enum(PRODUCT_CATEGORIES);
export type ProductCategory = z.infer<typeof productCategorySchema>;

/**
 * Monthly output value band. Value-based rather than unit-based because units
 * are not comparable across cement, paint and timber.
 */
export const CAPACITY_BANDS = [
  { value: "under_5m", label: "Under KSh 5M / month" },
  { value: "5m_20m", label: "KSh 5M – 20M / month" },
  { value: "20m_100m", label: "KSh 20M – 100M / month" },
  { value: "over_100m", label: "Over KSh 100M / month" },
] as const;

export const capacityBandSchema = z.enum(
  CAPACITY_BANDS.map((b) => b.value) as [string, ...string[]],
);

export function capacityBandLabel(value: string) {
  return CAPACITY_BANDS.find((b) => b.value === value)?.label ?? value;
}
