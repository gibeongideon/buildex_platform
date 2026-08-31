import { z } from "zod";

/*
  Customer membership — Chapter 9 §9.7–§9.13.

  "Membership is an access and value architecture, not simply a subscription."
  The tier sets baseline rights; the Trust Engine decides eligibility for
  anything beyond them:

      ACCESS = MEMBERSHIP + TRUST + ELIGIBILITY

  Not to be confused with `lib/schemas/subscription.ts`, which is the
  *supplier* side — what a manufacturer pays to sell here. This file is what a
  customer pays to buy here. They are different ladders with different names on
  purpose, so a screen can never show one where it means the other.

  ---------------------------------------------------------------------------
  ACCESS_MATRIX below is §9.12's table, and it is the single source for three
  readers: the public pricing page, the in-app upgrade screen, and `can()` in
  `lib/rules/access.ts`. That matters more than it looks. The classic failure
  in a tiered product is a pricing page that promises what the gate does not
  grant, which happens the moment the marketing table and the entitlement check
  are two lists. Here a row *is* the entitlement.
  ---------------------------------------------------------------------------

  Prices and token allocations are indicative. §9.12: "Package names, prices,
  token allocations and final entitlements are proposed for strategic and
  system-design purposes and must be commercially validated before launch."
*/

export const MEMBERSHIP_TIERS = ["free", "member", "pro", "business"] as const;
export const membershipTierSchema = z.enum(MEMBERSHIP_TIERS);
export type MembershipTier = z.infer<typeof membershipTierSchema>;

export const membershipCycleSchema = z.enum(["monthly", "annual"]);
export type MembershipCycle = z.infer<typeof membershipCycleSchema>;

export type MembershipMeta = {
  key: MembershipTier;
  /** The chapter's own names. Kept uppercase-free here; the UI does the casing. */
  name: string;
  tagline: string;
  purpose: string;
  primaryUsers: string;
  monthly: number;
  annual: number;
  /** Tokens granted each month at this tier — §9.13. */
  monthlyTokens: number;
  recommended?: boolean;
};

export const MEMBERSHIPS: MembershipMeta[] = [
  {
    key: "free",
    name: "Build Free",
    tagline: "Search the whole marketplace and see what things cost.",
    purpose: "Discovery and entry.",
    primaryUsers: "New customers, homeowners, occasional users.",
    monthly: 0,
    annual: 0,
    monthlyTokens: 0,
  },
  {
    key: "member",
    name: "Build Member",
    tagline: "Member pricing, supplier contacts and deals worth more than the fee.",
    purpose: "Regular shopping and better access.",
    primaryUsers: "Homeowners, fundis, small contractors.",
    monthly: 300,
    annual: 3_000,
    monthlyTokens: 10,
  },
  {
    key: "pro",
    name: "Build Pro",
    tagline: "Compare properly, quote widely and see where prices are going.",
    purpose: "Advanced procurement and intelligence.",
    primaryUsers: "Contractors, designers, developers, professional buyers.",
    monthly: 1_500,
    annual: 15_000,
    monthlyTokens: 40,
    recommended: true,
  },
  {
    key: "business",
    name: "Build Business",
    tagline: "Your whole team buying under one verified account, with the analytics.",
    purpose: "Commercial procurement and business services.",
    primaryUsers: "Hardware businesses, contractors, developers, institutions.",
    monthly: 6_000,
    annual: 60_000,
    monthlyTokens: 150,
  },
];

/**
 * One row of §9.12.
 *
 * `key` is the capability the gate asks about; `label` is what the comparison
 * table prints. A value is `true` (included), `false` (not at this tier), or a
 * string that qualifies the inclusion — `"Token"` meaning it is available but
 * costs one, anything else meaning included with a stated limit.
 */
export type AccessRow = {
  key: string;
  label: string;
  /** Grouping for the comparison table, so 28 rows read as five sections. */
  group: AccessGroup;
  free: boolean | string;
  member: boolean | string;
  pro: boolean | string;
  business: boolean | string;
};

