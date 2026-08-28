import { COUNTIES, type ProductCategory, type Region } from "@/lib/schemas/common";
import { priceAtQuantity, priceRange, type Product } from "@/lib/schemas/product";

/*
  Where the material actually went.

  This is the stand-in for a deliveries table the platform does not have yet.
  Every other insight on the manufacturer's Insights screen is derived from
  these events, so when a real fulfilment record arrives at the backend cutover
  the only thing that changes is where `demandEventsFor` reads from — the shape
  below is deliberately the shape a delivery row would have.

  Three rules keep the generated history from contradicting the catalogue it is
  supposed to describe:

    1. A product only ships to regions it says it serves. Otherwise the heat map
       would show a supplier delivering to counties their own listing says they
       cannot reach.
    2. Value is `priceAtQuantity` on that product's own bands at that quantity,
       so revenue reconciles with the published price list rather than being a
       second, freely invented number.
    3. History starts when the product was created. A listing added this morning
       does not get twelve months of deliveries behind it — which also means the
       screen behaves correctly for anything imported during a demo.

  The generator is deterministic: seeded per product id and snapped to whole
  days, so the same catalogue produces the same history for the whole day.
  Charts that reshuffle between renders are worse than no charts.
*/

export type DemandEvent = {
  id: string;
  manufacturerId: string;
  productId: string;
  category: ProductCategory;
  county: string;
  region: Region;
  /** In the product's own unit. */
  quantity: number;
  valueKsh: number;
  at: string;
  /** Stable per shop, so repeat business is derivable. */
  buyerId: string;
  buyerName: string;
};

/*
  Relative construction activity by county.

  Ordering follows where building materials actually move in Kenya — the
  Nairobi metro first, then the secondary cities and the corridors out of them,
  with the arid north last. These are weights for a demo, not published
  statistics, and nothing in the interface presents them as a national figure.
*/
const COUNTY_WEIGHT: Record<string, number> = {
  Nairobi: 100,
  Kiambu: 64,
  Nakuru: 49,
  Mombasa: 46,
  Machakos: 31,
  Kajiado: 29,
  Kisumu: 28,
  "Uasin Gishu": 26,
  Kilifi: 22,
  Meru: 20,
  Kakamega: 18,
  Nyeri: 17,
  Bungoma: 15,
  Kericho: 14,
  "Murang'a": 14,
  Kisii: 13,
  "Trans Nzoia": 13,
  Narok: 12,
  Laikipia: 12,
  Embu: 11,
  Kwale: 11,
  Makueni: 11,
  Bomet: 10,
  Nandi: 10,
  Migori: 10,
  "Homa Bay": 9,
  Siaya: 9,
  Kirinyaga: 9,
  Nyandarua: 8,
  Kitui: 8,
  Vihiga: 8,
  Busia: 8,
  Nyamira: 7,
  Baringo: 7,
  "Taita Taveta": 6,
  "Tharaka Nithi": 6,
  "Elgeyo Marakwet": 6,
  Garissa: 5,
  Isiolo: 5,
  "West Pokot": 4,
  Samburu: 3,
  "Tana River": 3,
  Lamu: 3,
  Turkana: 3,
  Marsabit: 2,
  Wajir: 2,
  Mandera: 2,
};

