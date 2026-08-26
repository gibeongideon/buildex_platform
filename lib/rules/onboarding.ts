import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { OnboardingDraft, OnboardingStepId } from "@/lib/data/types";
import {
  DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  isDocumentSatisfied,
  type DocumentTypeKey,
  type UploadedDocument,
} from "@/lib/schemas/document";
import {
  VERIFICATION_CHECKS,
  type VerificationCheck,
} from "@/lib/schemas/verification";

/*
  Business rules for manufacturer onboarding, kept out of both the schemas and
  the components so ops actions, demo controls and the wizard can never
  disagree about what the rules are.
*/

const TWO_YEARS_MS = 2 * 365 * 86_400_000;

/**
 * Which manufacturers get enhanced due diligence.
 *
 * Requirements §8.1: "Use physical verification or other enhanced due
 * diligence for higher-risk manufacturers." Young companies and small
 * declared capacity are the two signals available at onboarding time — a
 * newly-registered shell with no production history is exactly the "ghost
 * company" the briefing warns about.
 */
export function requiresSiteVisit(input: {
  yearEstablished: number;
  capacityBand: string;
  hasKebsPermit: boolean;
}): boolean {
  const isYoung =
    Date.now() - new Date(`${input.yearEstablished}-01-01`).getTime() < TWO_YEARS_MS;
  // A current KEBS standardisation mark means a regulator has already been on
  // site, so it stands in for our own visit.
  if (input.hasKebsPermit) return false;
  return isYoung || input.capacityBand === "under_5m";
}

/** The check pipeline as it looks the moment an application is submitted. */
export function initialChecks(input: {
  yearEstablished: number;
  capacityBand: string;
  hasKebsPermit: boolean;
}): VerificationCheck[] {
  const siteVisitNeeded = requiresSiteVisit(input);
  const now = new Date().toISOString();

  return VERIFICATION_CHECKS.map((meta) => {
    if (meta.key === "site_visit" && !siteVisitNeeded) {
      return {
        key: meta.key,
        status: "not_required" as const,
        startedAt: null,
        completedAt: null,
        note: null,
        blockingDocuments: [],
      };
    }
    // Completeness is automated, so it starts immediately; authority lookups
    // queue behind it.
    const startsNow = meta.key === "document_completeness";
    return {
      key: meta.key,
      status: startsNow ? ("in_review" as const) : ("pending" as const),
      startedAt: startsNow ? now : null,
      completedAt: null,
      note: null,
      blockingDocuments: [],
    };
  });
}

/** Required document types that are still missing, rejected or expired. */
export function outstandingDocuments(documents: UploadedDocument[]): DocumentTypeKey[] {
  return REQUIRED_DOCUMENT_TYPES.filter((type) => {
    const doc = documents.find((d) => d.type === type);
    return !isDocumentSatisfied(doc);
  });
}

export function documentPackComplete(documents: UploadedDocument[]): boolean {
  return outstandingDocuments(documents).length === 0;
}

/** Document types a manufacturer must re-upload to clear a failing check. */
export function blockingDocumentTypes(checks: VerificationCheck[]): DocumentTypeKey[] {
  const keys = new Set<string>();
  checks
    .filter((c) => c.status === "action_needed")
    .forEach((c) => c.blockingDocuments.forEach((d) => keys.add(d)));
  return DOCUMENT_TYPES.filter((d) => keys.has(d.key)).map((d) => d.key);
}

export function hasKebsPermit(documents: UploadedDocument[]): boolean {
  return isDocumentSatisfied(documents.find((d) => d.type === "kebs_permit"));
}

// ---------------------------------------------------------------------------
// Wizard progression
// ---------------------------------------------------------------------------

/** Canonical order. The union itself lives in the data seam. */
export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  "account",
  "verify-phone",
  "company",
  "directors",
  "documents",
  "review",
  "verification",
  "subscription",
  "first-listing",
];

/**
 * The furthest step the draft's own contents justify. Deep links are clamped
 * to this, so a pasted URL can never drop someone into a step whose form has
 * no data behind it.
 */
export function furthestReachableStep(draft: OnboardingDraft): OnboardingStepId {
  if (!draft.account) return "account";
  if (!draft.phoneVerified) return "verify-phone";
  if (!draft.company) return "company";
  if (draft.directors.length === 0) return "directors";
  if (!documentPackComplete(draft.documents)) return "documents";
  if (!draft.manufacturerId) return "review";
  // Once the application is submitted, both verification and subscription are
  // open: verification is a status page rather than a gate, and the package
  // has to be reachable *before* one has been chosen.
  if (!draft.subscription) return "subscription";
  return "first-listing";
}

export function stepIndex(step: OnboardingStepId) {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

export function isStepReachable(step: OnboardingStepId, draft: OnboardingDraft) {
  return stepIndex(step) <= stepIndex(furthestReachableStep(draft));
}

// ---------------------------------------------------------------------------
// Post-onboarding activation
// ---------------------------------------------------------------------------

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

/**
 * Drives the "3 of 6 complete" card on the manufacturer dashboard. Ordered by
 * what unblocks revenue soonest.
 */
export function activationChecklist(
  manufacturer: Manufacturer,
  products: Product[],
): ChecklistItem[] {
  const verified = manufacturer.status === "approved";
  const activeProducts = products.filter((p) => p.status === "active");

  return [
    {
      id: "profile",
      label: "Complete your company profile",
      description: "Registered details, categories and distribution regions.",
      done: Boolean(manufacturer.legalName && manufacturer.categories.length > 0),
      href: "/connect/settings",
      cta: "Review profile",
    },
    {
      id: "documents",
      label: "Submit your KYB document pack",
      description: "BRS, KRA PIN, tax compliance, CR12 and director IDs.",
      done: documentPackComplete(manufacturer.documents),
      href: "/connect/verification",
      cta: "Upload documents",
    },
    {
      id: "verification",
      label: "Pass verification",
      description: "BRS, KRA and IPRS checks completed by Buildex Operations.",
      done: verified,
      href: "/connect/verification",
      cta: "Track progress",
    },
    {
      id: "package",
      label: "Choose a subscription package",
      description: "Free gets you listed; Premium unlocks regional targeting.",
      done: Boolean(manufacturer.subscription),
      href: "/connect/subscription",
      cta: "Compare packages",
    },
    {
      id: "catalogue",
      label: "List at least 5 products",
      description: "Manufacturers with fuller catalogues get materially more enquiries.",
      done: activeProducts.length >= 5,
      href: "/connect/catalogue",
      cta: `Add products (${activeProducts.length}/5)`,
    },
    {
      id: "regions",
      label: "Set your distribution regions",
      description: "Hardware shops filter by region before they filter by price.",
      done: manufacturer.distributionRegions.length > 0,
      href: "/connect/settings",
      cta: "Set regions",
    },
  ];
}
