/*
  ===========================================================================
  THE SWAP POINT
  ===========================================================================

  This is the only file that changes at the backend cutover (Phase 9).

  Today it re-exports the in-memory mock implementation. To go live, point the
  repository exports at implementations backed by Drizzle + Postgres behind
  Next.js route handlers — one entity at a time if you like, since each
  repository is independent. No component import changes.

    export { manufacturerRepo } from "./api/manufacturers";  // ← later
    export { productRepo } from "./mock/repos";              // ← still mock

  `subscribeToData` exists because the mock store is local and reactive. When
  the repositories become network calls it becomes a no-op (or a revalidation
  signal), and `resetDemoData` goes away with the demo panel.
*/

export {
  manufacturerRepo,
  onboardingRepo,
  productRepo,
  sessionRepo,
} from "./mock/repos";

export {
  marketplaceRepo,
  browsingRepo,
  enquiryRepo,
  campaignRepo,
  insightsRepo,
} from "./mock/marketplace";

export { activityRepo } from "./mock/activity";
export { supplierRepo } from "./mock/suppliers";
export { adminRepo } from "./mock/admin";

export {
  subscribe as subscribeToData,
  getVersion as getDataVersion,
  resetDb as resetDemoData,
} from "./mock/db";

export type {
  ActivityActorType,
  ActivityEntityType,
  ActivityEvent,
  ActivityFilter,
  ActivityKind,
  ActivityRepo,
  AdminRepo,
  BillFilter,
  BrowsingRepo,
  CampaignRepo,
  CategoryGap,
  CountyDemand,
  DemandFilter,
  DemandPoint,
  DemoSession,
  DraftPatch,
  EnquiryFilter,
  EnquiryRepo,
  FirstListingDraft,
  InsightsRepo,
  ManufacturerFilter,
  ManufacturerRepo,
  MarketplaceFacets,
  MarketplaceFilter,
  MarketplaceListing,
  MarketplaceRepo,
  MarketplaceSort,
  OnboardingDraft,
  OnboardingRepo,
  OnboardingStepId,
  PlatformSummary,
  ProductPerformance,
  ProductRepo,
  RegionDemand,
  RepeatBuyer,
  Role,
  SessionRepo,
  SupplierRepo,
  VendorFilter,
} from "./types";