export const ACCESS_GROUPS = [
  "Account & discovery",
  "Information",
  "Buying",
  "Money",
  "Trust & business",
] as const;

export type AccessGroup = (typeof ACCESS_GROUPS)[number];

/** The literal that marks a row as purchasable with a membership token. */
export const TOKEN_VALUE = "Token";

export const ACCESS_MATRIX: AccessRow[] = [
  // --- Account & discovery: free, and it stays free (§9.40) ---------------
  {
    key: "account",
    label: "Account with email, phone and address",
    group: "Account & discovery",
    free: true,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "basic_search",
    label: "Product, supplier and category search",
    group: "Account & discovery",
    free: true,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "location_search",
    label: "Search by location and nearby suppliers",
    group: "Account & discovery",
    free: true,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "public_offers",
    label: "Selected public offers",
    group: "Account & discovery",
    free: true,
    member: true,
    pro: true,
    business: true,
  },

  // --- Information: this is what the chapter actually monetises -----------
  {
    key: "product_intelligence",
    label: "Detailed product intelligence",
    group: "Information",
    free: TOKEN_VALUE,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "supplier_intelligence",
    label: "Detailed supplier intelligence",
    group: "Information",
    free: TOKEN_VALUE,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "supplier_contact",
    label: "Supplier contact and connection",
    group: "Information",
    free: TOKEN_VALUE,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "supplier_comparison",
    label: "Supplier comparison",
    group: "Information",
    free: "Up to 2",
    member: true,
    pro: "Advanced",
    business: "Advanced",
  },
  {
    key: "price_comparison",
    label: "Price comparison",
    group: "Information",
    free: "Up to 2",
    member: true,
    pro: "Advanced",
    business: "Advanced",
  },
  {
    key: "market_price_intelligence",
    label: "Market price intelligence",
    group: "Information",
    free: false,
    member: "Basic",
    pro: "Advanced",
    business: "Advanced",
  },
  {
    key: "availability_intelligence",
    label: "Availability and delivery intelligence",
    group: "Information",
    free: "Basic",
    member: true,
    pro: "Advanced",
    business: "Advanced",
  },
  {
    key: "alerts",
    label: "Price and availability alerts",
    group: "Information",
    free: false,
    member: false,
    pro: true,
    business: true,
  },

  // --- Buying -------------------------------------------------------------
  {
    key: "quotation_requests",
    label: "Quotation requests",
    group: "Buying",
    free: "3 a month",
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "multiple_quotations",
    label: "Multiple quotations at once",
    group: "Buying",
    free: false,
    member: "Up to 3 suppliers",
    pro: true,
    business: true,
  },
  {
    key: "bulk_purchasing",
    label: "Bulk purchasing and volume offers",
    group: "Buying",
    free: false,
    member: false,
    pro: true,
    business: true,
  },
  {
    key: "project_procurement",
    label: "Project shopping lists and repeat ordering",
    group: "Buying",
    free: false,
    member: false,
    pro: true,
    business: true,
  },
  {
    key: "member_deals",
    label: "Member-only deals",
    group: "Buying",
    free: false,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "member_pricing",
    label: "Better member pricing",
    group: "Buying",
    free: false,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "volume_discounts",
    label: "Volume discounts",
    group: "Buying",
    free: false,
    member: false,
    pro: true,
    business: true,
  },
  {
    key: "negotiated_pricing",
    label: "Negotiated supplier pricing",
    group: "Buying",
    free: false,
    member: false,
    pro: "Limited",
    business: true,
  },

  // --- Money --------------------------------------------------------------
  {
    key: "wallet",
    label: "Buildex Wallet",
    group: "Money",
    free: true,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "buy_tokens",
    label: "Buy membership tokens",
    group: "Money",
    free: true,
    member: true,
    pro: true,
    business: true,
  },
  {
    key: "token_allocation",
    label: "Monthly token allocation",
    group: "Money",
    free: false,
    member: "10 a month",
    pro: "40 a month",
    business: "150 a month",
  },

  // --- Trust & business ---------------------------------------------------
  {
    key: "trust_profile",
    label: "Buildex Trust Profile",
    group: "Trust & business",
    free: "Basic",
    member: "Enhanced",
    pro: "Advanced",
    business: "Advanced",
  },
  {
    key: "business_verification",
    label: "Business identity verification",
    group: "Trust & business",
    free: false,
    member: false,
    pro: "Optional",
    business: true,
  },
  {
    key: "authorized_users",
    label: "Multiple authorized users and permissions",
    group: "Trust & business",
    free: false,
    member: false,
    pro: false,
    business: true,
  },
  {
    key: "business_passport",
    label: "Business Passport",
    group: "Trust & business",
    free: false,
    member: "Building",
    pro: true,
    business: true,
  },
  {
    key: "procurement_analytics",
    label: "Procurement and spend analytics",
    group: "Trust & business",
    free: false,
    member: false,
    pro: "Basic",
    business: "Advanced",
  },
  {
    key: "credit_readiness",
    label: "Credit-readiness",
    group: "Trust & business",
    free: false,
    member: "Building",
    pro: "Developing",
    business: "Advanced",
  },
  {
    key: "support",
    label: "Support",
    group: "Trust & business",
    free: "Help centre",
    member: "Email",
    pro: "Priority",
    business: "Dedicated",
  },
];

