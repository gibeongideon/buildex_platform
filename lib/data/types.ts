import type { Manufacturer, Director, CompanyStep, AccountStep } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { UploadedDocument } from "@/lib/schemas/document";
import type { CheckStatus, VerificationCheckKey } from "@/lib/schemas/verification";
import type { BillingCycle, PackageKey } from "@/lib/schemas/subscription";

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
