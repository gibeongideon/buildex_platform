import { z } from "zod";

/*
  Buildex Connect subscription packages.

  Requirements §8.2. Feature wording is taken from the briefing document; the
  KSh prices below are placeholders pending the "Define manufacturer packages
  and pricing" action (§13, owner: Management/Commercial). They are marked
  indicative in the UI so nobody demos them as approved commercials.
*/

export const PACKAGE_KEYS = ["free", "basic", "premium", "vip"] as const;
export const packageKeySchema = z.enum(PACKAGE_KEYS);
export type PackageKey = z.infer<typeof packageKeySchema>;

export const billingCycleSchema = z.enum(["monthly", "annual"]);
export type BillingCycle = z.infer<typeof billingCycleSchema>;

export type PackageFeature = {
  label: string;
  /** true = included, false = not included, string = qualified inclusion. */
  free: boolean | string;
  basic: boolean | string;
  premium: boolean | string;
  vip: boolean | string;
};

export const SUBSCRIPTION_PACKAGES = [
  {
    key: "free" as const,
    name: "Free",
    tagline: "Get listed and start showing up in searches.",
    monthly: 0,
    annual: 0,
  },
  {
    key: "basic" as const,
    name: "Basic",
    tagline: "See which hardware shops are looking at your products.",
    monthly: 4_500,
    annual: 45_000,
  },
  {
    key: "premium" as const,
    name: "Premium",
    tagline: "Target regions, read the market and rank higher.",
    monthly: 18_000,
    annual: 180_000,
    recommended: true,
  },
  {
    key: "vip" as const,
    name: "VIP / Dedicated",
    tagline: "A Buildex account manager actively sells your range.",
    monthly: 65_000,
    annual: 650_000,
  },
];

export const PACKAGE_FEATURES: PackageFeature[] = [
  {
    label: "Company profile & product listings",
    free: "Up to 10 products",
    basic: "Up to 50 products",
    premium: "Unlimited",
    vip: "Unlimited",
  },
  { label: "Pricing & MOQ visible to hardware shops", free: true, basic: true, premium: true, vip: true },
  { label: "Enquiries from hardware shops", free: true, basic: true, premium: true, vip: true },
  { label: "See who viewed your products", free: false, basic: true, premium: true, vip: true },
  { label: "Product view & enquiry analytics", free: false, basic: "Basic", premium: "Full", vip: "Full" },
  { label: "Regional targeting campaigns", free: false, basic: false, premium: true, vip: true },
  { label: "Boosted search visibility", free: false, basic: false, premium: true, vip: "Top placement" },
  { label: "Regional market data & demand insights", free: false, basic: false, premium: true, vip: true },
  { label: "Verified manufacturer badge", free: false, basic: true, premium: true, vip: true },
  { label: "Dedicated Buildex account manager", free: false, basic: false, premium: false, vip: true },
  { label: "Active outbound selling to the hardware network", free: false, basic: false, premium: false, vip: true },
  { label: "Support", free: "Email", basic: "Email", premium: "Priority", vip: "Named contact" },
];

/**
 * `PACKAGE_FEATURES` in the shape the shared plan components read.
 *
 * A mapping rather than a second list: the features are still declared once
 * above, and `PlanComparison` stays ignorant of whether it is comparing
 * supplier packages or customer memberships.
 */
export const PACKAGE_PLAN_FEATURES = PACKAGE_FEATURES.map((feature) => ({
  label: feature.label,
  values: {
    free: feature.free,
    basic: feature.basic,
    premium: feature.premium,
    vip: feature.vip,
  },
}));

export const subscriptionSchema = z.object({
  package: packageKeySchema,
  billingCycle: billingCycleSchema,
  startedAt: z.string(),
  /** null on Free, which never renews. */
  renewsAt: z.string().nullable().default(null),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export function packageMeta(key: PackageKey) {
  const meta = SUBSCRIPTION_PACKAGES.find((p) => p.key === key);
  if (!meta) throw new Error(`Unknown package: ${key}`);
  return meta;
}

export function packagePrice(key: PackageKey, cycle: BillingCycle) {
  const meta = packageMeta(key);
  return cycle === "annual" ? meta.annual : meta.monthly;
}

/** Months free when paying annually — drives the "save 2 months" badge. */
export function annualSavingMonths(key: PackageKey) {
  const meta = packageMeta(key);
  if (meta.monthly === 0) return 0;
  return Math.round((meta.monthly * 12 - meta.annual) / meta.monthly);
}

export function hasRegionalTargeting(key: PackageKey) {
  return key === "premium" || key === "vip";
}

/** Product listing cap by package; null means unlimited. */
export function productLimit(key: PackageKey): number | null {
  if (key === "free") return 10;
  if (key === "basic") return 50;
  return null;
}
