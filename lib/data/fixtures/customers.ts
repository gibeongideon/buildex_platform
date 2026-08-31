import type { Customer, CustomerType } from "@/lib/schemas/customer";
import type { MembershipTier } from "@/lib/schemas/membership";
import { regionForCounty, type Region } from "@/lib/schemas/common";
import { BUYERS, buyerIdFor } from "./demand";

/*
  Seeded customers — the buying side of the marketplace.

  These are not invented from nothing. `demand.ts` already generates a
  deterministic year of deliveries against a fixed pool of buying shops, and
  those events are what the supplier's Insights screen has been reading since
  Phase 2. Seeding customer accounts from the *same* pool, with the same ids
  via `buyerIdFor`, means three things fall out for free:

    1. A seeded customer has genuine commercial history on the day the account
       screens ship, so the Trust Profile and the spend analytics are derived
       rather than decorated.
    2. The shop a supplier sees in their repeat-buyer table is the same record
       as the customer who placed the orders. One history, two sides.
    3. Nothing has to be invented later. When a real orders table arrives at the
       cutover, the join is already `customer.buyerId`.

  The trade buyers below carry that history. The four consumer accounts after
  them deliberately do not: a homeowner who registered last week has no orders,
  and the account screens have to read correctly for them too — that is the
  state every real new user starts in.
*/

/** A plausible trading address per region, so location reads as real. */
const REGION_HOME: Record<Region, { county: string; town: string }> = {
  "Nairobi Metro": { county: "Nairobi", town: "Nairobi" },
  Central: { county: "Nyeri", town: "Nyeri" },
  Coast: { county: "Mombasa", town: "Mombasa" },
  Eastern: { county: "Meru", town: "Meru" },
  "North Eastern": { county: "Garissa", town: "Garissa" },
  Nyanza: { county: "Kisumu", town: "Kisumu" },
  "Rift Valley": { county: "Uasin Gishu", town: "Eldoret" },
  Western: { county: "Kakamega", town: "Kakamega" },
};

/** Where each named shop actually trades, where it is more specific than the region. */
const SHOP_HOME: Record<string, { county: string; town: string }> = {
  "Thika Road Hardware": { county: "Kiambu", town: "Thika" },
  "Karen Building Merchants": { county: "Nairobi", town: "Karen" },
  "Kajiado Builders Yard": { county: "Kajiado", town: "Kitengela" },
  "Machakos Hardware Stores": { county: "Machakos", town: "Machakos" },
  "Central Highlands Supplies": { county: "Murang'a", town: "Murang'a" },
  "Coast Building Supplies": { county: "Kilifi", town: "Kilifi" },
  "Ukambani Hardware": { county: "Kitui", town: "Kitui" },
  "Kisii Builders Hub": { county: "Kisii", town: "Kisii" },
  "Naivasha Site Supplies": { county: "Nakuru", town: "Naivasha" },
  "Rift Valley Hardware": { county: "Nakuru", town: "Nakuru" },
  "Western Depot Supplies": { county: "Bungoma", town: "Bungoma" },
  "Kakamega Builders Yard": { county: "Kakamega", town: "Kakamega" },
};

const STREETS = [
  "Biashara Street",
  "Kenyatta Avenue",
  "Market Road",
  "Industrial Area, Plot 14",
  "Mama Ngina Street",
  "Stadium Road",
  "Jogoo Road",
  "Oginga Odinga Street",
];

/*
  A spread of membership across the seeded shops, cycled deterministically.

  Deliberately weighted toward the middle: a marketplace where every seeded
  account is on the top tier tells a reviewer nothing about how the tiers read
  next to each other, and the free tier has to be visible because it is the one
  most customers actually start on.
*/
const MEMBERSHIP_CYCLE: MembershipTier[] = [
  "business",
  "member",
  "pro",
  "member",
  "free",
  "pro",
  "member",
  "business",
  "free",
  "member",
];

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return new Date(date.getTime() - days * 86_400_000).toISOString();
}

/** Kenyan mobile numbers that are valid in shape and obviously fictional. */
function phoneFor(index: number) {
  return `+2547${String(11_000_000 + index * 111_111).slice(0, 8)}`;
}

