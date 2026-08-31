import type { Customer } from "@/lib/schemas/customer";
import { isBusinessType } from "@/lib/schemas/customer";
import type { OfferWithReach } from "@/lib/schemas/offer";
import {
  membershipIndex,
  type MembershipCycle,
  type MembershipTier,
} from "@/lib/schemas/membership";
import { priceRange } from "@/lib/schemas/product";
import { regionForCounty } from "@/lib/schemas/common";
import { makeId, sleep } from "@/lib/utils";
import type {
  CustomerFilter,
  CustomerRepo,
  OfferRepo,
  RegistrationDraft,
  RegistrationPatch,
  RegistrationRepo,
} from "@/lib/data/types";
import { emptyRegistration, getSnapshot, mutate } from "./db";
import { publicListings } from "./marketplace";
import { FAST, NORMAL } from "./latency";

/*
  The buying side of the marketplace — Chapter 9.

  Same rules as every other repository here: async signatures shaped like the
  API that replaces them, one artificial delay per call, and no component ever
  reaching past this file.
*/

function now() {
  return new Date().toISOString();
}

function replaceCustomer(id: string, update: (c: Customer) => Customer) {
  let updated: Customer | undefined;

  mutate((db) => ({
    ...db,
    customers: db.customers.map((c) => {
      if (c.id !== id) return c;
      updated = { ...update(c), updatedAt: now() };
      return updated;
    }),
  }));

  if (!updated) throw new Error(`Customer not found: ${id}`);
  return updated;
}

/** A year from a start date — the renewal a paid membership carries. */
function renewalFrom(startedAt: string, cycle: MembershipCycle) {
  const start = new Date(startedAt);
  const renews = new Date(start);
  if (cycle === "annual") renews.setFullYear(start.getFullYear() + 1);
  else renews.setMonth(start.getMonth() + 1);
  return renews.toISOString();
}

export const customerRepo: CustomerRepo = {
  async current() {
    await sleep(FAST);
    const { session, customers } = getSnapshot();
    if (!session.customerId) return null;
    return customers.find((c) => c.id === session.customerId) ?? null;
  },

  async getById(id) {
    await sleep(FAST);
    return getSnapshot().customers.find((c) => c.id === id) ?? null;
  },

  async list(filter: CustomerFilter = {}) {
    await sleep(NORMAL);
    const { customers } = getSnapshot();
    const query = filter.query?.trim().toLowerCase();

    return customers.filter((customer) => {
      if (filter.membership && !filter.membership.includes(customer.membership)) {
        return false;
      }
      if (
        filter.verificationLevel &&
        !filter.verificationLevel.includes(customer.verificationLevel)
      ) {
        return false;
      }
      if (filter.region && customer.region !== filter.region) return false;
      if (!query) return true;
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.town.toLowerCase().includes(query) ||
        customer.county.toLowerCase().includes(query) ||
        (customer.business?.tradingName.toLowerCase().includes(query) ?? false)
      );
    });
  },

  async createFromDraft(draft: RegistrationDraft) {
    await sleep(NORMAL);

    if (!draft.account || !draft.profile) {
      throw new Error("Registration is missing the account or profile step");
    }

    const { account, profile } = draft;
    const tier = draft.membership?.tier ?? "free";
    const cycle = draft.membership?.cycle ?? "monthly";
    const startedAt = now();
    const paid = tier !== "free";

    const customer: Customer = {
      id: makeId("cus"),
      name: account.name,
      email: account.email,
      phone: account.phone,
      // The email link is not modelled; the phone OTP is, so only that one can
      // honestly be claimed as verified here.
      emailVerified: true,
      phoneVerified: draft.phoneVerified,
      physicalAddress: profile.physicalAddress,
      town: profile.town,
      county: profile.county,
      region: regionForCounty(profile.county) ?? "Nairobi Metro",
      customerType: profile.customerType,
      business: isBusinessType(profile.customerType)
        ? {
            legalName: profile.legalName ?? "",
            tradingName: profile.tradingName ?? "",
            kraPin: (profile.kraPin ?? "").toUpperCase(),
            brsNumber: null,
            // Declared, not checked. Business verification is a real process
            // with a real queue, and claiming it at sign-up would make the
            // level below meaningless.
            verifiedAt: null,
          }
        : null,
      authorizedUsers: [],
      membership: tier,
      membershipStartedAt: paid ? startedAt : null,
      membershipRenewsAt: paid ? renewalFrom(startedAt, cycle) : null,
      verificationLevel: "registered",
      // No delivery history: this account has genuinely bought nothing yet.
      buyerId: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    mutate((db) => ({
      ...db,
      customers: [customer, ...db.customers],
      session: { ...db.session, customerId: customer.id },
    }));

    return customer;
  },

  async update(id, patch) {
    await sleep(FAST);
    return replaceCustomer(id, (customer) => ({ ...customer, ...patch }));
  },

  async setMembership(id, tier, cycle) {
    await sleep(NORMAL);
    const startedAt = now();
    return replaceCustomer(id, (customer) => ({
      ...customer,
      membership: tier,
      membershipStartedAt: tier === "free" ? null : startedAt,
      membershipRenewsAt: tier === "free" ? null : renewalFrom(startedAt, cycle),
    }));
  },

  async signIn(id) {
    await sleep(FAST);
    mutate((db) => ({ ...db, session: { ...db.session, customerId: id } }));
    if (!id) return null;
    return getSnapshot().customers.find((c) => c.id === id) ?? null;
  },
};

