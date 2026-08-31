import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { Enquiry } from "@/lib/schemas/enquiry";
import type { Campaign } from "@/lib/schemas/campaign";
import type { Vendor, VendorBill } from "@/lib/schemas/supplier";
import type { Customer } from "@/lib/schemas/customer";
import type { Offer } from "@/lib/schemas/offer";
import type {
  DemoSession,
  OnboardingDraft,
  RegistrationDraft,
} from "@/lib/data/types";
import { seedManufacturers } from "@/lib/data/fixtures/manufacturers";
import { seedProducts } from "@/lib/data/fixtures/products";
import { seedEnquiries } from "@/lib/data/fixtures/enquiries";
import { seedCampaigns } from "@/lib/data/fixtures/campaigns";
import { seedVendorBills, seedVendors } from "@/lib/data/fixtures/suppliers";
import { DEMO_CUSTOMER_ID, seedCustomers } from "@/lib/data/fixtures/customers";
import { seedOffers } from "@/lib/data/fixtures/offers";

/*
  In-memory database for the mockup, persisted to localStorage so a demo
  survives a page reload and "Save & exit" behaves the way it will in
  production.

  Nothing outside lib/data may import this module. Components go through the
  repositories in lib/data/index.ts.
*/

/* Bump when the shape of seeded data changes, or old persisted data wins. */
const STORAGE_KEY = "buildex.mock.v9";

export type MockDb = {
  manufacturers: Manufacturer[];
  products: Product[];
  enquiries: Enquiry[];
  campaigns: Campaign[];
  /** Buildex Interiors' own purchase ledger. */
  vendors: Vendor[];
  vendorBills: VendorBill[];
  /** The buying side of the marketplace — Chapter 9. */
  customers: Customer[];
  offers: Offer[];
  draft: OnboardingDraft | null;
  registration: RegistrationDraft | null;
  session: DemoSession;
  /** Product ids, most recent first. Powers the browsing-history rail. */
  recentProductIds: string[];
  /** Search terms, most recent first — §9.16, §9.26. */
  recentSearches: string[];
};

export function emptyDraft(): OnboardingDraft {
  return {
    manufacturerId: null,
    currentStep: "account",
    completedSteps: [],
    account: null,
    phoneVerified: false,
    company: null,
    directors: [],
    documents: [],
    subscription: null,
    firstListing: null,
    updatedAt: new Date().toISOString(),
  };
}

export function emptyRegistration(): RegistrationDraft {
  return {
    customerId: null,
    currentStep: "account",
    completedSteps: [],
    account: null,
    phoneVerified: false,
    profile: null,
    membership: null,
    updatedAt: new Date().toISOString(),
  };
}

function seed(): MockDb {
  return {
    manufacturers: seedManufacturers(),
    products: seedProducts(),
    enquiries: seedEnquiries(),
    campaigns: seedCampaigns(),
    vendors: seedVendors(),
    vendorBills: seedVendorBills(),
    customers: seedCustomers(),
    offers: seedOffers(),
    draft: null,
    registration: null,
    /*
      The demo starts signed in as a seeded trade buyer.

      A signed-out first load would make every account screen an empty state,
      and the point of seeding customers from the delivery history is that the
      screens have something true to show on the first click. Registering
      through `/join` replaces this, and the demo panel can sign out.
    */
    session: {
      role: "guest",
      manufacturerId: null,
      customerId: DEMO_CUSTOMER_ID,
    },
    recentProductIds: [],
    recentSearches: [],
  };
}

let db: MockDb | undefined;
let serverSnapshot: MockDb | undefined;
let version = 0;
const listeners = new Set<() => void>();

/** Bumped on every mutation so subscribed queries know to re-run. */
export function getVersion() {
  return version;
}

/**
 * Stable reference for SSR. Store-backed views render their skeleton on the
 * server and their real content after mount, so this never needs to match
 * what localStorage holds.
 */
function getServerSnapshot(): MockDb {
  serverSnapshot ??= seed();
  return serverSnapshot;
}

function hydrate(): MockDb {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seed(), ...(JSON.parse(raw) as Partial<MockDb>) };
  } catch {
    // Private browsing or blocked site data — fall through to a fresh seed.
  }
  return seed();
}

function persist(next: MockDb) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or blocked storage: the demo still works, it just won't survive
    // a reload. Not worth interrupting the user over.
  }
}

export function getSnapshot(): MockDb {
  if (typeof window === "undefined") return getServerSnapshot();
  db ??= hydrate();
  return db;
}

export { getServerSnapshot };

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Replaces the snapshot with a new object so referential equality checks work. */
export function mutate(updater: (current: MockDb) => MockDb): MockDb {
  const next = updater(getSnapshot());
  db = next;
  if (typeof window !== "undefined") persist(next);
  notify();
  return next;
}

export function resetDb() {
  return mutate(() => seed());
}

// Keep multiple tabs of the same demo in step.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    db = hydrate();
    notify();
  });
}
