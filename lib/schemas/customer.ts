import { z } from "zod";
import {
  brsNumber,
  countySchema,
  email,
  kenyanPhone,
  kraPin,
  regionSchema,
} from "./common";
import { membershipTierSchema } from "./membership";

/*
  The customer — the buying side of Buildex Connect.

  Chapter 9 §9.4: "An account is not merely a login. It is the customer's
  progressively verified digital identity within the Buildex ecosystem."

  One record covers everyone who buys: a homeowner tiling a bathroom, a fundi,
  a contractor, a hardware shop, a developer, an institution. The chapter is
  explicit that customer *type* is a field on the account rather than a
  different product — personalisation and commercial classification hang off
  it, and a hardware shop is a customer with business verification and a
  business membership, not a separate species of user.

  That is why there is no separate hardware-shop entity. Two account types
  would mean two registrations, two wallets and two dashboards to keep in
  step, and the first thing to drift would be the entitlements.
*/

// ---------------------------------------------------------------------------
// Customer type — §9.4
// ---------------------------------------------------------------------------

export const CUSTOMER_TYPES = [
  "homeowner",
  "fundi",
  "contractor",
  "hardware_shop",
  "developer",
  "institution",
] as const;

export const customerTypeSchema = z.enum(CUSTOMER_TYPES);
export type CustomerType = z.infer<typeof customerTypeSchema>;

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  homeowner: "Homeowner",
  fundi: "Fundi / artisan",
  contractor: "Contractor",
  hardware_shop: "Hardware shop",
  developer: "Developer",
  institution: "Institution",
};

export const CUSTOMER_TYPE_HINTS: Record<CustomerType, string> = {
  homeowner: "Building or renovating your own home.",
  fundi: "A tradesperson buying for the jobs you are working on.",
  contractor: "Running sites and buying against project requirements.",
  hardware_shop: "Stocking a shop and reselling to your own customers.",
  developer: "Multi-unit or commercial development.",
  institution: "A school, county, church, SACCO or company buying centrally.",
};

/**
 * Types that trade as a business.
 *
 * Business information is progressive — §9.4 marks it "required for business
 * tiers" rather than mandatory for everyone. Asking a homeowner for a KRA PIN
 * to buy two bags of cement is exactly the friction the chapter warns against.
 */
export const BUSINESS_CUSTOMER_TYPES: CustomerType[] = [
  "hardware_shop",
  "contractor",
  "developer",
  "institution",
];

export function isBusinessType(type: CustomerType) {
  return BUSINESS_CUSTOMER_TYPES.includes(type);
}

// ---------------------------------------------------------------------------
// Verification levels — §9.6
// ---------------------------------------------------------------------------

/*
  Four levels, each earned rather than chosen. Note the deliberate distinction
  the chapter draws in §9.42: "Membership does not equal trust; trust is
  earned." A customer can buy BUILD BUSINESS on day one and still be
  `registered` — the level below reflects what has been *verified*, and the
  access gate reads both.
*/
export const VERIFICATION_LEVELS = [
  "registered",
  "verified_member",
  "trusted_business",
  "strategic",
] as const;

export const verificationLevelSchema = z.enum(VERIFICATION_LEVELS);
export type VerificationLevel = z.infer<typeof verificationLevelSchema>;

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  registered: "Registered",
  verified_member: "Verified member",
  trusted_business: "Trusted business",
  strategic: "Strategic account",
};

export const VERIFICATION_LEVEL_TONE: Record<
  VerificationLevel,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  registered: "neutral",
  verified_member: "info",
  trusted_business: "success",
  strategic: "success",
};

export const VERIFICATION_LEVEL_DESCRIPTIONS: Record<VerificationLevel, string> = {
  registered: "Email and phone confirmed, with a basic profile and location.",
  verified_member: "Customer or business information verified beyond sign-up.",
  trusted_business:
    "Meaningful commercial history on the platform alongside deeper verification.",
  strategic: "Enhanced due diligence and a contractual relationship with Buildex.",
};

/** What each level opens up. §9.6's "Access" column. */
export const VERIFICATION_LEVEL_ACCESS: Record<VerificationLevel, string> = {
  registered: "Basic search and discovery.",
  verified_member: "Expanded supplier information, member deals and improved access.",
  trusted_business: "Advanced commercial benefits and additional ecosystem eligibility.",
  strategic: "Negotiated enterprise and strategic services.",
};

export function verificationLevelIndex(level: VerificationLevel) {
  return VERIFICATION_LEVELS.indexOf(level);
}

/** Does this account reach at least `required`? */
export function meetsLevel(level: VerificationLevel, required: VerificationLevel) {
  return verificationLevelIndex(level) >= verificationLevelIndex(required);
}

// ---------------------------------------------------------------------------
// Authorized account holders — §9.5
// ---------------------------------------------------------------------------

/*
  Business accounts support several people with different authority. Modelled
  now because it is an identity concern; the permissions only start *biting* in
  C4, when there are orders for a spend limit to apply to.
*/
export const ACCOUNT_ROLES = [
  "administrator",
  "procurement",
  "accounts",
  "project",
  "management",
] as const;