/*
  Hardware shops the deliveries went to, each in the region it trades from.

  The region matters: a shop takes delivery near where it is. Picking buyers at
  random put Mombasa Marine Hardware on a delivery into Embu, which reads as
  nonsense the moment anyone looks at the repeat-buyer table.
*/
const BUYERS: { name: string; region: Region }[] = [
  { name: "Mwangi Hardware & Timber", region: "Nairobi Metro" },
  { name: "Thika Road Hardware", region: "Nairobi Metro" },
  { name: "Karen Building Merchants", region: "Nairobi Metro" },
  { name: "Kajiado Builders Yard", region: "Nairobi Metro" },
  { name: "Machakos Hardware Stores", region: "Nairobi Metro" },
  { name: "Nyeri Highlands Hardware", region: "Central" },
  { name: "Central Highlands Supplies", region: "Central" },
  { name: "Mombasa Marine Hardware", region: "Coast" },
  { name: "Coast Building Supplies", region: "Coast" },
  { name: "Meru Timber & Hardware", region: "Eastern" },
  { name: "Ukambani Hardware", region: "Eastern" },
  { name: "Garissa Trade Stores", region: "North Eastern" },
  { name: "Lakeside Building Centre", region: "Nyanza" },
  { name: "Kisii Builders Hub", region: "Nyanza" },
  { name: "Eldoret Trade Supplies", region: "Rift Valley" },
  { name: "Naivasha Site Supplies", region: "Rift Valley" },
  { name: "Rift Valley Hardware", region: "Rift Valley" },
  { name: "Western Depot Supplies", region: "Western" },
  { name: "Kakamega Builders Yard", region: "Western" },
];

/** Deterministic PRNG — same catalogue in, same history out. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hash(text: string) {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

/** Pick an index from `weights` proportionally. */
function weightedPick(weights: number[], roll: number) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cursor = roll * total;
  for (let i = 0; i < weights.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return i;
  }
  return weights.length - 1;
}

const DAY = 86_400_000;
/** Anything older than this is not what a supplier is looking at. */
const WINDOW_DAYS = 365;

export function demandEventsFor(products: Product[]): DemandEvent[] {
  /*
    Snapped to midnight, so the history is stable for the whole day rather than
    shifting by milliseconds between calls. A deliveries table records a date,
    not a moment, and a trend chart that re-buckets mid-session is a bug.
  */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = today.getTime();
  const events: DemandEvent[] = [];

  for (const product of products) {
    // Drafts and archived listings were never on the marketplace to be bought.
    if (product.status !== "active") continue;

    const counties = COUNTIES.filter((c) =>
      product.availableRegions.includes(c.region),
    );
    if (counties.length === 0) continue;

    const weights = counties.map((c) => COUNTY_WEIGHT[c.name] ?? 4);
    const random = mulberry32(hash(product.id));

    const createdAt = new Date(product.createdAt).getTime();
    const spanDays = Math.min(
      WINDOW_DAYS,
      Math.max(0, Math.floor((now - createdAt) / DAY)),
    );
    if (spanDays < 1) continue;

    /*
      Roughly one delivery every four or five days for a listing that serves a
      lot of ground, fewer for a narrow one — scaled by how long it has been
      live, so a young listing has a short history rather than a sparse year.
    */
    const reach = product.availableRegions.length;
    const count = Math.max(2, Math.round((spanDays / 4.5) * (0.5 + reach * 0.22)));

    for (let i = 0; i < count; i += 1) {
      const county = counties[weightedPick(weights, random())];
      const daysAgo = Math.floor(random() * spanDays);

      /*
        Order sizes cluster just above MOQ with a long tail — the shape wholesale
        actually trades in, where most orders are a van load and a few are a
        site's whole requirement.
      */
      const tail = random();
      const multiple = tail > 0.93 ? 6 + random() * 8 : 1 + random() * 2.4;
      const quantity = Math.max(product.moq, Math.round(product.moq * multiple));

      const unitPrice =
        priceAtQuantity(product.priceBands, quantity) ??
        priceRange(product.priceBands).min;

      // A shop in the region the material was delivered into.
      const local = BUYERS.filter((b) => b.region === county.region);
      const pool = local.length > 0 ? local : BUYERS;
      const buyer = pool[Math.floor(random() * pool.length)];

      events.push({
        id: `dmd_${product.id}_${i}`,
        manufacturerId: product.manufacturerId,
        productId: product.id,
        category: product.category,
        county: county.name,
        region: county.region,
        quantity,
        valueKsh: Math.round(unitPrice * quantity),
        at: new Date(now - daysAgo * DAY).toISOString(),
        buyerId: `shop_${hash(buyer.name)}`,
        buyerName: buyer.name,
      });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