function tradeCustomer(
  buyer: { name: string; region: Region },
  index: number,
): Customer {
  const home = SHOP_HOME[buyer.name] ?? REGION_HOME[buyer.region];
  const membership = MEMBERSHIP_CYCLE[index % MEMBERSHIP_CYCLE.length];
  const registeredDaysAgo = 120 + index * 17;

  /*
    Business verification is not universal on purpose. Two of the seeded shops
    are left unverified so the account screens have to render the state a
    customer is actually in most often — declared but not yet checked — and so
    the verification level derives to `verified_member` rather than
    `trusted_business` for them however much they have bought.
  */
  const businessVerified = index % 7 !== 3;

  return {
    id: `cus_${slug(buyer.name)}`,
    name: buyer.name,
    email: `buying@${slug(buyer.name)}.co.ke`,
    phone: phoneFor(index),
    emailVerified: true,
    phoneVerified: true,
    physicalAddress: `${STREETS[index % STREETS.length]}, ${home.town}`,
    town: home.town,
    county: home.county,
    region: regionForCounty(home.county) ?? buyer.region,
    customerType: "hardware_shop",
    business: {
      legalName: `${buyer.name} Limited`,
      tradingName: buyer.name,
      kraPin: `P${String(500_000_000 + index * 1_234_567).slice(0, 9)}K`,
      brsNumber: `PVT-${slug(buyer.name).toUpperCase().slice(0, 7)}`,
      verifiedAt: businessVerified ? daysAgo(registeredDaysAgo - 21) : null,
    },
    authorizedUsers: [],
    membership,
    membershipStartedAt: membership === "free" ? null : daysAgo(registeredDaysAgo - 30),
    membershipRenewsAt: membership === "free" ? null : daysAgo(-30),
    // Derived on read by `deriveVerificationLevel`; the stored value is the
    // floor every account starts at.
    verificationLevel: "registered",
    buyerId: buyerIdFor(buyer.name),
    createdAt: daysAgo(registeredDaysAgo),
    updatedAt: daysAgo(index),
  };
}

/*
  The other side of the customer base.

  Chapter 9 widens "customer" well past the hardware shop — §9.7 names
  homeowners, fundis and small contractors as the primary users of BUILD FREE
  and BUILD MEMBER. If every seeded account were a shop with a year of orders,
  every screen would be designed against the easy case and the empty states
  would be discovered by a real user instead of by us.
*/
const CONSUMERS: {
  name: string;
  type: CustomerType;
  county: string;
  town: string;
  address: string;
  membership: MembershipTier;
  daysRegistered: number;
}[] = [
  {
    name: "Grace Wanjiru",
    type: "homeowner",
    county: "Kiambu",
    town: "Ruiru",
    address: "Kamakis, Eastern Bypass",
    membership: "free",
    daysRegistered: 9,
  },
  {
    name: "Peter Otieno",
    type: "fundi",
    county: "Kisumu",
    town: "Kisumu",
    address: "Kondele, off Kakamega Road",
    membership: "member",
    daysRegistered: 74,
  },
  {
    name: "Amani Build Contractors",
    type: "contractor",
    county: "Nairobi",
    town: "Nairobi",
    address: "Ngong Road, Adams Arcade",
    membership: "pro",
    daysRegistered: 210,
  },
  {
    name: "Mount Kenya Academy",
    type: "institution",
    county: "Nyeri",
    town: "Nyeri",
    address: "Kenyatta Road, Nyeri Town",
    membership: "business",
    daysRegistered: 160,
  },
];

function consumerCustomer(
  spec: (typeof CONSUMERS)[number],
  index: number,
): Customer {
  const isBusiness = spec.type === "contractor" || spec.type === "institution";

  return {
    id: `cus_${slug(spec.name)}`,
    name: spec.name,
    email: `${slug(spec.name)}@example.co.ke`,
    phone: phoneFor(BUYERS.length + index),
    emailVerified: true,
    // The newest account has not verified its phone yet — that is the state a
    // freshly registered customer is in, and the dashboard has to prompt for it.
    phoneVerified: spec.daysRegistered > 14,
    physicalAddress: spec.address,
    town: spec.town,
    county: spec.county,
    region: regionForCounty(spec.county) ?? "Nairobi Metro",
    customerType: spec.type,
    business: isBusiness
      ? {
          legalName: `${spec.name} Limited`,
          tradingName: spec.name,
          kraPin: `P${String(600_000_000 + index * 7_654_321).slice(0, 9)}J`,
          brsNumber: null,
          verifiedAt: null,
        }
      : null,
    authorizedUsers: [],
    membership: spec.membership,
    membershipStartedAt:
      spec.membership === "free" ? null : daysAgo(spec.daysRegistered - 2),
    membershipRenewsAt: spec.membership === "free" ? null : daysAgo(-28),
    verificationLevel: "registered",
    // No delivery history: these accounts have not bought anything yet.
    buyerId: null,
    createdAt: daysAgo(spec.daysRegistered),
    updatedAt: daysAgo(Math.min(spec.daysRegistered, 3)),
  };
}

export function seedCustomers(): Customer[] {
  return [
    ...BUYERS.map(tradeCustomer),
    ...CONSUMERS.map(consumerCustomer),
  ];
}

/**
 * The account the demo is "signed in" as.
 *
 * A trade buyer with real history, because it is the account that makes every
 * screen legible on first load. The demo panel can switch it, and registering
 * through `/join` replaces it with the new account.
 */
export const DEMO_CUSTOMER_ID = `cus_${slug("Mwangi Hardware & Timber")}`;