export const accountRoleSchema = z.enum(ACCOUNT_ROLES);
export type AccountRole = z.infer<typeof accountRoleSchema>;

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  administrator: "Account administrator",
  procurement: "Procurement user",
  accounts: "Accounts user",
  project: "Project user",
  management: "Management user",
};

export const ACCOUNT_ROLE_PERMISSIONS: Record<AccountRole, string> = {
  administrator: "Manage users, profile, wallet, membership and security.",
  procurement: "Search, compare, request quotations and purchase within limits.",
  accounts: "Payments, statements, wallet and transaction records.",
  project: "Project searches, quotations, material lists and project purchasing.",
  management: "Business analytics, spend visibility and supplier dashboards.",
};

export const authorizedUserSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, "Enter the person's name"),
  email,
  phone: kenyanPhone,
  role: accountRoleSchema,
  /** Per-order ceiling in KSh; null means no limit. Enforced from C4. */
  spendLimitKsh: z.number().positive().nullable().default(null),
  addedAt: z.string(),
});

export type AuthorizedUser = z.infer<typeof authorizedUserSchema>;

// ---------------------------------------------------------------------------
// Business information — progressive, §9.4
// ---------------------------------------------------------------------------

export const customerBusinessSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered legal name"),
  tradingName: z.string().trim().min(2, "Enter the trading name"),
  kraPin,
  brsNumber: brsNumber.nullable().default(null),
  /** Verified against the registries at C5; declared here. */
  verifiedAt: z.string().nullable().default(null),
});

export type CustomerBusiness = z.infer<typeof customerBusinessSchema>;

// ---------------------------------------------------------------------------
// The stored record
// ---------------------------------------------------------------------------

export const customerSchema = z.object({
  id: z.string(),

  // Identity — §9.4's mandatory fields
  name: z.string().trim().min(2),
  email,
  phone: kenyanPhone,
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),

  /*
    Location is a strategic field, not an address for a courier. §9.4: demand,
    suppliers and fulfilment are all geographically anchored, so this is what
    matches a customer to suppliers who can actually reach them.
  */
  physicalAddress: z.string().trim().min(4),
  town: z.string().trim().min(2),
  county: countySchema,
  region: regionSchema,

  customerType: customerTypeSchema,
  business: customerBusinessSchema.nullable().default(null),
  authorizedUsers: z.array(authorizedUserSchema).default([]),

  membership: membershipTierSchema,
  membershipStartedAt: z.string().nullable().default(null),
  membershipRenewsAt: z.string().nullable().default(null),

  verificationLevel: verificationLevelSchema,

  /*
    Joins this account to the delivery history in `lib/data/fixtures/demand.ts`.

    That generator already produces a deterministic year of deliveries per
    buying shop. Carrying its id here means a seeded customer's order history,
    spend and Trust Score are *derived from the same events* the supplier's own
    repeat-buyer table reads — one history, two sides of the marketplace, no
    way for them to disagree. Null for accounts registered during the demo,
    who genuinely have no history yet.
  */
  buyerId: z.string().nullable().default(null),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Customer = z.infer<typeof customerSchema>;

// ---------------------------------------------------------------------------
// Registration steps — §9.3, §9.4
// ---------------------------------------------------------------------------

/*
  Deliberately shorter than the manufacturer's nine steps. A customer is not
  applying for anything: §9.40 says basic discovery must not feel punitive, and
  a long form before the first search is exactly that. Four steps, and the last
  one is a choice rather than a form.
*/

export const customerAccountStepSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email,
    phone: kenyanPhone,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string(),
    acceptedTerms: z
      .boolean()
      .refine((v) => v, "You must accept the terms to continue"),
    acceptedDataProcessing: z
      .boolean()
      .refine((v) => v, "Data-processing consent is required under the Data Protection Act"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type CustomerAccountStep = z.infer<typeof customerAccountStepSchema>;

export const customerProfileStepSchema = z
  .object({
    customerType: customerTypeSchema,
    physicalAddress: z
      .string()
      .trim()
      .min(4, "Enter a street, estate or building — enough to find you"),
    town: z.string().trim().min(2, "Enter your town or city"),
    county: countySchema,
    legalName: z.string().trim().optional(),
    tradingName: z.string().trim().optional(),
    kraPin: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!isBusinessType(data.customerType)) return;

    // Business details are required only once the customer says they are a
    // business — the progressive rule in §9.4, enforced in one place.
    if (!data.legalName || data.legalName.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Enter the registered legal name",
      });
    }
    if (!data.tradingName || data.tradingName.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["tradingName"],
        message: "Enter the trading name",
      });
    }
    const pin = data.kraPin?.trim().toUpperCase() ?? "";
    if (!/^[A-Z]\d{9}[A-Z]$/.test(pin)) {
      ctx.addIssue({
        code: "custom",
        path: ["kraPin"],
        message: "KRA PIN looks like P051234567M",
      });
    }
  });

export type CustomerProfileStep = z.infer<typeof customerProfileStepSchema>;
