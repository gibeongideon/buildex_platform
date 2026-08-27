import { priceRange } from "@/lib/schemas/product";
import { canListProducts, slaHoursRemaining } from "@/lib/schemas/verification";
import { enquiryValue } from "@/lib/schemas/enquiry";
import {
  emptyStorefront,
  expiredDocuments,
  slaBreaches,
  slowEnquiries,
  sortExceptions,
  stalledApplication,
  type OpsException,
} from "@/lib/rules/ops";
import { sleep } from "@/lib/utils";
import type { AdminRepo, PlatformSummary } from "@/lib/data/types";
import { getSnapshot } from "./db";
import { NORMAL } from "./latency";

/*
  Buildex Admin's cross-entity reads.

  Every method here takes ONE pass over the snapshot and indexes what it needs,
  rather than looping per manufacturer. The console's overview touches every
  entity at once, so the naive shape — a repository call per supplier — would be
  the obvious way to make this page slow. Same reasoning as `publicListings()`
  in the marketplace.
*/

/** Indexes built once per call and shared by everything that needs them. */
function index() {
  const { manufacturers, products, enquiries, campaigns } = getSnapshot();
  const manufacturerById = new Map(manufacturers.map((m) => [m.id, m]));

  const live = new Map<string, number>();
  const drafts = new Map<string, number>();
  for (const p of products) {
    const bucket = p.status === "active" ? live : p.status === "draft" ? drafts : null;
    if (bucket) bucket.set(p.manufacturerId, (bucket.get(p.manufacturerId) ?? 0) + 1);
  }

  const openEnquiries = new Map<string, number>();
  for (const e of enquiries) {
    if (e.status === "new" || e.status === "quoted") {
      openEnquiries.set(e.manufacturerId, (openEnquiries.get(e.manufacturerId) ?? 0) + 1);
    }
  }

  const pastSla = new Map<string, number>();
  for (const m of manufacturers) {
    const n = m.checks.filter((c) => {
      const h = slaHoursRemaining(c);
      return h !== null && h < 0;
    }).length;
    if (n > 0) pastSla.set(m.id, n);
  }

  // Cheapest band per listing, so the value sums below stay one pass rather
  // than a linear find per enquiry — which is what this file promises above.
  const unitPrice = new Map<string, number>();
  for (const p of products) unitPrice.set(p.id, priceRange(p.priceBands).min);

  return {
    manufacturers,
    products,
    enquiries,
    campaigns,
    manufacturerById,
    live,
    drafts,
    openEnquiries,
    pastSla,
    unitPrice,
  };
}

