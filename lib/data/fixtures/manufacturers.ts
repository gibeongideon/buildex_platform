import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { ManufacturerStatus, VerificationCheck } from "@/lib/schemas/verification";
import { VERIFICATION_CHECKS } from "@/lib/schemas/verification";
import { DOCUMENT_TYPES } from "@/lib/schemas/document";
import type { DocumentStatus, DocumentTypeKey } from "@/lib/schemas/document";

/*
  Seed data. Fictional companies, realistic Kenyan shapes: county spread, BRS
  and KRA PIN formats, +254 numbers.

  The status spread is deliberate — the ops verification queue (Phase 3) and
  the marketplace (Phase 4) both need something interesting to render on day
  one, and Phase 1 needs an existing KRA PIN to collide with so the duplicate
  detection path is walkable.
*/

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY).toISOString();
}

function daysAhead(n: number) {
  return new Date(Date.now() + n * DAY).toISOString();
}

/** Builds the five-check pipeline in a given shape. */
function buildChecks(
  spec: Partial<Record<string, { status: VerificationCheck["status"]; note?: string; blocking?: string[] }>>,
  submittedDaysAgo: number,
): VerificationCheck[] {
  return VERIFICATION_CHECKS.map((meta) => {
    const s = spec[meta.key];
    const status = s?.status ?? "pending";
    const started =
      status === "pending" ? null : daysAgo(Math.max(submittedDaysAgo - 0.5, 0));
    return {
      key: meta.key,
      status,
      startedAt: started,
      completedAt:
        status === "passed" ? daysAgo(Math.max(submittedDaysAgo - 1, 0)) : null,
      note: s?.note ?? null,
      blockingDocuments: s?.blocking ?? [],
    };
  });
}

function buildDocuments(
  prefix: string,
  overrides: Partial<Record<DocumentTypeKey, { status: DocumentStatus; expiresAt?: string | null; note?: string }>> = {},
  uploadedDaysAgo = 10,
) {
  return DOCUMENT_TYPES.filter((d) => d.required || overrides[d.key]).map((meta, i) => {
    const o = overrides[meta.key];
    return {
      id: `${prefix}_doc_${i}`,
      type: meta.key,
      fileName: `${meta.key}.pdf`,
      fileSize: 240_000 + i * 61_000,
      mimeType: "application/pdf" as const,
      uploadedAt: daysAgo(uploadedDaysAgo),
      status: o?.status ?? ("accepted" as DocumentStatus),
      expiresAt:
        o?.expiresAt !== undefined
          ? o.expiresAt
          : meta.tracksExpiry
            ? daysAhead(180)
            : null,
      reviewNote: o?.note ?? null,
    };
  });
}

type Seed = {
  id: string;
  status: ManufacturerStatus;
  contactName: string;
  email: string;
  phone: string;
  legalName: string;
  tradingName: string;
  brsNumber: string;
  kraPin: string;
  yearEstablished: number;
  physicalAddress: string;
  county: string;
  website: string;
  categories: Manufacturer["categories"];
  capacityBand: string;
  distributionRegions: Manufacturer["distributionRegions"];
  directors: { name: string; id: string; role: Manufacturer["directors"][number]["role"]; own: number; phone: string }[];
  submittedDaysAgo: number;
  subscription: { package: "free" | "basic" | "premium" | "vip"; billingCycle: "monthly" | "annual" } | null;
  riskFlagged?: boolean;
  reviewNotes?: string[];
  checkSpec?: Parameters<typeof buildChecks>[0];
  docOverrides?: Parameters<typeof buildDocuments>[1];
  /** Public storefront content. Derived where omitted. */
  store?: Partial<Manufacturer["storefront"]>;
};

/**
 * Storefront defaults, scaled off how long the manufacturer has traded and how
 * much it declares it produces. Better-established suppliers answer faster and
 * have fulfilled more orders, which is what buyers actually filter on.
 */
