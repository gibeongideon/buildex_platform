import type { Manufacturer, Director, CompanyStep, AccountStep } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { UploadedDocument } from "@/lib/schemas/document";
import type { CheckStatus, VerificationCheckKey } from "@/lib/schemas/verification";
import type { BillingCycle, PackageKey } from "@/lib/schemas/subscription";
import type { Enquiry } from "@/lib/schemas/enquiry";
import type { Campaign } from "@/lib/schemas/campaign";

/*
  ===========================================================================
  THE SEAM
  ===========================================================================

  Everything the UI knows about data lives behind these interfaces. Components
  import from `@/lib/data` and call these methods; they never import a fixture
  and never touch localStorage.

  Today `@/lib/data` resolves to the in-memory mock implementation. At the
  backend cutover (Phase 9) it resolves to an implementation backed by Drizzle
  + Postgres behind Next.js route handlers. Every method is already async and
  returns the Zod-inferred type, so the signatures do not change.

  If you find yourself wanting to reach around this file, that is the signal
  that the interface is missing a method — add it here rather than importing
  a fixture directly.
*/

export type Role = "guest" | "manufacturer" | "hardware" | "ops" | "risk";

export type DemoSession = {
  role: Role;
  /** Which manufacturer the "manufacturer" role is signed in as. */
  manufacturerId: string | null;
};

export type OnboardingStepId =
  | "account"
  | "verify-phone"
  | "company"
  | "directors"
  | "documents"
  | "review"
  | "verification"
  | "subscription"
  | "first-listing";

/** The first product is captured inside the wizard before a Product exists. */
export type FirstListingDraft = {
  name: string;
  category: string;
  sku: string;
  description: string;
  unit: string;
  packSize: string;
  priceBands: { minQty: number; maxQty: number | null; unitPrice: number }[];
  moq: number;
  leadTimeDays: number;
  availableRegions: string[];
};

/**
 * A partially-completed application. In production this is a server-side row
 * so "Save & exit" survives a device change; in the mockup it is persisted to
 * localStorage behind the same repository interface.
 */
export type OnboardingDraft = {
  /** Set once the application has been submitted for verification. */
  manufacturerId: string | null;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  account: Omit<AccountStep, "password" | "confirmPassword"> | null;
  phoneVerified: boolean;
  company: CompanyStep | null;
  directors: Director[];
  documents: UploadedDocument[];
  subscription: { package: PackageKey; billingCycle: BillingCycle } | null;
  firstListing: FirstListingDraft | null;
  updatedAt: string;
};

export type ManufacturerFilter = {
  status?: Manufacturer["status"][];
  query?: string;
  region?: string;
};

export interface ManufacturerRepo {
  list(filter?: ManufacturerFilter): Promise<Manufacturer[]>;
  getById(id: string): Promise<Manufacturer | null>;
  /** Duplicate-PIN detection at company step. Requirements §5.2 (anti-fraud). */
  findByKraPin(pin: string): Promise<Manufacturer | null>;
  /** Materialises a submitted draft into a manufacturer record. */
  createFromDraft(draft: OnboardingDraft): Promise<Manufacturer>;
  update(id: string, patch: Partial<Manufacturer>): Promise<Manufacturer>;
  /** Ops or demo control moves one check; status is re-derived from checks. */
  setCheckStatus(
    id: string,
    key: VerificationCheckKey,
    status: CheckStatus,
    options?: { note?: string; blockingDocuments?: string[] },
  ): Promise<Manufacturer>;
  /** Manufacturer replaces a rejected or expired document. */
  replaceDocument(id: string, document: UploadedDocument): Promise<Manufacturer>;
  setSubscription(
    id: string,
    pkg: PackageKey,
    cycle: BillingCycle,
  ): Promise<Manufacturer>;
}