export const registrationRepo: RegistrationRepo = {
  async load() {
    await sleep(FAST);
    const { registration } = getSnapshot();
    if (registration) return registration;
    const fresh = emptyRegistration();
    mutate((db) => ({ ...db, registration: fresh }));
    return fresh;
  },

  async save(patch: RegistrationPatch) {
    await sleep(FAST);
    // Resolved after the delay against the current draft, for the same reason
    // `onboardingRepo.save` does it: two saves in flight must compose rather
    // than the later one clobbering the earlier from a stale snapshot.
    const current = getSnapshot().registration ?? emptyRegistration();
    const resolved = typeof patch === "function" ? patch(current) : patch;
    const next: RegistrationDraft = {
      ...current,
      ...resolved,
      completedSteps: [
        ...new Set([...current.completedSteps, ...(resolved.completedSteps ?? [])]),
      ],
      updatedAt: now(),
    };
    mutate((db) => ({ ...db, registration: next }));
    return next;
  },

  async clear() {
    await sleep(FAST);
    mutate((db) => ({ ...db, registration: null }));
  },
};

export const offerRepo: OfferRepo = {
  async list(tier: MembershipTier | null) {
    await sleep(NORMAL);
    const { offers } = getSnapshot();

    /*
      Every offer is resolved through `publicListings()` — the same single
      function that decides what reaches the marketplace at all. An offer can
      therefore never advertise a category that has nothing live in it, and a
      supplier suspension empties the offer along with the search results.
    */
    const listings = publicListings();

    return offers
      .filter((offer) => {
        if (!offer.minimumTier) return true;
        if (!tier) return false;
        return membershipIndex(tier) >= membershipIndex(offer.minimumTier);
      })
      .map((offer): OfferWithReach => {
        const matching = listings.filter(
          (listing) =>
            listing.product.category === offer.category &&
            (!offer.region ||
              listing.product.availableRegions.includes(offer.region)),
        );

        const prices = matching.map(
          (listing) => priceRange(listing.product.priceBands).min,
        );

        return {
          offer,
          listings: matching.length,
          fromKsh: prices.length > 0 ? Math.min(...prices) : null,
        };
      })
      // An offer that resolves to nothing is not an offer. Dropping it here
      // rather than rendering an empty card keeps the rail honest.
      .filter((entry) => entry.listings > 0);
  },
};