/** Every capability the gate can be asked about. */
export type Capability = (typeof ACCESS_MATRIX)[number]["key"];

/**
 * `ACCESS_MATRIX` in the shape the shared plan components read.
 *
 * The comparison table a customer sees while choosing a membership is
 * therefore literally the entitlement table the gate consults — a mapping, not
 * a retelling.
 */
export const MEMBERSHIP_PLAN_FEATURES = ACCESS_MATRIX.map((row) => ({
  label: row.label,
  group: row.group as string,
  values: {
    free: row.free,
    member: row.member,
    pro: row.pro,
    business: row.business,
  },
}));

export function accessRow(key: string): AccessRow {
  const row = ACCESS_MATRIX.find((r) => r.key === key);
  if (!row) throw new Error(`Unknown capability: ${key}`);
  return row;
}

/** What one tier gets for one capability. */
export function accessValue(key: string, tier: MembershipTier) {
  return accessRow(key)[tier];
}

export function membershipMeta(key: MembershipTier): MembershipMeta {
  const meta = MEMBERSHIPS.find((m) => m.key === key);
  if (!meta) throw new Error(`Unknown membership tier: ${key}`);
  return meta;
}

export function membershipPrice(key: MembershipTier, cycle: MembershipCycle) {
  const meta = membershipMeta(key);
  return cycle === "annual" ? meta.annual : meta.monthly;
}

/** Months free when paying annually — drives the "save 2 months" badge. */
export function annualSavingMonths(key: MembershipTier) {
  const meta = membershipMeta(key);
  if (meta.monthly === 0) return 0;
  return Math.round((meta.monthly * 12 - meta.annual) / meta.monthly);
}

export function membershipIndex(key: MembershipTier) {
  return MEMBERSHIP_TIERS.indexOf(key);
}

/** Is `tier` at least `required`? */
export function meetsTier(tier: MembershipTier, required: MembershipTier) {
  return membershipIndex(tier) >= membershipIndex(required);
}

/**
 * The headline benefits shown on a tier card.
 *
 * Derived from `ACCESS_MATRIX` rather than written out again: what a card
 * promises is then, by construction, what the gate will grant. Picks the rows
 * this tier has that the one below it does not — which is exactly the answer
 * to "what does upgrading get me".
 */
export function upgradeGains(key: MembershipTier): string[] {
  const index = membershipIndex(key);
  if (index === 0) {
    return ACCESS_MATRIX.filter((row) => row.free === true).map((row) => row.label);
  }
  const below = MEMBERSHIP_TIERS[index - 1];
  return ACCESS_MATRIX.filter((row) => {
    const here = row[key];
    const there = row[below];
    if (here === false) return false;
    return here !== there;
  }).map((row) => (typeof row[key] === "string" ? `${row.label} — ${row[key]}` : row.label));
}
