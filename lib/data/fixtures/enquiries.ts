import type { Enquiry, EnquiryStatus } from "@/lib/schemas/enquiry";
import { regionForCounty, type Region } from "@/lib/schemas/common";
import { seedManufacturers } from "./manufacturers";
import { seedProducts } from "./products";

/*
  Enquiry seed data.

  Hardware shops are named and located plausibly, and enquiry quantities sit at
  or above each product's MOQ so the quoted figures reconcile with the price
  bands on the listing. Statuses and ages are spread so the manufacturer's inbox
  has a realistic mix: unanswered enquiries at the top, older quotes waiting on
  the buyer, and closed history below.
*/

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString();

type Shop = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  county: string;
};

const SHOPS: Shop[] = [
  { name: "Mwangi Hardware & Timber", contact: "James Mwangi", phone: "+254722334455", email: "sales@mwangihardware.co.ke", county: "Kiambu" },
  { name: "Kisumu Builders Centre", contact: "Linet Akinyi", phone: "+254711889001", email: "orders@kisumubuilders.co.ke", county: "Kisumu" },
  { name: "Nakuru Mega Hardware", contact: "Simon Kariuki", phone: "+254733112900", email: "info@nakurumega.co.ke", county: "Nakuru" },
  { name: "Coast Building Supplies", contact: "Amina Yusuf", phone: "+254720445566", email: "amina@coastbuilding.co.ke", county: "Mombasa" },
  { name: "Kakamega Hardware Mart", contact: "Brian Wafula", phone: "+254701223399", email: "kakamegamart@gmail.com", county: "Kakamega" },
  { name: "Thika Road Hardware", contact: "Njeri Kamau", phone: "+254736778811", email: "sales@thikaroadhw.co.ke", county: "Nairobi" },
  { name: "Eldoret Construction Depot", contact: "Kevin Kimutai", phone: "+254714009922", email: "depot@eldoretcd.co.ke", county: "Uasin Gishu" },
  { name: "Machakos Hardware Stores", contact: "Peter Musyoka", phone: "+254705667788", email: "machakoshw@gmail.com", county: "Machakos" },
  { name: "Meru Timber & Hardware", contact: "Faith Gakii", phone: "+254729551144", email: "meruhardware@gmail.com", county: "Meru" },
  { name: "Kisii Builders Hub", contact: "Dennis Otieno", phone: "+254718332255", email: "kisiihub@gmail.com", county: "Kisii" },
  { name: "Nyeri Hardware Centre", contact: "Alice Wangari", phone: "+254723447799", email: "nyerihw@gmail.com", county: "Nyeri" },
  { name: "Bungoma Supply Stores", contact: "Michael Barasa", phone: "+254707118844", email: "bungomasupply@gmail.com", county: "Bungoma" },
];

type Spec = {
  productId: string;
  shop: number;
  qty: number;
  status: EnquiryStatus;
  /** Hours since the enquiry arrived. */
  age: number;
  message?: string;
  quote?: { unitPrice: number; leadDays: number; note?: string };
  neededInDays?: number;
};