function buildStorefront(s: Seed): Manufacturer["storefront"] {
  const years = new Date().getFullYear() - s.yearEstablished;
  const large = s.capacityBand === "over_100m" || s.capacityBand === "20m_100m";

  return {
    tagline: `${s.categories[0]} manufacturer in ${s.county}`,
    about: `${s.legalName} has manufactured ${s.categories
      .join(", ")
      .toLowerCase()} in ${s.county} since ${s.yearEstablished}, supplying hardware retailers across ${s.distributionRegions.join(
      ", ",
    )}. Orders are quoted against published quantity bands, and delivery is arranged from the plant.`,
    responseRatePercent: Math.min(98, 62 + years * 2 + (large ? 8 : 0)),
    avgResponseHours: large ? 3 : years > 6 ? 6 : 12,
    certifications: large
      ? ["KEBS Standardisation Mark", "ISO 9001:2015"]
      : ["KEBS Standardisation Mark"],
    paymentTerms: large
      ? ["M-Pesa", "Bank transfer", "30-day credit (approved accounts)"]
      : ["M-Pesa", "Bank transfer"],
    deliveryPolicy: large
      ? "Free delivery on orders above KSh 250,000 within declared regions. Otherwise charged at cost."
      : "Delivery charged at cost. Buyer collection welcome at the plant.",
    minOrderPolicy: "Minimum order quantity is set per product and shown on each listing.",
    ordersFulfilled: Math.max(0, years * (large ? 260 : 95) + (large ? 180 : 40)),
    ...s.store,
  };
}

