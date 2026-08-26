import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Product } from "@/lib/schemas/product";
import { priceRange } from "@/lib/schemas/product";
import { canListProducts } from "@/lib/schemas/verification";
import { conversionRate } from "@/lib/schemas/campaign";
import { enquiryValue } from "@/lib/schemas/enquiry";
import { sleep, makeId } from "@/lib/utils";
import type { Campaign } from "@/lib/schemas/campaign";
import type {
  BrowsingRepo,
  CampaignRepo,
  EnquiryFilter,
  EnquiryRepo,
  InsightsRepo,
  MarketplaceFacets,
  MarketplaceFilter,
  MarketplaceListing,
  MarketplaceRepo,
  ProductPerformance,
  RegionDemand,
} from "@/lib/data/types";
import type { Enquiry } from "@/lib/schemas/enquiry";
import { getSnapshot, mutate } from "./db";

/*
  Mock implementations of the marketplace, enquiry, campaign and insights
  repositories.

  Public visibility is decided in exactly one place — `publicListings()` below.
  A product reaches the marketplace only if it is active AND its manufacturer is
  cleared to list. Everything else (search, storefronts, related products)
  builds on that, so verification status can never leak a listing by accident.
*/

const FAST = 140;
const NORMAL = 260;

function now() {
  return new Date().toISOString();
}

/**
 * How many enquiries each listing has attracted — the marketplace's only real
 * signal of demand, and what "most relevant" means when there is no query.
 */
function demandByProduct(): Map<string, number> {
  const map = new Map<string, number>();
  for (const enquiry of getSnapshot().enquiries) {
    map.set(enquiry.productId, (map.get(enquiry.productId) ?? 0) + 1);
  }
  return map;
}

function publicListings(): MarketplaceListing[] {
  const { manufacturers, products } = getSnapshot();
  const byId = new Map(manufacturers.map((m) => [m.id, m]));
  const demand = demandByProduct();

  return products.flatMap((product) => {
    if (product.status !== "active") return [];
    const manufacturer = byId.get(product.manufacturerId);
    if (!manufacturer || !canListProducts(manufacturer.status)) return [];
    return [
      { product, manufacturer, enquiryCount: demand.get(product.id) ?? 0 },
    ];
  });
}

function lowestPrice(product: Product) {
  return priceRange(product.priceBands).min;
}

/** Cheap relevance score: name beats SKU beats description. */
function relevance(listing: MarketplaceListing, query: string) {
  const q = query.toLowerCase();
  const { product, manufacturer } = listing;
  let score = 0;
  if (product.name.toLowerCase().startsWith(q)) score += 100;
  if (product.name.toLowerCase().includes(q)) score += 50;
  if (product.sku.toLowerCase().includes(q)) score += 30;
  if (product.category.toLowerCase().includes(q)) score += 20;
  if (manufacturer.tradingName.toLowerCase().includes(q)) score += 15;
  if (product.description.toLowerCase().includes(q)) score += 5;
  return score;
}

function matches(listing: MarketplaceListing, filter: MarketplaceFilter) {
  const { product, manufacturer } = listing;

  if (filter.manufacturerId && product.manufacturerId !== filter.manufacturerId) {
    return false;
  }
  if (filter.categories?.length && !filter.categories.includes(product.category)) {
    return false;
  }
  if (
    filter.regions?.length &&
    !product.availableRegions.some((r) => filter.regions!.includes(r))
  ) {
    return false;
  }
  if (filter.maxUnitPrice !== undefined && lowestPrice(product) > filter.maxUnitPrice) {
    return false;
  }
  if (
    filter.maxLeadTimeDays !== undefined &&
    product.leadTimeDays > filter.maxLeadTimeDays
  ) {
    return false;
  }
  if (filter.verifiedOnly && manufacturer.status !== "approved") return false;

  const query = filter.query?.trim().toLowerCase();
  if (query) {
    const haystack = [
      product.name,
      product.sku,
      product.category,
      product.description,
      product.packSize,
      manufacturer.tradingName,
      manufacturer.legalName,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function sortListings(
  listings: MarketplaceListing[],
  sort: MarketplaceFilter["sort"],
  query?: string,
) {
  const sorted = [...listings];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => lowestPrice(a.product) - lowestPrice(b.product));
    case "price-desc":
      return sorted.sort((a, b) => lowestPrice(b.product) - lowestPrice(a.product));
    case "lead-time":
      return sorted.sort((a, b) => a.product.leadTimeDays - b.product.leadTimeDays);
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.product.createdAt).getTime() -
          new Date(a.product.createdAt).getTime(),
      );
    default:
      if (query?.trim()) {
        return sorted.sort((a, b) => relevance(b, query) - relevance(a, query));
      }
      // No query: rank by what the network is actually buying, then lead with
      // fully verified suppliers. Alphabetical would put "Aluminium Tile Trim"
      // on the front page ahead of cement and rebar, which is the opposite of
      // relevant for a construction-supply marketplace.
      {
        return sorted.sort((a, b) => {
          const byDemand = b.enquiryCount - a.enquiryCount;
          if (byDemand !== 0) return byDemand;
          const verified =
            Number(b.manufacturer.status === "approved") -
            Number(a.manufacturer.status === "approved");
          if (verified !== 0) return verified;
          return a.product.name.localeCompare(b.product.name);
        });
      }
  }
}

