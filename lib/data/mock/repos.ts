import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import type { UploadedDocument } from "@/lib/schemas/document";
import type { BillingCycle, PackageKey } from "@/lib/schemas/subscription";
import type { CheckStatus, VerificationCheckKey } from "@/lib/schemas/verification";
import { draftsToPublishOnClearing, isAdministrativeHold } from "@/lib/rules/ops";
import { deriveStatus } from "@/lib/schemas/verification";
import { regionForCounty } from "@/lib/schemas/common";
import {
  hasKebsPermit,
  initialChecks,
} from "@/lib/rules/onboarding";
import { makeId, sleep } from "@/lib/utils";
import type {
  DraftPatch,
  ManufacturerFilter,
  ManufacturerRepo,
  OnboardingDraft,
  OnboardingRepo,
  ProductRepo,
  SessionRepo,
} from "@/lib/data/types";
import { emptyDraft, getSnapshot, mutate } from "./db";
import { FAST, NORMAL, SLOW } from "./latency";

/*
  Mock implementations of the repository interfaces.

  Every method awaits one of the delays in `./latency` before returning, for
  the reason recorded there.
*/

function now() {
  return new Date().toISOString();
}

function touch(m: Manufacturer): Manufacturer {
  return { ...m, updatedAt: now() };
}

/**
 * Applies an update to one manufacturer, and with it the one side effect a
 * status change has elsewhere in the store.
 *
 * Clearing a supplier to list publishes the drafts they were never allowed to
 * publish — see `draftsToPublishOnClearing`. Doing it here rather than in the
 * console means it happens however the status moved: an ops decision, a
 * reinstatement, or the manufacturer's own resubmission clearing the last check.
 */
function replaceManufacturer(id: string, update: (m: Manufacturer) => Manufacturer) {
  let updated: Manufacturer | undefined;

  mutate((db) => {
    let before: Manufacturer | undefined;
    const manufacturers = db.manufacturers.map((m) => {
      if (m.id !== id) return m;
      before = m;
      updated = touch(update(m));
      return updated;
    });
    if (!before || !updated) return db;

    const promote = new Set(
      draftsToPublishOnClearing(
        before.status,
        updated.status,
        db.products.filter((p) => p.manufacturerId === id),
      ),
    );

    return {
      ...db,
      manufacturers,
      products: promote.size
        ? db.products.map((p) =>
            promote.has(p.id)
              ? { ...p, status: "active" as const, updatedAt: now() }
              : p,
          )
        : db.products,
    };
  });

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
      // A brand-new manufacturer has no trading history, so its storefront
      // starts honest: no orders fulfilled, no response record. Those fill in
      // as it trades rather than being invented at sign-up.
      storefront: {
        tagline: `${company.categories[0]} manufacturer in ${company.county}`,
        about: `${company.legalName} manufactures ${company.categories
          .join(", ")
          .toLowerCase()} in ${company.county}, supplying hardware retailers across ${company.distributionRegions.join(
          ", ",
        )}.`,
        responseRatePercent: 0,
        avgResponseHours: 0,
        certifications: [],
        paymentTerms: ["M-Pesa", "Bank transfer"],
        deliveryPolicy: "Delivery terms to be confirmed per order.",
        minOrderPolicy:
          "Minimum order quantity is set per product and shown on each listing.",
        ordersFulfilled: 0,
      },
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

      /*
        `deriveStatus()` reads only the checks, so a check movement after a
        suspension would silently un-suspend the manufacturer. Suspension is an
        administrative hold, not a derived state — it outranks the pipeline.
      */
      const derived = deriveStatus(checks);
      const nextStatus = isAdministrativeHold(m.status) ? m.status : derived;
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
        /*
          `verifiedAt` records that verification *happened*, so it is only ever
          set, never cleared. Clearing it when a later check reopened rewrote
          history: the activity feed derives the "cleared verification" event
          from this timestamp, so the event vanished from the audit trail and the
          record no longer showed the supplier had ever been live. Present state
          is `status`; this is the historic fact.
        */
        verifiedAt: derived === "approved" ? (m.verifiedAt ?? now()) : m.verifiedAt,
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
      /*
        Same hold as `setCheckStatus`: a suspended manufacturer re-uploading a
        document must not be quietly put back in business by a status re-derive.
      */
      const derived = deriveStatus(checks);
      return {
        ...m,
        documents,
        checks,
        status: isAdministrativeHold(m.status) ? m.status : derived,
      };
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

  async save(patch: DraftPatch) {
    await sleep(FAST);
    // Read the current draft *after* the delay, and resolve a functional patch
    // against it, so concurrent saves compose instead of clobbering.
    const current = getSnapshot().draft ?? emptyDraft();
    const resolved = typeof patch === "function" ? patch(current) : patch;
    const next: OnboardingDraft = {
      ...current,
      ...resolved,
      completedSteps: [
        ...new Set([...current.completedSteps, ...(resolved.completedSteps ?? [])]),
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