const SPECS: Spec[] = [
  // Savannah Cement — busy inbox, VIP account
  { productId: "prd_sav_opc32", shop: 0, qty: 400, status: "new", age: 3, neededInDays: 7, message: "Need this for a school block in Ruiru. Can you confirm delivery to site?" },
  { productId: "prd_sav_opc42", shop: 5, qty: 250, status: "new", age: 9, neededInDays: 5, message: "Repeat order. Same terms as last month if possible." },
  { productId: "prd_sav_block", shop: 7, qty: 5200, status: "new", age: 26, neededInDays: 14, message: "Perimeter wall project. Do you deliver to Machakos town?" },
  { productId: "prd_sav_opc32", shop: 7, qty: 900, status: "quoted", age: 52, quote: { unitPrice: 712, leadDays: 2, note: "Top band price. Free delivery on this volume." }, neededInDays: 10 },
  { productId: "prd_sav_paving", shop: 0, qty: 340, status: "quoted", age: 74, quote: { unitPrice: 1355, leadDays: 5 } },
  { productId: "prd_sav_mortar", shop: 5, qty: 220, status: "accepted", age: 120, quote: { unitPrice: 596, leadDays: 3 } },
  { productId: "prd_sav_opc42", shop: 0, qty: 600, status: "accepted", age: 190, quote: { unitPrice: 786, leadDays: 2 } },
  { productId: "prd_sav_screed", shop: 7, qty: 80, status: "declined", age: 210, quote: { unitPrice: 745, leadDays: 4, note: "Below our delivery threshold for Machakos this month." } },
  { productId: "prd_sav_culvert", shop: 8, qty: 30, status: "closed", age: 340, quote: { unitPrice: 4620, leadDays: 8 } },

  // RV Steel
  { productId: "prd_rv_d12", shop: 2, qty: 420, status: "new", age: 5, neededInDays: 6, message: "Slab reinforcement for a 4-storey. Need mill certs with delivery." },
  { productId: "prd_rv_d16", shop: 6, qty: 180, status: "new", age: 18, neededInDays: 9 },
  { productId: "prd_rv_mesh", shop: 1, qty: 60, status: "quoted", age: 44, quote: { unitPrice: 4020, leadDays: 4 } },
  { productId: "prd_rv_bp30", shop: 4, qty: 1200, status: "quoted", age: 66, quote: { unitPrice: 598, leadDays: 5, note: "Cut to 3.2 m as requested." } },
  { productId: "prd_rv_d20", shop: 2, qty: 120, status: "accepted", age: 150, quote: { unitPrice: 3170, leadDays: 4 } },
  { productId: "prd_rv_shs", shop: 6, qty: 400, status: "accepted", age: 260, quote: { unitPrice: 370, leadDays: 5 } },
  { productId: "prd_rv_gutter", shop: 11, qty: 60, status: "closed", age: 300, quote: { unitPrice: 1180, leadDays: 5 } },

  // Kisumu Timber
  { productId: "prd_kt_ply18", shop: 1, qty: 65, status: "new", age: 7, neededInDays: 8, message: "Shopfitting job. Do you have stock or is this made to order?" },
  { productId: "prd_kt_door", shop: 9, qty: 40, status: "new", age: 30, neededInDays: 21 },
  { productId: "prd_kt_mdf", shop: 1, qty: 120, status: "quoted", age: 58, quote: { unitPrice: 2360, leadDays: 4 } },
  { productId: "prd_kt_cypress", shop: 11, qty: 1400, status: "quoted", age: 96, quote: { unitPrice: 222, leadDays: 3 } },
  { productId: "prd_kt_window", shop: 9, qty: 12, status: "accepted", age: 175, quote: { unitPrice: 8900, leadDays: 9 } },
  { productId: "prd_kt_blockboard", shop: 4, qty: 55, status: "closed", age: 320, quote: { unitPrice: 3120, leadDays: 5 } },

  // Equator Paints
  { productId: "prd_eq_vinyl20", shop: 5, qty: 420, status: "new", age: 2, neededInDays: 4, message: "Need 12 drums in Pearl White. Can you tint to order?" },
  { productId: "prd_eq_weather", shop: 10, qty: 160, status: "new", age: 14, neededInDays: 12 },
  { productId: "prd_eq_gloss4", shop: 0, qty: 240, status: "quoted", age: 40, quote: { unitPrice: 596, leadDays: 2 } },
  { productId: "prd_eq_roof", shop: 3, qty: 300, status: "quoted", age: 70, quote: { unitPrice: 344, leadDays: 3 } },
  { productId: "prd_eq_undercoat", shop: 5, qty: 500, status: "accepted", age: 130, quote: { unitPrice: 246, leadDays: 2 } },
  { productId: "prd_eq_sealant", shop: 10, qty: 288, status: "accepted", age: 205, quote: { unitPrice: 366, leadDays: 3 } },
  { productId: "prd_eq_texture", shop: 0, qty: 40, status: "declined", age: 240, quote: { unitPrice: 2140, leadDays: 4, note: "Colour requested is not in the standard range." } },

  // MK Roofing — conditionally approved, so orders are disabled; enquiries still arrive
  { productId: "prd_mk_ibr", shop: 10, qty: 900, status: "new", age: 11, neededInDays: 15, message: "Church roof in Karatina. Need 32 gauge if available." },
  { productId: "prd_mk_tile", shop: 8, qty: 260, status: "new", age: 34, neededInDays: 20 },
  { productId: "prd_mk_underlay", shop: 10, qty: 18, status: "quoted", age: 88, quote: { unitPrice: 11850, leadDays: 7 } },

  // Coastal Sanitaryware
  { productId: "prd_cs_wc", shop: 3, qty: 45, status: "new", age: 6, neededInDays: 10, message: "Apartment fit-out, 45 units. Any trade discount at this volume?" },
  { productId: "prd_cs_tank", shop: 3, qty: 28, status: "quoted", age: 50, quote: { unitPrice: 13150, leadDays: 6 } },
  { productId: "prd_cs_ppr", shop: 5, qty: 2400, status: "quoted", age: 92, quote: { unitPrice: 151, leadDays: 3 } },
  { productId: "prd_cs_basin", shop: 3, qty: 60, status: "accepted", age: 165, quote: { unitPrice: 6100, leadDays: 5 } },
  { productId: "prd_cs_sink", shop: 5, qty: 30, status: "accepted", age: 280, quote: { unitPrice: 8980, leadDays: 5 } },

  // Nyanza Tiles
  { productId: "prd_nt_6060", shop: 9, qty: 640, status: "new", age: 4, neededInDays: 11, message: "Need matching batch numbers across the whole order." },
  { productId: "prd_nt_wood", shop: 1, qty: 320, status: "new", age: 22, neededInDays: 14 },
  { productId: "prd_nt_8080", shop: 2, qty: 400, status: "quoted", age: 62, quote: { unitPrice: 1695, leadDays: 5 } },
  { productId: "prd_nt_wall", shop: 9, qty: 380, status: "accepted", age: 140, quote: { unitPrice: 820, leadDays: 4 } },
  { productId: "prd_nt_adhesive", shop: 11, qty: 140, status: "accepted", age: 250, quote: { unitPrice: 868, leadDays: 3 } },
  { productId: "prd_nt_grout", shop: 1, qty: 240, status: "closed", age: 330, quote: { unitPrice: 368, leadDays: 3 } },

  // Thika Electricals
  { productId: "prd_te_cable25", shop: 5, qty: 40, status: "new", age: 8, neededInDays: 5, message: "Urgent — site is waiting. Can you dispatch today?" },
  { productId: "prd_te_socket", shop: 0, qty: 600, status: "new", age: 28, neededInDays: 12 },
  { productId: "prd_te_cable15", shop: 8, qty: 60, status: "quoted", age: 46, quote: { unitPrice: 5720, leadDays: 3 } },
  { productId: "prd_te_led", shop: 0, qty: 400, status: "quoted", age: 84, quote: { unitPrice: 688, leadDays: 4 } },
  { productId: "prd_te_mcb", shop: 8, qty: 500, status: "accepted", age: 155, quote: { unitPrice: 376, leadDays: 3 } },
  { productId: "prd_te_conduit", shop: 5, qty: 3200, status: "accepted", age: 235, quote: { unitPrice: 79, leadDays: 2 } },
  { productId: "prd_te_earth", shop: 0, qty: 120, status: "closed", age: 310, quote: { unitPrice: 1275, leadDays: 4 } },
];