/**
 * Facets are counted against everything *except* the dimension being faceted,
 * so selecting a category doesn't zero out every other category's count and
 * strand the user in a dead end.
 */
function buildFacets(
  all: MarketplaceListing[],
  filter: MarketplaceFilter,
  matched: MarketplaceListing[],
): MarketplaceFacets {
  const count = <T extends string>(
    items: MarketplaceListing[],
    pick: (l: MarketplaceListing) => T[],
  ) => {
    const map = new Map<T, number>();
    for (const item of items) {
      for (const value of pick(item)) map.set(value, (map.get(value) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([value, n]) => ({ value, count: n }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };

  const withoutCategories = all.filter((l) =>
    matches(l, { ...filter, categories: undefined }),
  );
  const withoutRegions = all.filter((l) => matches(l, { ...filter, regions: undefined }));

  const prices = matched.map((l) => lowestPrice(l.product));
  const manufacturerCounts = new Map<string, { name: string; count: number }>();
  for (const l of matched) {
    const entry = manufacturerCounts.get(l.manufacturer.id) ?? {
      name: l.manufacturer.tradingName,
      count: 0,
    };
    entry.count += 1;
    manufacturerCounts.set(l.manufacturer.id, entry);
  }

  return {
    categories: count(withoutCategories, (l) => [l.product.category]),
    regions: count(withoutRegions, (l) => l.product.availableRegions),
    manufacturers: [...manufacturerCounts.entries()]
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    total: matched.length,
  };
}

export const marketplaceRepo: MarketplaceRepo = {
  async search(filter) {
    await sleep(NORMAL);
    const all = publicListings();
    const matched = all.filter((l) => matches(l, filter));
    return {
      listings: sortListings(matched, filter.sort, filter.query),
      facets: buildFacets(all, filter, matched),
    };
  },

  async getListing(productId) {
    await sleep(FAST);
    return publicListings().find((l) => l.product.id === productId) ?? null;
  },

  async getStorefront(manufacturerId) {
    await sleep(NORMAL);
    const { manufacturers } = getSnapshot();
    const manufacturer = manufacturers.find((m) => m.id === manufacturerId);
    // A manufacturer that has not cleared verification has no public store.
    if (!manufacturer || !canListProducts(manufacturer.status)) return null;
    const products = publicListings()
      .filter((l) => l.manufacturer.id === manufacturerId)
      .map((l) => l.product);
    return { manufacturer, products };
  },

  async listStorefronts() {
    await sleep(NORMAL);
    const listings = publicListings();
    const map = new Map<string, { manufacturer: Manufacturer; productCount: number }>();
    for (const l of listings) {
      const entry = map.get(l.manufacturer.id) ?? {
        manufacturer: l.manufacturer,
        productCount: 0,
      };
      entry.productCount += 1;
      map.set(l.manufacturer.id, entry);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.productCount - a.productCount ||
        a.manufacturer.tradingName.localeCompare(b.manufacturer.tradingName),
    );
  },

  async relatedFromManufacturer(productId, limit = 4) {
    await sleep(FAST);
    const listings = publicListings();
    const source = listings.find((l) => l.product.id === productId);
    if (!source) return [];
    return listings
      .filter(
        (l) =>
          l.manufacturer.id === source.manufacturer.id && l.product.id !== productId,
      )
      // Same category first — the closest substitute or complement.
      .sort(
        (a, b) =>
          Number(b.product.category === source.product.category) -
          Number(a.product.category === source.product.category),
      )
      .slice(0, limit)
      .map((l) => l.product);
  },

  async similarFromOthers(productId, limit = 4) {
    await sleep(FAST);
    const listings = publicListings();
    const source = listings.find((l) => l.product.id === productId);
    if (!source) return [];
    return listings
      .filter(
        (l) =>
          l.product.category === source.product.category &&
          l.manufacturer.id !== source.manufacturer.id,
      )
      .sort((a, b) => lowestPrice(a.product) - lowestPrice(b.product))
      .slice(0, limit);
  },
};

// ---------------------------------------------------------------------------
// Browsing history
// ---------------------------------------------------------------------------

const RECENT_LIMIT = 24;

export const browsingRepo: BrowsingRepo = {
  async recent(limit = 8) {
    await sleep(FAST);
    const { recentProductIds } = getSnapshot();
    const published = new Map(publicListings().map((l) => [l.product.id, l.product]));
    // Anything since unpublished simply drops out of the rail.
    return recentProductIds
      .map((id) => published.get(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, limit);
  },

  async record(productId) {
    mutate((db) => ({
      ...db,
      recentProductIds: [
        productId,
        ...db.recentProductIds.filter((id) => id !== productId),
      ].slice(0, RECENT_LIMIT),
    }));
  },

  async clear() {
    mutate((db) => ({ ...db, recentProductIds: [] }));
  },
};

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

function replaceEnquiry(id: string, update: (e: Enquiry) => Enquiry) {
  let updated: Enquiry | undefined;
  mutate((db) => ({
    ...db,
    enquiries: db.enquiries.map((e) => {
      if (e.id !== id) return e;
      updated = update(e);
      return updated;
    }),
  }));
  if (!updated) throw new Error(`Enquiry not found: ${id}`);
  return updated;
}

export const enquiryRepo: EnquiryRepo = {
  async list(filter: EnquiryFilter = {}) {
    await sleep(NORMAL);
    const query = filter.query?.trim().toLowerCase();
    return getSnapshot()
      .enquiries.filter((e) => {
        if (filter.manufacturerId && e.manufacturerId !== filter.manufacturerId) {
          return false;
        }
        if (filter.status?.length && !filter.status.includes(e.status)) return false;
        if (query) {
          const haystack = [e.shopName, e.contactName, e.productName, e.county]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      // Newest first: an unanswered enquiry loses value by the hour.
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },

  async getById(id) {
    await sleep(FAST);
    return getSnapshot().enquiries.find((e) => e.id === id) ?? null;
  },

  async create(input) {
    await sleep(NORMAL);
    const enquiry: Enquiry = {
      ...input,
      id: makeId("enq"),
      status: "new",
      createdAt: now(),
      respondedAt: null,
      quotedUnitPrice: null,
      quotedLeadTimeDays: null,
      quoteNote: null,
    };
    mutate((db) => ({ ...db, enquiries: [enquiry, ...db.enquiries] }));
    return enquiry;
  },

  async quote(id, quote) {
    await sleep(NORMAL);
    return replaceEnquiry(id, (e) => ({
      ...e,
      status: "quoted",
      respondedAt: now(),
      quotedUnitPrice: quote.unitPrice,
      quotedLeadTimeDays: quote.leadTimeDays,
      quoteNote: quote.note ?? null,
    }));
  },

  async setStatus(id, status) {
    await sleep(FAST);
    return replaceEnquiry(id, (e) => ({
      ...e,
      status,
      respondedAt: e.respondedAt ?? (status === "new" ? null : now()),
    }));
  },
};

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export const campaignRepo: CampaignRepo = {
  async listByManufacturer(manufacturerId) {
    await sleep(NORMAL);
    const rank: Record<Campaign["status"], number> = {
      active: 0,
      paused: 1,
      draft: 2,
      ended: 3,
    };
    return getSnapshot()
      .campaigns.filter((c) => c.manufacturerId === manufacturerId)
      .sort(
        (a, b) =>
          rank[a.status] - rank[b.status] ||
          b.metrics.enquiries - a.metrics.enquiries,
      );
  },

  async getById(id) {
    await sleep(FAST);
    return getSnapshot().campaigns.find((c) => c.id === id) ?? null;
  },

  async create(input) {
    await sleep(NORMAL);
    const campaign: Campaign = {
      ...input,
      id: makeId("cmp"),
      spentKsh: 0,
      metrics: { impressions: 0, views: 0, enquiries: 0, orders: 0 },
    };
    mutate((db) => ({ ...db, campaigns: [campaign, ...db.campaigns] }));
    return campaign;
  },

  async update(id, patch) {
    await sleep(FAST);
    let updated: Campaign | undefined;
    mutate((db) => ({
      ...db,
      campaigns: db.campaigns.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Campaign not found: ${id}`);
    return updated;
  },

  async setStatus(id, status) {
    return campaignRepo.update(id, { status });
  },
};

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

/*
  Insights are derived, never stored. Views come from the campaigns that carried
  a listing; enquiries and orders come from the enquiry records themselves. That
  means the insights page can never disagree with the inbox or the campaign
  list — a class of bug that plagues dashboards built on a separate metrics
  table.
*/

function viewsByProduct(manufacturerId: string): Map<string, number> {
  const { campaigns, products } = getSnapshot();
  const own = products.filter((p) => p.manufacturerId === manufacturerId);
  const map = new Map<string, number>();

  for (const campaign of campaigns.filter((c) => c.manufacturerId === manufacturerId)) {
    // A campaign with no explicit products promoted the whole catalogue.
    const targets = campaign.productIds.length
      ? own.filter((p) => campaign.productIds.includes(p.id))
      : own;
    if (targets.length === 0) continue;
    const share = Math.round(campaign.metrics.views / targets.length);
    for (const p of targets) map.set(p.id, (map.get(p.id) ?? 0) + share);
  }
  return map;
}

export const insightsRepo: InsightsRepo = {
  async productPerformance(manufacturerId) {
    await sleep(NORMAL);
    const { products, enquiries } = getSnapshot();
    const views = viewsByProduct(manufacturerId);

    const rows: ProductPerformance[] = products
      .filter((p) => p.manufacturerId === manufacturerId)
      .map((product) => {
        const own = enquiries.filter((e) => e.productId === product.id);
        const orders = own.filter((e) => e.status === "accepted").length;
        const productViews = views.get(product.id) ?? 0;
        return {
          product,
          views: productViews,
          enquiries: own.length,
          orders,
          conversionPercent: productViews ? (own.length / productViews) * 100 : 0,
        };
      });

    return rows.sort((a, b) => b.enquiries - a.enquiries || b.views - a.views);
  },

  async regionDemand(manufacturerId) {
    await sleep(NORMAL);
    const own = getSnapshot().enquiries.filter(
      (e) => e.manufacturerId === manufacturerId,
    );
    const map = new Map<string, { enquiries: number; orders: number }>();
    for (const e of own) {
      const entry = map.get(e.region) ?? { enquiries: 0, orders: 0 };
      entry.enquiries += 1;
      if (e.status === "accepted") entry.orders += 1;
      map.set(e.region, entry);
    }
    const total = own.length || 1;

    const rows: RegionDemand[] = [...map.entries()].map(([region, v]) => ({
      region,
      enquiries: v.enquiries,
      orders: v.orders,
      shareOfEnquiriesPercent: (v.enquiries / total) * 100,
    }));
    return rows.sort((a, b) => b.enquiries - a.enquiries);
  },

  async summary(manufacturerId) {
    await sleep(NORMAL);
    const { enquiries, campaigns, products } = getSnapshot();
    const own = enquiries.filter((e) => e.manufacturerId === manufacturerId);
    const byId = new Map(products.map((p) => [p.id, p]));

    const views = campaigns
      .filter((c) => c.manufacturerId === manufacturerId)
      .reduce((sum, c) => sum + c.metrics.views, 0);

    const fallback = (productId: string) => {
      const p = byId.get(productId);
      return p ? priceRange(p.priceBands).min : 0;
    };

    const quoted = own.filter((e) => e.quotedUnitPrice !== null);
    const accepted = own.filter((e) => e.status === "accepted");
    const answered = own.filter((e) => e.status !== "new");

    const responseHours = answered
      .filter((e) => e.respondedAt)
      .map(
        (e) =>
          (new Date(e.respondedAt!).getTime() - new Date(e.createdAt).getTime()) /
          3_600_000,
      )
      .filter((h) => h >= 0);

    return {
      views,
      enquiries: own.length,
      orders: accepted.length,
      quotedValueKsh: quoted.reduce(
        (sum, e) => sum + enquiryValue(e, fallback(e.productId)),
        0,
      ),
      acceptedValueKsh: accepted.reduce(
        (sum, e) => sum + enquiryValue(e, fallback(e.productId)),
        0,
      ),
      responseRatePercent: own.length ? (answered.length / own.length) * 100 : 0,
      avgResponseHours: responseHours.length
        ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length
        : 0,
    };
  },
};

export { conversionRate };
