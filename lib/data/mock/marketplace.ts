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
  CategoryGap,
  CountyDemand,
  DemandFilter,
  DemandPoint,
  EnquiryFilter,
  EnquiryRepo,
  InsightsRepo,
  MarketplaceFacets,
  MarketplaceFilter,
  MarketplaceListing,
  MarketplaceRepo,
  ProductPerformance,
  RegionDemand,
  RepeatBuyer,
} from "@/lib/data/types";
import { demandEventsFor, type DemandEvent } from "@/lib/data/fixtures/demand";
import type { Enquiry } from "@/lib/schemas/enquiry";
import { getSnapshot, mutate } from "./db";
import { FAST, NORMAL } from "./latency";

/*
  Mock implementations of the marketplace, enquiry, campaign and insights
  repositories.

  Public visibility is decided in exactly one place — `publicListings()` below.
  A product reaches the marketplace only if it is active AND its manufacturer is
  cleared to list. Everything else (search, storefronts, related products)
  builds on that, so verification status can never leak a listing by accident.
*/

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

  async listingsByIds(ids) {
    await sleep(FAST);
    const byId = new Map(publicListings().map((l) => [l.product.id, l]));
    // Ordered by the caller's ids so the columns keep the order they were
    // picked in, and silently dropping anything no longer public.
    return ids.flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [listing] : [];
    });
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

/*
  The delivery history, cached per catalogue revision.

  `demandEventsFor` is pure and deterministic, but it walks every active listing
  and generates a year of events, so recomputing it for each of the five demand
  queries on one screen render would be wasteful. The cache key is the product
  list identity, which `mutate` replaces on every write — so an import or a
  status change invalidates it exactly when it should.
*/
let demandCache: { key: Product[]; events: DemandEvent[] } | null = null;

function demandEvents(): DemandEvent[] {
  const { products } = getSnapshot();
  if (demandCache?.key === products) return demandCache.events;
  const events = demandEventsFor(products);
  demandCache = { key: products, events };
  return events;
}

function matchesFilter(event: DemandEvent, filter?: DemandFilter) {
  if (filter?.productId && event.productId !== filter.productId) return false;
  if (filter?.category && event.category !== filter.category) return false;
  return true;
}

function ownDemand(manufacturerId: string, filter?: DemandFilter) {
  return demandEvents().filter(
    (e) => e.manufacturerId === manufacturerId && matchesFilter(e, filter),
  );
}