/**
 * How long the supplier actually took to answer.
 *
 * Every answered enquiry used to be stamped at exactly twelve hours, which put
 * the records in direct conflict with the response time each storefront
 * advertises — Savannah promises 3h on its store page and had answered nothing
 * inside 3h — and left the console's "past their own promise" column counting
 * zero. Response time is now derived from that promise, with a deliberate
 * minority answered late so the oversight column has something real to show.
 *
 * Keyed off the enquiry's index rather than randomised, so the seed is stable
 * across reloads and two runs of the test suite agree.
 */
function responseHoursFor(promisedHours: number, index: number) {
  const promise = promisedHours || 24;
  // Every fourth answered enquiry misses the promise; the rest land inside it.
  const late = index % 4 === 3;
  const factor = late ? 2.5 + (index % 3) : 0.35 + (index % 5) * 0.12;
  return promise * factor;
}

export function seedEnquiries(): Enquiry[] {
  const products = seedProducts();
  // The supplier's own advertised response time is what a late reply is late
  // against, so it has to be in scope here.
  const promisedHours = new Map(
    seedManufacturers().map((m) => [m.id, m.storefront.avgResponseHours]),
  );

  return SPECS.map((spec, index) => {
    const product = products.find((p) => p.id === spec.productId);
    if (!product) throw new Error(`Enquiry fixture references unknown product: ${spec.productId}`);
    const shop = SHOPS[spec.shop];

    return {
      id: `enq_${String(index + 1).padStart(3, "0")}`,
      manufacturerId: product.manufacturerId,
      productId: product.id,
      productName: product.name,

      shopName: shop.name,
      contactName: shop.contact,
      phone: shop.phone,
      email: shop.email,
      county: shop.county,
      region: (regionForCounty(shop.county) ?? "Nairobi Metro") as Region,

      quantity: spec.qty,
      unit: product.unit,
      message: spec.message ?? "",
      neededBy: spec.neededInDays ? daysAhead(spec.neededInDays) : null,

      status: spec.status,
      createdAt: spec.age < 48 ? hoursAgo(spec.age) : daysAgo(spec.age / 24),
      // Clamped to 90% of the enquiry's age so a reply can never land in the
      // future, however slow the supplier's promise makes it.
      respondedAt:
        spec.status === "new"
          ? null
          : hoursAgo(
              spec.age -
                Math.min(
                  responseHoursFor(promisedHours.get(product.manufacturerId) ?? 24, index),
                  spec.age * 0.9,
                ),
            ),

      quotedUnitPrice: spec.quote?.unitPrice ?? null,
      quotedLeadTimeDays: spec.quote?.leadDays ?? null,
      quoteNote: spec.quote?.note ?? null,
    } satisfies Enquiry;
  });
}
