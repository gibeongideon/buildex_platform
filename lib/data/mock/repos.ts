import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { UploadedDocument } from "@/lib/schemas/document";
import type { BillingCycle, PackageKey } from "@/lib/schemas/subscription";
import type { CheckStatus, VerificationCheckKey } from "@/lib/schemas/verification";
import { deriveStatus } from "@/lib/schemas/verification";
import { regionForCounty } from "@/lib/schemas/common";
import {
  hasKebsPermit,
  initialChecks,
} from "@/lib/rules/onboarding";
import { makeId, sleep } from "@/lib/utils";
import type {
  ManufacturerFilter,
  ManufacturerRepo,
  OnboardingDraft,
  OnboardingRepo,
  ProductRepo,
  SessionRepo,
} from "@/lib/data/types";
import { emptyDraft, getSnapshot, mutate } from "./db";

/*
  Mock implementations of the repository interfaces.

  Every method awaits a short delay before returning. That is deliberate: it
  forces every screen to have a real loading state, so the eventual swap to a
  networked backend does not surface a class of missing UI.
*/

const FAST = 140;
const NORMAL = 260;
const SLOW = 420;

function now() {
  return new Date().toISOString();
}

function touch(m: Manufacturer): Manufacturer {
  return { ...m, updatedAt: now() };
}

function replaceManufacturer(id: string, update: (m: Manufacturer) => Manufacturer) {
  let updated: Manufacturer | undefined;
  mutate((db) => ({
    ...db,
    manufacturers: db.manufacturers.map((m) => {
      if (m.id !== id) return m;
      updated = touch(update(m));
      return updated;
    }),
  }));
  if (!updated) throw new Error(`Manufacturer not found: ${id}`);
  return updated;
}