const SEEDS: Seed[] = [
  {
    id: "mfr_savannah",
    status: "approved",
    contactName: "Grace Wanjiru",
    email: "grace.wanjiru@savannahcement.co.ke",
    phone: "+254722145880",
    legalName: "Savannah Cement Works Limited",
    tradingName: "Savannah Cement",
    brsNumber: "PVT-7XKLM9Y",
    kraPin: "P051234567M",
    yearEstablished: 2009,
    physicalAddress: "Plot 114, Athi River Industrial Area",
    county: "Machakos",
    website: "https://savannahcement.co.ke",
    categories: ["Cement & Concrete"],
    capacityBand: "over_100m",
    distributionRegions: ["Nairobi Metro", "Eastern", "Central", "Coast"],
    directors: [
      { name: "Grace Wanjiru", id: "22458901", role: "Managing Director", own: 60, phone: "+254722145880" },
      { name: "Peter Mwangi", id: "19883412", role: "Director", own: 40, phone: "+254733901255" },
    ],
    store: {
      tagline: "Cement and concrete products at scale, from Athi River",
      about:
        "Savannah Cement Works has milled cement at Athi River since 2009 and is one of the larger independent producers serving the Nairobi metro. The plant runs two grinding lines and holds finished stock for same-week dispatch, which is why most orders ship within 48 hours. Blocks are cured a full 28 days before they leave the yard.",
      certifications: ["KEBS Standardisation Mark", "ISO 9001:2015", "ISO 14001:2015"],
    },
    submittedDaysAgo: 240,
    subscription: { package: "vip", billingCycle: "annual" },
  },
  {
    id: "mfr_rift_steel",
    status: "approved",
    contactName: "Daniel Kiprotich",
    email: "d.kiprotich@riftvalleysteel.co.ke",
    phone: "+254711330204",
    legalName: "Rift Valley Steel Mills Limited",
    tradingName: "RV Steel",
    brsNumber: "PVT-3QRT8ZP",
    kraPin: "P052987341K",
    yearEstablished: 2014,
    physicalAddress: "Nakuru–Eldoret Highway, Industrial Zone B",
    county: "Nakuru",
    website: "https://rvsteel.co.ke",
    categories: ["Steel & Reinforcement", "Roofing"],
    capacityBand: "20m_100m",
    distributionRegions: ["Rift Valley", "Western", "Nyanza"],
    directors: [
      { name: "Daniel Kiprotich", id: "24110987", role: "Managing Director", own: 55, phone: "+254711330204" },
      { name: "Esther Chelagat", id: "26773401", role: "Director", own: 45, phone: "+254720884411" },
    ],
    store: {
      tagline: "BS4449 grade 500 reinforcement, rolled in Nakuru",
      about:
        "Rift Valley Steel Mills rolls deformed reinforcement bar and cold-forms roofing profiles at its Nakuru works. Every batch ships with a mill test certificate, and bar is cut to length on request at no extra charge. The mill serves the Rift Valley, Western and Nyanza corridors on its own fleet.",
      certifications: ["KEBS Standardisation Mark", "ISO 9001:2015"],
    },
    submittedDaysAgo: 190,
    subscription: { package: "premium", billingCycle: "annual" },
  },
  {
    id: "mfr_kisumu_timber",
    status: "approved",
    contactName: "Achieng Omondi",
    email: "achieng@kisumutimber.co.ke",
    phone: "+254714556201",
    legalName: "Kisumu Timber & Boards Limited",
    tradingName: "Kisumu Timber",
    brsNumber: "PVT-5MND2WQ",
    kraPin: "P053114882J",
    yearEstablished: 2017,
    physicalAddress: "Obote Road, Kisumu Industrial Area",
    county: "Kisumu",
    website: "https://kisumutimber.co.ke",
    categories: ["Timber & Boards", "Doors & Windows"],
    capacityBand: "5m_20m",
    distributionRegions: ["Nyanza", "Western"],
    directors: [
      { name: "Achieng Omondi", id: "28904455", role: "Managing Director", own: 70, phone: "+254714556201" },
      { name: "Brian Otieno", id: "30115678", role: "Shareholder", own: 30, phone: "+254701223344" },
    ],
    submittedDaysAgo: 150,
    subscription: { package: "premium", billingCycle: "monthly" },
  },
  {
    id: "mfr_equator_paints",
    status: "approved",
    contactName: "Fatuma Hassan",
    email: "f.hassan@equatorpaints.co.ke",
    phone: "+254733118877",
    legalName: "Equator Paints Kenya Limited",
    tradingName: "Equator Paints",
    brsNumber: "CPR/2016/884210",
    kraPin: "P054228190L",
    yearEstablished: 2016,
    physicalAddress: "Baba Dogo Road, Ruaraka",
    county: "Nairobi",
    website: "https://equatorpaints.co.ke",
    categories: ["Paints & Coatings", "Adhesives & Sealants", "Interior Finishes"],
    capacityBand: "20m_100m",
    distributionRegions: ["Nairobi Metro", "Central", "Coast", "Rift Valley"],
    directors: [
      { name: "Fatuma Hassan", id: "25667812", role: "Managing Director", own: 50, phone: "+254733118877" },
      { name: "Ali Hassan", id: "21004556", role: "Director", own: 50, phone: "+254722667788" },
    ],
    store: {
      tagline: "Interior and exterior coatings, tinted to order",
      about:
        "Equator Paints manufactures water- and solvent-based coatings at Ruaraka, supplying hardware retailers across four regions. Tinting is done in-house to any of 1,200 shades, and orders above 400 litres are matched from a retained batch so repeat work stays consistent. Technical data sheets accompany every delivery.",
      certifications: ["KEBS Standardisation Mark", "ISO 9001:2015"],
      paymentTerms: ["M-Pesa", "Bank transfer", "30-day credit (approved accounts)", "Letter of credit"],
    },
    submittedDaysAgo: 210,
    subscription: { package: "vip", billingCycle: "annual" },
  },
  {
    id: "mfr_mount_kenya_roofing",
    status: "conditionally_approved",
    contactName: "Samuel Njoroge",
    email: "s.njoroge@mkroofing.co.ke",
    phone: "+254720441093",
    legalName: "Mount Kenya Roofing Systems Limited",
    tradingName: "MK Roofing",
    brsNumber: "PVT-9BFH4TL",
    kraPin: "P055390477N",
    yearEstablished: 2021,
    physicalAddress: "Kamakwa Road, Nyeri Town",
    county: "Nyeri",
    website: "https://mkroofing.co.ke",
    categories: ["Roofing", "Insulation"],
    capacityBand: "5m_20m",
    distributionRegions: ["Central", "Eastern"],
    directors: [
      { name: "Samuel Njoroge", id: "29887100", role: "Managing Director", own: 100, phone: "+254720441093" },
    ],
    store: {
      tagline: "Pre-painted roofing profiles, cut to length in Nyeri",
      about:
        "Mount Kenya Roofing Systems profiles pre-painted coil into IBR and box profile sheet at Kamakwa, Nyeri. Sheets are cut to the exact length ordered, so there is no site wastage. A newer operation, and currently completing Buildex verification.",
      certifications: [],
      responseRatePercent: 71,
      avgResponseHours: 14,
    },
    submittedDaysAgo: 9,
    subscription: { package: "basic", billingCycle: "monthly" },
    riskFlagged: true,
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: { status: "passed" },
      kra_pin_validation: { status: "passed" },
      iprs_director_id: { status: "passed" },
      site_visit: {
        status: "in_review",
        note: "Field team scheduled for a plant inspection. You can list products now, but orders stay disabled until the visit clears.",
      },
    },
  },
  {
    id: "mfr_coastal_sanitary",
    status: "approved",
    contactName: "Mariam Salim",
    email: "mariam@coastalsanitary.co.ke",
    phone: "+254712889034",
    legalName: "Coastal Sanitaryware Limited",
    tradingName: "Coastal Sanitaryware",
    brsNumber: "PVT-2VKD6XR",
    kraPin: "P056771203P",
    yearEstablished: 2012,
    physicalAddress: "Shimanzi Industrial Area, Mombasa",
    county: "Mombasa",
    website: "https://coastalsanitary.co.ke",
    categories: ["Plumbing & Sanitaryware", "Tiles & Flooring"],
    capacityBand: "5m_20m",
    distributionRegions: ["Coast", "Nairobi Metro"],
    directors: [
      { name: "Mariam Salim", id: "23445667", role: "Managing Director", own: 65, phone: "+254712889034" },
      { name: "Omar Salim", id: "20118834", role: "Director", own: 35, phone: "+254733445566" },
    ],
    submittedDaysAgo: 120,
    subscription: { package: "basic", billingCycle: "annual" },
  },
  {
    id: "mfr_kakamega_hardware",
    status: "in_review",
    contactName: "Vincent Wekesa",
    email: "v.wekesa@kakamegahardware.co.ke",
    phone: "+254701667234",
    legalName: "Kakamega Hardware Manufacturers Limited",
    tradingName: "Kakamega Hardware",
    brsNumber: "PVT-6JGP1CS",
    kraPin: "P057882014R",
    yearEstablished: 2020,
    physicalAddress: "Mumias Road, Kakamega",
    county: "Kakamega",
    website: "",
    categories: ["Hardware & Fasteners"],
    capacityBand: "under_5m",
    distributionRegions: ["Western"],
    directors: [
      { name: "Vincent Wekesa", id: "31220987", role: "Managing Director", own: 80, phone: "+254701667234" },
      { name: "Janet Nafula", id: "32004561", role: "Shareholder", own: 20, phone: "+254715330099" },
    ],
    submittedDaysAgo: 2,
    subscription: null,
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: { status: "in_review" },
      kra_pin_validation: { status: "in_review" },
      iprs_director_id: { status: "pending" },
      site_visit: { status: "not_required" },
    },
  },
  {
    id: "mfr_nyanza_tiles",
    status: "approved",
    contactName: "Ruth Kerubo",
    email: "ruth@nyanzatiles.co.ke",
    phone: "+254729004112",
    legalName: "Nyanza Tiles & Ceramics Limited",
    tradingName: "Nyanza Tiles",
    brsNumber: "PVT-8HTR5ND",
    kraPin: "P058190334T",
    yearEstablished: 2018,
    physicalAddress: "Kisii–Kilgoris Road, Kisii",
    county: "Kisii",
    website: "https://nyanzatiles.co.ke",
    categories: ["Tiles & Flooring", "Interior Finishes"],
    capacityBand: "5m_20m",
    distributionRegions: ["Nyanza", "Rift Valley", "Western"],
    directors: [
      { name: "Ruth Kerubo", id: "27551220", role: "Managing Director", own: 100, phone: "+254729004112" },
    ],
    submittedDaysAgo: 95,
    subscription: { package: "premium", billingCycle: "monthly" },
  },
  {
    id: "mfr_athi_adhesives",
    status: "action_needed",
    contactName: "Joseph Mutiso",
    email: "j.mutiso@athiadhesives.co.ke",
    phone: "+254705118902",
    legalName: "Athi River Adhesives Limited",
    tradingName: "Athi Adhesives",
    brsNumber: "PVT-4WPQ7ML",
    kraPin: "P059003881V",
    yearEstablished: 2022,
    physicalAddress: "EPZ Road, Athi River",
    county: "Machakos",
    website: "",
    categories: ["Adhesives & Sealants"],
    capacityBand: "under_5m",
    distributionRegions: ["Nairobi Metro", "Eastern"],
    directors: [
      { name: "Joseph Mutiso", id: "30887412", role: "Managing Director", own: 100, phone: "+254705118902" },
    ],
    submittedDaysAgo: 5,
    subscription: null,
    reviewNotes: [
      "Tax Compliance Certificate expired on upload. Please attach a current TCC from iTax.",
    ],
    checkSpec: {
      document_completeness: {
        status: "action_needed",
        note: "Your Tax Compliance Certificate has expired. Upload a current one to continue.",
        blocking: ["tax_compliance_certificate"],
      },
      brs_lookup: { status: "passed" },
      kra_pin_validation: { status: "in_review" },
      iprs_director_id: { status: "pending" },
      site_visit: { status: "not_required" },
    },
    docOverrides: {
      tax_compliance_certificate: {
        status: "expired",
        expiresAt: daysAgo(30),
        note: "Certificate lapsed 30 days ago.",
      },
    },
  },
  {
    id: "mfr_eldoret_glass",
    status: "submitted",
    contactName: "Caroline Jepkosgei",
    email: "caroline@eldoretglass.co.ke",
    phone: "+254718220567",
    legalName: "Eldoret Glass Works Limited",
    tradingName: "Eldoret Glass",
    brsNumber: "BN-1KDW3ZF",
    kraPin: "P060445127W",
    yearEstablished: 2023,
    physicalAddress: "Kapsoya Industrial Park, Eldoret",
    county: "Uasin Gishu",
    website: "",
    categories: ["Glass & Glazing", "Doors & Windows"],
    capacityBand: "under_5m",
    distributionRegions: ["Rift Valley"],
    directors: [
      { name: "Caroline Jepkosgei", id: "33119088", role: "Managing Director", own: 100, phone: "+254718220567" },
    ],
    submittedDaysAgo: 0.4,
    subscription: null,
    checkSpec: {
      document_completeness: { status: "in_review" },
      brs_lookup: { status: "pending" },
      kra_pin_validation: { status: "pending" },
      iprs_director_id: { status: "pending" },
      site_visit: { status: "not_required" },
    },
  },
  {
    id: "mfr_thika_electricals",
    status: "approved",
    contactName: "Michael Kamau",
    email: "m.kamau@thikaelectricals.co.ke",
    phone: "+254736550118",
    legalName: "Thika Electricals Limited",
    tradingName: "Thika Electricals",
    brsNumber: "PVT-1LZY8VB",
    kraPin: "P061778203X",
    yearEstablished: 2015,
    physicalAddress: "Garissa Road, Thika Industrial Area",
    county: "Kiambu",
    website: "https://thikaelectricals.co.ke",
    categories: ["Electrical"],
    capacityBand: "20m_100m",
    distributionRegions: ["Nairobi Metro", "Central", "Eastern"],
    directors: [
      { name: "Michael Kamau", id: "24009911", role: "Managing Director", own: 50, phone: "+254736550118" },
      { name: "Lucy Wairimu", id: "25113408", role: "Director", own: 50, phone: "+254722889001" },
    ],
    submittedDaysAgo: 170,
    subscription: { package: "premium", billingCycle: "annual" },
  },
  {
    id: "mfr_naivasha_insulation",
    status: "rejected",
    contactName: "Tom Gitau",
    email: "tom@naivashainsulation.co.ke",
    phone: "+254707441220",
    legalName: "Naivasha Insulation Products Limited",
    tradingName: "Naivasha Insulation",
    brsNumber: "PVT-0RCX2QH",
    kraPin: "P062330991Y",
    yearEstablished: 2024,
    physicalAddress: "Moi South Lake Road, Naivasha",
    county: "Nakuru",
    website: "",
    categories: ["Insulation"],
    capacityBand: "under_5m",
    distributionRegions: ["Rift Valley"],
    directors: [
      { name: "Tom Gitau", id: "34881200", role: "Managing Director", own: 100, phone: "+254707441220" },
    ],
    submittedDaysAgo: 21,
    subscription: null,
    reviewNotes: [
      "BRS lookup returned no active company for the registration number supplied.",
      "Director National ID did not match IPRS records.",
    ],
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: {
        status: "action_needed",
        note: "No active company found at BRS for PVT-0RCX2QH.",
        blocking: ["brs_certificate"],
      },
      kra_pin_validation: { status: "passed" },
      iprs_director_id: {
        status: "action_needed",
        note: "National ID 34881200 did not match the name provided.",
        blocking: ["director_id"],
      },
      site_visit: { status: "not_required" },
    },
  },
  /*
    Four more applications in flight.

    With only three, the ops queue rendered almost empty — which made the
    console look like a screen nobody needs. These four are unverified, so they
    add nothing to the marketplace and do not touch the eight suppliers whose
    listings are live; what they add is a queue with something in it, and the
    states that are easy to get wrong: a check badly past SLA, a site visit
    running alongside an unfinished desk check, shareholding that does not
    reconcile, and an application nobody has picked up yet.

    Their storefront trading figures are zeroed rather than scaled off age, the
    same way `createFromDraft` starts a real new manufacturer. A supplier that
    has never been cleared to sell has no response record to advertise, and the
    enquiries console now reads exactly that number.
  */
  {
    id: "mfr_meru_pipes",
    status: "in_review",
    contactName: "Purity Gakii",
    email: "p.gakii@merupipeworks.co.ke",
    phone: "+254706334128",
    legalName: "Meru Pipe Works Limited",
    tradingName: "Meru Pipe Works",
    brsNumber: "PVT-2SVN6KD",
    kraPin: "P061557203X",
    yearEstablished: 2021,
    physicalAddress: "Gakoromone Industrial Plot 12, Meru",
    county: "Meru",
    website: "",
    categories: ["Plumbing & Sanitaryware"],
    capacityBand: "under_5m",
    distributionRegions: ["Eastern", "Central"],
    directors: [
      { name: "Purity Gakii", id: "32771045", role: "Managing Director", own: 65, phone: "+254706334128" },
      { name: "Dennis Murithi", id: "31009887", role: "Director", own: 35, phone: "+254717442310" },
    ],
    submittedDaysAgo: 4,
    subscription: null,
    store: { responseRatePercent: 0, avgResponseHours: 0, ordersFulfilled: 0, certifications: [] },
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: { status: "passed" },
      // Sitting well past its 24h target: this is the row the queue should
      // surface first.
      kra_pin_validation: { status: "in_review" },
      iprs_director_id: { status: "pending" },
      site_visit: { status: "not_required" },
    },
  },
  {
    id: "mfr_malindi_blocks",
    status: "in_review",
    contactName: "Omar Bakari",
    email: "omar@malindiblocks.co.ke",
    phone: "+254724880116",
    legalName: "Malindi Block & Paving Limited",
    tradingName: "Malindi Blocks",
    brsNumber: "PVT-7LDG9XB",
    kraPin: "P062003914Y",
    yearEstablished: 2019,
    physicalAddress: "Kisumu Ndogo Road, Malindi",
    county: "Kilifi",
    website: "https://malindiblocks.co.ke",
    categories: ["Cement & Concrete", "Tiles & Flooring"],
    capacityBand: "20m_100m",
    distributionRegions: ["Coast"],
    directors: [
      { name: "Omar Bakari", id: "28114509", role: "Managing Director", own: 50, phone: "+254724880116" },
      { name: "Halima Bakari", id: "29330178", role: "Director", own: 30, phone: "+254733551209" },
      { name: "Suleiman Juma", id: "26884301", role: "Shareholder", own: 20, phone: "+254701887654" },
    ],
    submittedDaysAgo: 7,
    subscription: null,
    riskFlagged: true,
    store: { responseRatePercent: 0, avgResponseHours: 0, ordersFulfilled: 0, certifications: [] },
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: { status: "passed" },
      kra_pin_validation: { status: "passed" },
      // A site visit running while a desk check is still open — the case where
      // the status is in_review even though the field team is already engaged.
      iprs_director_id: { status: "in_review" },
      site_visit: {
        status: "in_review",
        note: "Field team travelling from Mombasa; capacity claim needs confirming at the yard.",
      },
    },
  },
  {
    id: "mfr_kitui_lime",
    status: "action_needed",
    contactName: "Agnes Mwikali",
    email: "a.mwikali@kituilime.co.ke",
    phone: "+254715906443",
    legalName: "Kitui Lime & Aggregates Limited",
    tradingName: "Kitui Lime",
    brsNumber: "PVT-1FQZ4RH",
    kraPin: "P063881470Z",
    yearEstablished: 2022,
    physicalAddress: "Mutomo Road, Kitui",
    county: "Kitui",
    website: "",
    categories: ["Cement & Concrete"],
    capacityBand: "under_5m",
    distributionRegions: ["Eastern"],
    directors: [
      // Declares 95%. Shareholding that does not reconcile to 100 is the
      // commonest signal of a fabricated structure, and the reviewer states it
      // rather than leaving ops to add up.
      { name: "Agnes Mwikali", id: "33440921", role: "Managing Director", own: 60, phone: "+254715906443" },
      { name: "Francis Kilonzo", id: "31775208", role: "Shareholder", own: 35, phone: "+254728110934" },
    ],
    submittedDaysAgo: 6,
    subscription: null,
    store: { responseRatePercent: 0, avgResponseHours: 0, ordersFulfilled: 0, certifications: [] },
    reviewNotes: [
      "Declared shareholding totals 95%. Send a current CR12 showing the full ownership split.",
      "National ID 31775208 did not match the name provided to IPRS.",
    ],
    checkSpec: {
      document_completeness: { status: "passed" },
      brs_lookup: { status: "passed" },
      kra_pin_validation: { status: "passed" },
      iprs_director_id: {
        status: "action_needed",
        note: "Second director's National ID did not match. Re-upload the ID and a current CR12.",
        blocking: ["director_id", "cr12"],
      },
      site_visit: { status: "not_required" },
    },
    docOverrides: {
      kebs_permit: {
        status: "expired",
        expiresAt: daysAgo(12),
        note: "Standardisation permit lapsed 12 days ago.",
      },
    },
  },
  {
    id: "mfr_bungoma_ceilings",
    status: "submitted",
    contactName: "Elijah Barasa",
    email: "e.barasa@bungomaceilings.co.ke",
    phone: "+254702551877",
    legalName: "Bungoma Ceilings & Cornices Limited",
    tradingName: "Bungoma Ceilings",
    brsNumber: "BN-6TPR8VC",
    kraPin: "P064119055A",
    yearEstablished: 2024,
    physicalAddress: "Kanduyi Junction, Bungoma",
    county: "Bungoma",
    website: "",
    categories: ["Interior Finishes", "Insulation"],
    capacityBand: "under_5m",
    distributionRegions: ["Western", "Nyanza"],
    directors: [
      { name: "Elijah Barasa", id: "34220867", role: "Managing Director", own: 100, phone: "+254702551877" },
    ],
    submittedDaysAgo: 0.2,
    subscription: null,
    store: { responseRatePercent: 0, avgResponseHours: 0, ordersFulfilled: 0, certifications: [] },
    // Every check still pending: nobody inside Buildex has touched this one.
    // `deriveStatus` reads that as `submitted`, and no SLA clock has started —
    // which is exactly the application that quietly goes stale.
    checkSpec: {
      document_completeness: { status: "pending" },
      brs_lookup: { status: "pending" },
      kra_pin_validation: { status: "pending" },
      iprs_director_id: { status: "pending" },
      site_visit: { status: "not_required" },
    },
  },
];

