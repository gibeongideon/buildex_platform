import type {
  BillStatus,
  Currency,
  Vendor,
  VendorBill,
  VendorCountry,
  VendorType,
} from "@/lib/schemas/supplier";
import { COUNTRY_CURRENCY } from "@/lib/schemas/supplier";

/*
  Buildex Interiors' purchase ledger.

  These vendors are taken verbatim from the live ledger, including the records
  that are incomplete or contradictory — a Kampala address filed under Kenya, a
  dialling code that is neither, names with no contact details at all. They are
  left exactly as captured on purpose: the console's job is to surface those,
  not to quietly correct them into something that would no longer match the
  source system. `lib/rules/procurement.ts` is where they get flagged.

  The bills are the one invented part, and they are derived rather than typed
  out: a deterministic schedule per vendor, in that vendor's own currency. No
  real invoice numbers or amounts are reproduced here.
*/

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString();

type Seed = {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: VendorCountry;
  type: VendorType;
  /** Overrides the country default; used where the two disagree. */
  currency?: Currency;
  status?: Vendor["status"];
  paymentTermDays?: number | null;
  notes?: string;
};

const SEEDS: Seed[] = [
  {
    name: "Primeply Industries Ltd",
    phone: "+254 722 336583",
    email: "info@primeplyindustries.co.ke",
    city: "Nakuru",
    country: "Kenya",
    type: "Timber & boards",
    paymentTermDays: 30,
  },
  {
    name: "Zhong Bang",
    email: "Zhongbang2018@gmail.com",
    city: "Kampala",
    country: "Uganda",
    type: "Timber & boards",
    paymentTermDays: 14,
  },
  // No contact details, no country, no terms — captured against a payment and
  // never completed.
  { name: "Shiku Brown", type: "Services", paymentTermDays: null },
  {
    name: "Evergreen Wood Ltd",
    country: "Uganda",
    type: "Timber & boards",
    paymentTermDays: 21,
  },
  { name: "Transporter KE", type: "Transport & haulage", currency: "KES", paymentTermDays: 7 },
  {
    name: "Diamond Engineering Company",
    phone: "+254 790 430996",
    city: "Kikuyu",
    country: "Kenya",
    type: "Engineering & fabrication",
    paymentTermDays: 30,
  },
  {
    name: "Neema Enterprises",
    phone: "+254 717 006483",
    city: "Nakuru",
    country: "Kenya",
    type: "Hardware & fittings",
    paymentTermDays: 14,
  },
  {
    name: "Terravi Gypsum Centre",
    phone: "+254 789 007440",
    city: "Kamiti Rd.",
    country: "Kenya",
    type: "Gypsum & ceilings",
    paymentTermDays: 30,
  },
  {
    // As captured: a Kampala address filed under Kenya, with a Tanzanian
    // dialling code that is only a country prefix. Left as-is; flagged, not fixed.
    name: "Border Clearance-Imports-UG",
    phone: "+255",
    city: "Kampala",
    country: "Kenya",
    type: "Border clearance",
    paymentTermDays: 7,
  },
  {
    name: "Transporter/Import-UG",
    type: "Transport & haulage",
    currency: "UGX",
    paymentTermDays: 7,
  },
  {
    name: "Number One wood Ltd",
    city: "Kabete",
    country: "Kenya",
    type: "Timber & boards",
    paymentTermDays: 30,
  },
  {
    name: "Shama Support Services",
    phone: "+254 722 709818",
    email: "shamassinteriors@gmail.com",
    city: "Thika",
    country: "Kenya",
    type: "Services",
    paymentTermDays: 14,
  },
  {
    name: "China Forestry",
    phone: "+256 741 038755",
    email: "woodsales@cfid-ug.com",
    city: "LUZIRA",
    country: "Uganda",
    type: "Timber & boards",
    paymentTermDays: 45,
  },
  { name: "Ocean Ply Limited", type: "Timber & boards", paymentTermDays: null },
];

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function seedVendors(): Vendor[] {
  return SEEDS.map((s, index) => ({
    id: `ven_${slug(s.name)}`,
    name: s.name,
    phone: s.phone ?? null,
    email: s.email ?? null,
    city: s.city ?? null,
    country: s.country ?? null,
    // A vendor with no country still has to be billed in something; the ledger
    // defaults those to shillings, which is what the override captures.
    currency: s.currency ?? (s.country ? COUNTRY_CURRENCY[s.country] : "KES"),
    type: s.type,
    status: s.status ?? "active",
    paymentTermDays: s.paymentTermDays === undefined ? 30 : s.paymentTermDays,
    notes: s.notes ?? "",
    createdAt: daysAgo(420 - index * 11),
  }));
}

/**
 * Bills per vendor, derived rather than listed.
 *
 * Deterministic: the same vendor always produces the same schedule, so two
 * loads of the console never disagree about what is owed. Amounts scale with
 * the currency's own magnitude — a Ugandan shilling figure is ~30x its Kenyan
 * equivalent, and a bill that ignored that would look absurd to anyone who
 * actually works with these numbers.
 */
export function seedVendorBills(): VendorBill[] {
  const vendors = seedVendors();
  const bills: VendorBill[] = [];

  const scale: Record<Currency, number> = { KES: 1, UGX: 30, TZS: 20, USD: 0.0078 };

  vendors.forEach((vendor, vi) => {
    // Vendors captured with nothing but a name have one stray bill; established
    // ones have a run of them. That asymmetry is the point — it is why the thin
    // records exist at all.
    const count = vendor.email || vendor.phone ? 4 + (vi % 3) : 1 + (vi % 2);

    for (let i = 0; i < count; i += 1) {
      const ageDays = 12 + i * 27 + vi * 3;
      const base = 180_000 + ((vi * 7 + i * 13) % 11) * 65_000;
      const amount = Math.round((base * scale[vendor.currency]) / 1000) * 1000;
      const terms = vendor.paymentTermDays ?? 30;

      // Older bills are settled; the newest are still moving. One vendor in
      // three carries something genuinely late, which is what the ageing view
      // exists to show.
      let status: BillStatus;
      if (i === 0 && vi % 3 === 0) status = "posted";
      else if (i === 0 && vi % 3 === 1) status = "partly_paid";
      else if (i === 0) status = "draft";
      else if (i === 1 && vi % 4 === 0) status = "posted";
      else status = "paid";

      const amountPaid =
        status === "paid"
          ? amount
          : status === "partly_paid"
            ? Math.round(amount * 0.4)
            : 0;

      bills.push({
        id: `bill_${vendor.id}_${i + 1}`,
        vendorId: vendor.id,
        reference: `${vendor.name.slice(0, 3).toUpperCase()}-${2026 - Math.floor(ageDays / 365)}-${String(1000 + vi * 17 + i).slice(-4)}`,
        currency: vendor.currency,
        amount,
        amountPaid,
        billDate: daysAgo(ageDays),
        dueDate:
          ageDays - terms > 0 ? daysAgo(ageDays - terms) : daysAhead(terms - ageDays),
        status,
        description:
          vendor.type === "Border clearance"
            ? "Clearing and forwarding, Malaba"
            : vendor.type === "Transport & haulage"
              ? "Haulage"
              : `${vendor.type} supply`,
      });
    }
  });

  return bills.sort(
    (a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime(),
  );
}