export const manufacturerRepo: ManufacturerRepo = {
  async list(filter: ManufacturerFilter = {}) {
    await sleep(NORMAL);
    const { manufacturers } = getSnapshot();
    const query = filter.query?.trim().toLowerCase();

    return manufacturers.filter((m) => {
      if (filter.status?.length && !filter.status.includes(m.status)) return false;
      if (filter.region && regionForCounty(m.county) !== filter.region) return false;
      if (query) {
        const haystack = [m.legalName, m.tradingName, m.kraPin, m.brsNumber, m.county]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  },

  async getById(id) {
    await sleep(FAST);
    return getSnapshot().manufacturers.find((m) => m.id === id) ?? null;
  },

  async findByKraPin(pin) {
    // Deliberately slower: this is presented in the UI as a live registry
    // lookup, and instant results read as fake.
    await sleep(SLOW);
    const normalised = pin.trim().toUpperCase();
    return (
      getSnapshot().manufacturers.find((m) => m.kraPin.toUpperCase() === normalised) ?? null
    );
  },

  async createFromDraft(draft) {
    await sleep(SLOW);
    if (!draft.account || !draft.company) {
      throw new Error("Draft is missing account or company details");
    }

    const { company, account } = draft;
    const checks = initialChecks({
      yearEstablished: company.yearEstablished,
      capacityBand: company.capacityBand,
      hasKebsPermit: hasKebsPermit(draft.documents),
    });

    const manufacturer: Manufacturer = {
      id: makeId("mfr"),
      status: deriveStatus(checks),
      contactName: account.contactName,
      email: account.email,
      phone: account.phone,
      phoneVerified: draft.phoneVerified,
      legalName: company.legalName,
      tradingName: company.tradingName,
      brsNumber: company.brsNumber,
      kraPin: company.kraPin,
      yearEstablished: company.yearEstablished,
      physicalAddress: company.physicalAddress,
      county: company.county,
      website: company.website ?? "",
      categories: company.categories,
      capacityBand: company.capacityBand,
      distributionRegions: company.distributionRegions,
      directors: draft.directors,
      documents: draft.documents,
      checks,
      subscription: null,
      submittedAt: now(),
      verifiedAt: null,
      reviewNotes: [],
      riskFlagged: checks.some(
        (c) => c.key === "site_visit" && c.status !== "not_required",
      ),
      createdAt: now(),
      updatedAt: now(),
    };

    mutate((db) => ({ ...db, manufacturers: [manufacturer, ...db.manufacturers] }));
    return manufacturer;
  },

  async update(id, patch) {
    await sleep(FAST);
    return replaceManufacturer(id, (m) => ({ ...m, ...patch }));
  },

  async setCheckStatus(id, key: VerificationCheckKey, status: CheckStatus, options = {}) {
    await sleep(NORMAL);
    return replaceManufacturer(id, (m) => {
      const checks = m.checks.map((check) => {
        if (check.key !== key) return check;
        return {
          ...check,
          status,
          startedAt: check.startedAt ?? (status === "pending" ? null : now()),
          completedAt: status === "passed" ? now() : null,
          note: options.note ?? (status === "action_needed" ? check.note : null),
          blockingDocuments: options.blockingDocuments ?? check.blockingDocuments,
        };
      });

      const nextStatus = deriveStatus(checks);
      // Once a document is implicated in a failing check, reflect that on the
      // document itself so the upload screen can point straight at it.
      const documents = m.documents.map((doc) => {
        const blocked = checks.some(
          (c) => c.status === "action_needed" && c.blockingDocuments.includes(doc.type),
        );
        if (blocked && doc.status === "accepted") {
          return { ...doc, status: "rejected" as const, reviewNote: options.note ?? doc.reviewNote };
        }
        return doc;
      });

      return {
        ...m,
        checks,
        documents,
        status: nextStatus,
        verifiedAt: nextStatus === "approved" ? (m.verifiedAt ?? now()) : null,
        reviewNotes:
          status === "action_needed" && options.note
            ? [...new Set([...m.reviewNotes, options.note])]
            : m.reviewNotes,
      };
    });
  },

  async replaceDocument(id, document: UploadedDocument) {
    await sleep(NORMAL);
    return replaceManufacturer(id, (m) => {
      const documents = [
        ...m.documents.filter((d) => d.type !== document.type),
        document,
      ];
      // Re-uploading clears the block this document was causing and puts the
      // affected checks back in the queue.
      const checks = m.checks.map((check) => {
        if (!check.blockingDocuments.includes(document.type)) return check;
        const remaining = check.blockingDocuments.filter((d) => d !== document.type);
        return {
          ...check,
          blockingDocuments: remaining,
          status: remaining.length === 0 ? ("in_review" as const) : check.status,
          note: remaining.length === 0 ? null : check.note,
          startedAt: check.startedAt ?? now(),
        };
      });
      return { ...m, documents, checks, status: deriveStatus(checks) };
    });
  },

  async setSubscription(id, pkg: PackageKey, cycle: BillingCycle) {
    await sleep(NORMAL);
    return replaceManufacturer(id, (m) => ({
      ...m,
      subscription: {
        package: pkg,
        billingCycle: cycle,
        startedAt: now(),
        renewsAt:
          pkg === "free"
            ? null
            : new Date(
                Date.now() + (cycle === "annual" ? 365 : 30) * 86_400_000,
              ).toISOString(),
      },
    }));
  },
};

export const productRepo: ProductRepo = {
  async listByManufacturer(manufacturerId) {
    await sleep(NORMAL);
    return getSnapshot().products.filter((p) => p.manufacturerId === manufacturerId);
  },

  async getById(id) {
    await sleep(FAST);
    return getSnapshot().products.find((p) => p.id === id) ?? null;
  },

  async create(input) {
    await sleep(NORMAL);
    const product: Product = {
      ...input,
      id: makeId("prd"),
      createdAt: now(),
      updatedAt: now(),
    } as Product;
    mutate((db) => ({ ...db, products: [product, ...db.products] }));
    return product;
  },

  async update(id, patch) {
    await sleep(FAST);
    let updated: Product | undefined;
    mutate((db) => ({
      ...db,
      products: db.products.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch, updatedAt: now() } as Product;
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Product not found: ${id}`);
    return updated;
  },

  async remove(id) {
    await sleep(FAST);
    mutate((db) => ({ ...db, products: db.products.filter((p) => p.id !== id) }));
  },
};

export const onboardingRepo: OnboardingRepo = {
  async load() {
    await sleep(FAST);
    const { draft } = getSnapshot();
    if (draft) return draft;
    const fresh = emptyDraft();
    mutate((db) => ({ ...db, draft: fresh }));
    return fresh;
  },

  async save(patch: Partial<OnboardingDraft>) {
    await sleep(FAST);
    const current = getSnapshot().draft ?? emptyDraft();
    const next: OnboardingDraft = {
      ...current,
      ...patch,
      completedSteps: [
        ...new Set([...current.completedSteps, ...(patch.completedSteps ?? [])]),
      ],
      updatedAt: now(),
    };
    mutate((db) => ({ ...db, draft: next }));
    return next;
  },

  async clear() {
    await sleep(FAST);
    mutate((db) => ({ ...db, draft: null }));
  },
};

export const sessionRepo: SessionRepo = {
  async get() {
    await sleep(FAST);
    return getSnapshot().session;
  },

  async set(patch) {
    await sleep(FAST);
    const next = { ...getSnapshot().session, ...patch };
    mutate((db) => ({ ...db, session: next }));
    return next;
  },
};