/** Below this, a category median is the other listing rather than a market. */
const MIN_PRICE_COMPARATORS = 3;

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

  async demandByCounty(manufacturerId, filter) {
    await sleep(NORMAL);
    const rows = new Map<string, CountyDemand>();

    for (const event of ownDemand(manufacturerId, filter)) {
      const row = rows.get(event.county) ?? {
        county: event.county,
        region: event.region,
        quantity: 0,
        valueKsh: 0,
        deliveries: 0,
        intensity: 0,
      };
      row.quantity += event.quantity;
      row.valueKsh += event.valueKsh;
      row.deliveries += 1;
      rows.set(event.county, row);
    }

    const list = [...rows.values()].sort((a, b) => b.valueKsh - a.valueKsh);
    /*
      Intensity is scaled against the busiest county in *this* result, not a
      global maximum, so filtering to one product still uses the whole ramp
      rather than collapsing the map to one faint dot.
    */
    const top = list[0]?.valueKsh ?? 0;
    for (const row of list) row.intensity = top ? row.valueKsh / top : 0;
    return list;
  },

  async demandTrend(manufacturerId, filter) {
    await sleep(FAST);
    const months = new Map<string, DemandPoint>();

    for (const event of ownDemand(manufacturerId, filter)) {
      const date = new Date(event.at);
      const month = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const point = months.get(month) ?? { month, valueKsh: 0, deliveries: 0 };
      point.valueKsh += event.valueKsh;
      point.deliveries += 1;
      months.set(month, point);
    }

    return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  },

  async categoryGaps(manufacturerId) {
    await sleep(NORMAL);
    const { products } = getSnapshot();
    const own = products.filter((p) => p.manufacturerId === manufacturerId);

    const ownCategories = new Set(own.map((p) => p.category));
    const ownRegions = new Set(own.flatMap((p) => p.availableRegions));
    if (ownRegions.size === 0) return [];

    const gaps = new Map<string, CategoryGap & { suppliers: Set<string> }>();
    for (const event of demandEvents()) {
      // Someone else's delivery, in a region this supplier already reaches,
      // in something they do not sell.
      if (event.manufacturerId === manufacturerId) continue;
      if (!ownRegions.has(event.region)) continue;
      if (ownCategories.has(event.category)) continue;

      const gap =
        gaps.get(event.category) ??
        {
          category: event.category,
          deliveries: 0,
          valueKsh: 0,
          competitors: 0,
          suppliers: new Set<string>(),
        };
      gap.deliveries += 1;
      gap.valueKsh += event.valueKsh;
      gap.suppliers.add(event.manufacturerId);
      gaps.set(event.category, gap);
    }

    return [...gaps.values()]
      .map(({ suppliers, ...gap }) => ({ ...gap, competitors: suppliers.size }))
      .sort((a, b) => b.valueKsh - a.valueKsh);
  },

  async pricePosition(manufacturerId) {
    await sleep(NORMAL);
    const { products, manufacturers } = getSnapshot();

    // Only listings a buyer can actually see count as the market.
    const live = products.filter((p) => {
      if (p.status !== "active") return false;
      const owner = manufacturers.find((m) => m.id === p.manufacturerId);
      return owner ? canListProducts(owner.status) : false;
    });

    return live
      .filter((p) => p.manufacturerId === manufacturerId)
      .map((product) => {
        /*
          Same category *and* same unit. Category alone mixes a cement bag with
          a concrete block and a square metre of glass, and a median across
          those is not a price — it reported a block at KSh 82/piece as 88%
          below a "market" made mostly of KSh 712 bags.
        */
        const peers = live.filter(
          (p) =>
            p.category === product.category &&
            p.unit === product.unit &&
            p.id !== product.id,
        );
        const entries = peers
          .map((p) => priceRange(p.priceBands).min)
          .sort((a, b) => a - b);

        const median = entries.length
          ? entries.length % 2
            ? entries[(entries.length - 1) / 2]
            : (entries[entries.length / 2 - 1] + entries[entries.length / 2]) / 2
          : 0;

        const yours = priceRange(product.priceBands).min;
        return {
          product,
          yourEntryKsh: yours,
          marketMedianKsh: median,
          differencePercent: median ? ((yours - median) / median) * 100 : 0,
          listingsCompared: entries.length,
        };
      })
      /*
        A median needs a market behind it. With one or two comparable listings
        it is just the other listing, and the arithmetic produces confident
        nonsense — a 200mm block came out "98% below market" against a single
        450mm culvert pipe, same category and same unit but not remotely the
        same product. Three is the smallest sample where the middle value means
        anything; below that the screen says nothing rather than something
        untrue.
      */
      .filter((row) => row.listingsCompared >= MIN_PRICE_COMPARATORS)
      .sort((a, b) => a.differencePercent - b.differencePercent);
  },

  async repeatBuyers(manufacturerId) {
    await sleep(FAST);
    const buyers = new Map<string, RepeatBuyer & { countySet: Set<string> }>();

    for (const event of ownDemand(manufacturerId)) {
      const buyer =
        buyers.get(event.buyerId) ??
        {
          buyerId: event.buyerId,
          buyerName: event.buyerName,
          deliveries: 0,
          valueKsh: 0,
          lastAt: event.at,
          counties: [],
          countySet: new Set<string>(),
        };
      buyer.deliveries += 1;
      buyer.valueKsh += event.valueKsh;
      if (event.at > buyer.lastAt) buyer.lastAt = event.at;
      buyer.countySet.add(event.county);
      buyers.set(event.buyerId, buyer);
    }

    return [...buyers.values()]
      // One delivery is a customer, not a repeat buyer.
      .filter((b) => b.deliveries > 1)
      .map(({ countySet, ...buyer }) => ({
        ...buyer,
        counties: [...countySet].sort(),
      }))
      .sort((a, b) => b.valueKsh - a.valueKsh);
  },
};

export { conversionRate };
