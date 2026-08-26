import { z } from "zod";
import {
  brsNumber,
  capacityBandSchema,
  countySchema,
  email,
  kenyanPhone,
  kraPin,
  nationalId,
  productCategorySchema,
  regionSchema,
} from "./common";
import { uploadedDocumentSchema } from "./document";
import { manufacturerStatusSchema, verificationCheckSchema } from "./verification";
import { subscriptionSchema } from "./subscription";

/*
  The manufacturer aggregate for Buildex Connect.

  Each onboarding step below has its own exported schema. The wizard validates
  step by step; the aggregate is what the repository stores. Splitting them
  this way means a partially-completed application is representable without
  making every field optional on the stored record.
*/

// ---------------------------------------------------------------------------
// Step 1 — Account
// ---------------------------------------------------------------------------

export const accountStepSchema = z
  .object({
    contactName: z.string().trim().min(2, "Enter your full name"),
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

export type AccountStep = z.infer<typeof accountStepSchema>;

// ---------------------------------------------------------------------------
// Step 2 — Phone verification
// ---------------------------------------------------------------------------

export const otpStepSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type OtpStep = z.infer<typeof otpStepSchema>;

// ---------------------------------------------------------------------------
// Step 3 — Company profile
// ---------------------------------------------------------------------------

const currentYear = new Date().getFullYear();

export const companyStepSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered legal name"),
  tradingName: z.string().trim().min(2, "Enter the trading name"),
  brsNumber,
  kraPin,
  yearEstablished: z
    .number()
    .int()
    .min(1900, "Enter a valid year")
    .max(currentYear, "Year cannot be in the future"),
  physicalAddress: z.string().trim().min(5, "Enter the physical address"),
  county: countySchema,
  // No .default() on form-facing fields: a default makes the schema's input
  // type diverge from its output type, which breaks the react-hook-form
  // resolver's generics. Defaults belong in the form's defaultValues instead.
  website: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), "Enter a full URL including https://"),
  categories: z
    .array(productCategorySchema)
    .min(1, "Select at least one category you manufacture"),
  capacityBand: capacityBandSchema,
  distributionRegions: z
    .array(regionSchema)
    .min(1, "Select at least one region you currently supply"),
});

export type CompanyStep = z.infer<typeof companyStepSchema>;

// ---------------------------------------------------------------------------
// Step 4 — Directors
// ---------------------------------------------------------------------------

export const DIRECTOR_ROLES = [
  "Director",
  "Managing Director",
  "Shareholder",
  "Company Secretary",
] as const;

/**
 * IPRS check state per director. Requirements §5.2 — verify national IDs
 * against the Integrated Population Registration Service.
 */
export const iprsStatusSchema = z.enum(["unchecked", "checking", "matched", "mismatch"]);

export const directorSchema = z.object({
  id: z.string(),
  fullName: z.string().trim().min(2, "Enter the director's full name"),
  nationalId,
  role: z.enum(DIRECTOR_ROLES),
  ownershipPercent: z
    .number()
    .min(0, "Ownership cannot be negative")
    .max(100, "Ownership cannot exceed 100%"),
  phone: kenyanPhone,
  iprsStatus: iprsStatusSchema,
});

export type Director = z.infer<typeof directorSchema>;

export const directorsStepSchema = z
  .object({
    directors: z.array(directorSchema).min(1, "Add at least one director"),
  })
  .superRefine((data, ctx) => {
    const total = data.directors.reduce((sum, d) => sum + d.ownershipPercent, 0);
    // Shareholding must reconcile — a CR12 that doesn't add up is the single
    // most common signal of a fabricated company structure.
    if (Math.round(total) !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["directors"],
        message: `Ownership across all directors must total 100% (currently ${total.toFixed(0)}%)`,
      });
    }
    const ids = data.directors.map((d) => d.nationalId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["directors"],
        message: "Two directors share the same National ID",
      });
    }
  });

export type DirectorsStep = z.infer<typeof directorsStepSchema>;

// ---------------------------------------------------------------------------
// Storefront
// ---------------------------------------------------------------------------

/**
 * The public-facing side of a manufacturer: what a hardware shop sees on the
 * manufacturer's own page in the marketplace.
 *
 * Buyers in wholesale supply decide on trust before they decide on price —
 * how long a supplier has traded, whether it answers enquiries, what terms it
 * offers. Those signals are part of the record rather than marketing copy
 * bolted on, so the storefront and the ops console read the same data.
 */
export const storefrontSchema = z.object({
  tagline: z.string().trim().max(120),
  about: z.string().trim().max(1200),
  /** Share of enquiries answered — a headline trust signal on the storefront. */
  responseRatePercent: z.number().min(0).max(100),
  avgResponseHours: z.number().min(0),
  certifications: z.array(z.string()).default([]),
  paymentTerms: z.array(z.string()).default([]),
  deliveryPolicy: z.string().trim().max(300),
  minOrderPolicy: z.string().trim().max(200),
  /** Total orders fulfilled through Buildex — depth of trading history. */
  ordersFulfilled: z.number().int().min(0),
});

export type Storefront = z.infer<typeof storefrontSchema>;

// ---------------------------------------------------------------------------
// The stored aggregate
// ---------------------------------------------------------------------------

export const manufacturerSchema = z.object({
  id: z.string(),
  status: manufacturerStatusSchema,

  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  phoneVerified: z.boolean().default(false),

  legalName: z.string(),
  tradingName: z.string(),
  brsNumber: z.string(),
  kraPin: z.string(),
  yearEstablished: z.number().int(),
  physicalAddress: z.string(),
  county: z.string(),
  website: z.string().default(""),
  categories: z.array(productCategorySchema),
  capacityBand: z.string(),
  distributionRegions: z.array(regionSchema),

  directors: z.array(directorSchema).default([]),
  documents: z.array(uploadedDocumentSchema).default([]),
  checks: z.array(verificationCheckSchema).default([]),
  subscription: subscriptionSchema.nullable().default(null),
  storefront: storefrontSchema,

  submittedAt: z.string().nullable().default(null),
  verifiedAt: z.string().nullable().default(null),
  /** Populated when ops rejects or asks for more information. */
  reviewNotes: z.array(z.string()).default([]),
  /** Set by the ops console when enhanced due diligence is required. */
  riskFlagged: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Manufacturer = z.infer<typeof manufacturerSchema>;