export const adminRepo: AdminRepo = {
  async summary() {
    await sleep(NORMAL);
    const ix = index();

    const awaitingDecision = ix.manufacturers.filter((m) =>
      ["submitted", "in_review", "action_needed"].includes(m.status),
    ).length;

    const unanswered = ix.enquiries.filter((e) => e.status === "new");
    const quotedOrNew = ix.enquiries.filter(
      (e) => e.status === "new" || e.status === "quoted",
    );
    const accepted = ix.enquiries.filter((e) => e.status === "accepted");

    const summary: PlatformSummary = {
      applicationsAwaitingDecision: awaitingDecision,
      checksPastSla: [...ix.pastSla.values()].reduce((a, b) => a + b, 0),
      verifiedSuppliers: ix.manufacturers.filter((m) => m.status === "approved").length,
      suppliersTotal: ix.manufacturers.length,
      liveListings: [...ix.live.values()].reduce((a, b) => a + b, 0),
      draftListings: [...ix.drafts.values()].reduce((a, b) => a + b, 0),
      enquiriesUnanswered: unanswered.length,
      enquiryValueInFlightKsh: quotedOrNew.reduce(
        (sum, e) => sum + enquiryValue(e, ix.unitPrice.get(e.productId) ?? 0),
        0,
      ),
      acceptedValueKsh: accepted.reduce(
        (sum, e) => sum + enquiryValue(e, ix.unitPrice.get(e.productId) ?? 0),
        0,
      ),
      activeCampaigns: ix.campaigns.filter((c) => c.status === "active").length,
      campaignSpendKsh: ix.campaigns.reduce((sum, c) => sum + c.spentKsh, 0),
    };
    return summary;
  },

  async exceptions() {
    await sleep(NORMAL);
    const ix = index();
    const out: OpsException[] = [];

    for (const m of ix.manufacturers) {
      out.push(...slaBreaches(m));
      out.push(...expiredDocuments(m));
      const stalled = stalledApplication(m);
      if (stalled) out.push(stalled);
      out.push(...slowEnquiries(m, ix.enquiries));
      const empty = emptyStorefront(m, ix.live.get(m.id) ?? 0);
      if (empty) out.push(empty);
    }

    return sortExceptions(out);
  },

  async manufacturerRows() {
    await sleep(NORMAL);
    const ix = index();
    // Worst first: anything past SLA, then anything awaiting a decision.
    const rank = (status: string) =>
      status === "action_needed"
        ? 0
        : status === "in_review" || status === "submitted"
          ? 1
          : status === "conditionally_approved"
            ? 2
            : status === "suspended" || status === "rejected"
              ? 3
              : 4;

    return ix.manufacturers
      .map((manufacturer) => ({
        manufacturer,
        liveListings: ix.live.get(manufacturer.id) ?? 0,
        draftListings: ix.drafts.get(manufacturer.id) ?? 0,
        openEnquiries: ix.openEnquiries.get(manufacturer.id) ?? 0,
        pastSlaChecks: ix.pastSla.get(manufacturer.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.pastSlaChecks - a.pastSlaChecks ||
          rank(a.manufacturer.status) - rank(b.manufacturer.status) ||
          a.manufacturer.tradingName.localeCompare(b.manufacturer.tradingName),
      );
  },

  async listingRows() {
    await sleep(NORMAL);
    const ix = index();
    const statusRank: Record<string, number> = {
      draft: 0,
      out_of_stock: 1,
      active: 2,
      archived: 3,
    };

    return ix.products
      .flatMap((product) => {
        const manufacturer = ix.manufacturerById.get(product.manufacturerId);
        return manufacturer ? [{ product, manufacturer }] : [];
      })
      // Drafts first: they are the ones an admin might need to act on.
      .sort(
        (a, b) =>
          (statusRank[a.product.status] ?? 9) - (statusRank[b.product.status] ?? 9) ||
          a.product.name.localeCompare(b.product.name),
      );
  },

  async enquiryRows() {
    await sleep(NORMAL);
    const ix = index();
    const now = Date.now();

    return ix.enquiries
      .flatMap((enquiry) => {
        const manufacturer = ix.manufacturerById.get(enquiry.manufacturerId);
        if (!manufacturer) return [];
        const createdAt = new Date(enquiry.createdAt).getTime();
        /*
          Two different measurements, and the console needs both. An unanswered
          enquiry has a wait that is still running; an answered one has a
          response time that is final. Reporting only the first hid every late
          reply, because a late reply is still a reply.
        */
        const waitedHours =
          enquiry.status === "new" ? (now - createdAt) / 3_600_000 : null;
        const responseHours = enquiry.respondedAt
          ? (new Date(enquiry.respondedAt).getTime() - createdAt) / 3_600_000
          : null;
        return [{ enquiry, manufacturer, waitedHours, responseHours }];
      })
      // Longest unanswered wait first, then newest.
      .sort(
        (a, b) =>
          (b.waitedHours ?? -1) - (a.waitedHours ?? -1) ||
          new Date(b.enquiry.createdAt).getTime() - new Date(a.enquiry.createdAt).getTime(),
      );
  },

  async campaignRows() {
    await sleep(NORMAL);
    const ix = index();
    const rank: Record<string, number> = { active: 0, paused: 1, draft: 2, ended: 3 };

    return ix.campaigns
      .flatMap((campaign) => {
        const manufacturer = ix.manufacturerById.get(campaign.manufacturerId);
        return manufacturer ? [{ campaign, manufacturer }] : [];
      })
      .sort(
        (a, b) =>
          (rank[a.campaign.status] ?? 9) - (rank[b.campaign.status] ?? 9) ||
          b.campaign.spentKsh - a.campaign.spentKsh,
      );
  },
};

export { canListProducts };