export function seedManufacturers(): Manufacturer[] {
  return SEEDS.map((s) => {
    const checks = buildChecks(
      s.checkSpec ??
        (s.status === "approved"
          ? {
              document_completeness: { status: "passed" },
              brs_lookup: { status: "passed" },
              kra_pin_validation: { status: "passed" },
              iprs_director_id: { status: "passed" },
              site_visit: { status: "not_required" },
            }
          : {}),
      s.submittedDaysAgo,
    );

    return {
      id: s.id,
      status: s.status,
      contactName: s.contactName,
      email: s.email,
      phone: s.phone,
      phoneVerified: true,
      legalName: s.legalName,
      tradingName: s.tradingName,
      brsNumber: s.brsNumber,
      kraPin: s.kraPin,
      yearEstablished: s.yearEstablished,
      physicalAddress: s.physicalAddress,
      county: s.county,
      website: s.website,
      categories: s.categories,
      capacityBand: s.capacityBand,
      distributionRegions: s.distributionRegions,
      directors: s.directors.map((d, i) => ({
        id: `${s.id}_dir_${i}`,
        fullName: d.name,
        nationalId: d.id,
        role: d.role,
        ownershipPercent: d.own,
        phone: d.phone,
        iprsStatus:
          s.status === "rejected" && i === 0 ? ("mismatch" as const) : ("matched" as const),
      })),
      documents: buildDocuments(s.id, s.docOverrides, Math.max(s.submittedDaysAgo, 1)),
      checks,
      subscription: s.subscription
        ? {
            package: s.subscription.package,
            billingCycle: s.subscription.billingCycle,
            startedAt: daysAgo(s.submittedDaysAgo),
            renewsAt:
              s.subscription.package === "free"
                ? null
                : daysAhead(s.subscription.billingCycle === "annual" ? 300 : 20),
          }
        : null,
      storefront: buildStorefront(s),
      submittedAt: daysAgo(s.submittedDaysAgo),
      verifiedAt: s.status === "approved" ? daysAgo(Math.max(s.submittedDaysAgo - 3, 0)) : null,
      reviewNotes: s.reviewNotes ?? [],
      riskFlagged: s.riskFlagged ?? false,
      createdAt: daysAgo(s.submittedDaysAgo + 3),
      updatedAt: daysAgo(Math.max(s.submittedDaysAgo - 1, 0)),
    } satisfies Manufacturer;
  });
}