export interface ProductRepo {
  listByManufacturer(manufacturerId: string): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(
    input: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
}

/**
 * A patch, or a function producing one from the current draft.
 *
 * The functional form matters: uploading several documents in quick succession
 * would otherwise have each save computed from a stale render-time snapshot,
 * and the later writes would silently drop the earlier ones.
 */
export type DraftPatch =
  | Partial<OnboardingDraft>
  | ((current: OnboardingDraft) => Partial<OnboardingDraft>);

export interface OnboardingRepo {
  load(): Promise<OnboardingDraft>;
  save(patch: DraftPatch): Promise<OnboardingDraft>;
  clear(): Promise<void>;
}

export interface SessionRepo {
  get(): Promise<DemoSession>;
  set(patch: Partial<DemoSession>): Promise<DemoSession>;
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

export type MarketplaceSort =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "lead-time"
  | "newest";

export type MarketplaceFilter = {
  query?: string;
  categories?: string[];
  regions?: string[];
  manufacturerId?: string;
  /** Upper bound on the product's cheapest band. */
  maxUnitPrice?: number;
  maxLeadTimeDays?: number;
  verifiedOnly?: boolean;
  sort?: MarketplaceSort;
};

/** A listing joined to the manufacturer that sells it — what a card needs. */
export type MarketplaceListing = {
  product: Product;
  manufacturer: Manufacturer;
  /** Enquiries this listing has drawn — the card's traction signal, and what
   *  the default "most in demand" ordering ranks on. */
  enquiryCount: number;
};

export type MarketplaceFacets = {
  categories: { value: string; count: number }[];
  regions: { value: string; count: number }[];
  manufacturers: { id: string; name: string; count: number }[];
  priceRange: { min: number; max: number };
  total: number;
};

/**
 * The public marketplace: the central Buildex Connect catalogue, plus each
 * manufacturer's own storefront.
 *
 * Only manufacturers cleared to list appear here, and only their active
 * listings — so verification status governs public visibility in one place
 * rather than being re-checked on every page.
 */
export interface MarketplaceRepo {
  search(
    filter: MarketplaceFilter,
  ): Promise<{ listings: MarketplaceListing[]; facets: MarketplaceFacets }>;
  getListing(productId: string): Promise<MarketplaceListing | null>;
  /** A manufacturer's storefront: the company plus its public catalogue. */
  getStorefront(
    manufacturerId: string,
  ): Promise<{ manufacturer: Manufacturer; products: Product[] } | null>;
  listStorefronts(): Promise<
    { manufacturer: Manufacturer; productCount: number }[]
  >;
  /** Other listings from the same manufacturer, for cross-sell on a product page. */
  relatedFromManufacturer(productId: string, limit?: number): Promise<Product[]>;
  /** Comparable listings from other manufacturers in the same category. */
  similarFromOthers(productId: string, limit?: number): Promise<MarketplaceListing[]>;
}

/**
 * What this browser has looked at, most recent first.
 *
 * Alibaba-style marketplaces lean heavily on "browsing history" and "keep
 * looking for" rails. Those are only worth showing if they are real, so the
 * marketplace records views rather than faking the panels.
 */
export interface BrowsingRepo {
  recent(limit?: number): Promise<Product[]>;
  record(productId: string): Promise<void>;
  clear(): Promise<void>;
}

export type EnquiryFilter = {
  manufacturerId?: string;
  status?: Enquiry["status"][];
  query?: string;
};

export interface EnquiryRepo {
  list(filter?: EnquiryFilter): Promise<Enquiry[]>;
  getById(id: string): Promise<Enquiry | null>;
  create(
    input: Omit<Enquiry, "id" | "createdAt" | "status" | "respondedAt" | "quotedUnitPrice" | "quotedLeadTimeDays" | "quoteNote">,
  ): Promise<Enquiry>;
  /** Manufacturer answers with a price and lead time. */
  quote(
    id: string,
    quote: { unitPrice: number; leadTimeDays: number; note?: string },
  ): Promise<Enquiry>;
  setStatus(id: string, status: Enquiry["status"]): Promise<Enquiry>;
}

export interface CampaignRepo {
  listByManufacturer(manufacturerId: string): Promise<Campaign[]>;
  getById(id: string): Promise<Campaign | null>;
  create(
    input: Omit<Campaign, "id" | "spentKsh" | "metrics">,
  ): Promise<Campaign>;
  update(id: string, patch: Partial<Campaign>): Promise<Campaign>;
  setStatus(id: string, status: Campaign["status"]): Promise<Campaign>;
}

/**
 * Listing performance, derived from campaigns and enquiries rather than stored
 * separately, so the numbers on the insights page always reconcile with the
 * inbox and the campaign list.
 */
export type ProductPerformance = {
  product: Product;
  views: number;
  enquiries: number;
  orders: number;
  conversionPercent: number;
};

export type RegionDemand = {
  region: string;
  enquiries: number;
  orders: number;
  shareOfEnquiriesPercent: number;
};

export interface InsightsRepo {
  productPerformance(manufacturerId: string): Promise<ProductPerformance[]>;
  regionDemand(manufacturerId: string): Promise<RegionDemand[]>;
  summary(manufacturerId: string): Promise<{
    views: number;
    enquiries: number;
    orders: number;
    quotedValueKsh: number;
    acceptedValueKsh: number;
    responseRatePercent: number;
    avgResponseHours: number;
  }>;
}
