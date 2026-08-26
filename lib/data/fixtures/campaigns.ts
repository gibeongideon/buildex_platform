import type { Campaign, CampaignStatus } from "@/lib/schemas/campaign";
import type { Region } from "@/lib/schemas/common";

/*
  Regional campaign seed data.

  Only Premium and VIP manufacturers have campaigns, because regional targeting
  is gated to those packages. Metrics narrow realistically down the funnel —
  impressions → product views → enquiries → orders — with view rates around
  4–7% and enquiry conversion in the low single digits, which is where B2B
  wholesale actually sits.
*/

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString();

type Spec = {
  id: string;
  m: string;
  name: string;
  regions: Region[];
  status: CampaignStatus;
  daily: number;
  runningDays: number;
  endsInDays: number | null;
  impressions: number;
  views: number;
  enquiries: number;
  orders: number;
  productIds?: string[];
};

const SPECS: Spec[] = [
  {
    id: "cmp_sav_metro",
    m: "mfr_savannah",
    name: "Nairobi Metro — cement restocking",
    regions: ["Nairobi Metro"],
    status: "active",
    daily: 12_000,
    runningDays: 38,
    endsInDays: 22,
    impressions: 1_412_000,
    views: 86_900,
    enquiries: 2_140,
    orders: 318,
    productIds: ["prd_sav_opc32", "prd_sav_opc42"],
  },
  {
    id: "cmp_sav_east",
    m: "mfr_savannah",
    name: "Eastern corridor — blocks and pavers",
    regions: ["Eastern", "Central"],
    status: "active",
    daily: 6_500,
    runningDays: 21,
    endsInDays: 39,
    impressions: 486_000,
    views: 24_300,
    enquiries: 611,
    orders: 74,
    productIds: ["prd_sav_block", "prd_sav_paving"],
  },
  {
    id: "cmp_sav_coast",
    m: "mfr_savannah",
    name: "Coast launch push",
    regions: ["Coast"],
    status: "ended",
    daily: 4_000,
    runningDays: 90,
    endsInDays: null,
    impressions: 512_000,
    views: 21_900,
    enquiries: 402,
    orders: 38,
  },
  {
    id: "cmp_rv_rift",
    m: "mfr_rift_steel",
    name: "Rift Valley — rebar always-on",
    regions: ["Rift Valley"],
    status: "active",
    daily: 9_000,
    runningDays: 64,
    endsInDays: 16,
    impressions: 1_086_000,
    views: 61_400,
    enquiries: 1_486,
    orders: 214,
  },
  {
    id: "cmp_rv_west",
    m: "mfr_rift_steel",
    name: "Western & Nyanza — roofing season",
    regions: ["Western", "Nyanza"],
    status: "paused",
    daily: 5_500,
    runningDays: 30,
    endsInDays: 12,
    impressions: 398_000,
    views: 19_100,
    enquiries: 388,
    orders: 41,
    productIds: ["prd_rv_bp30", "prd_rv_bp32", "prd_rv_gutter"],
  },
  {
    id: "cmp_kt_nyanza",
    m: "mfr_kisumu_timber",
    name: "Nyanza — boards and joinery",
    regions: ["Nyanza"],
    status: "active",
    daily: 3_200,
    runningDays: 27,
    endsInDays: 33,
    impressions: 214_000,
    views: 12_800,
    enquiries: 297,
    orders: 34,
  },
  {
    id: "cmp_kt_west",
    m: "mfr_kisumu_timber",
    name: "Western expansion test",
    regions: ["Western"],
    status: "draft",
    daily: 2_500,
    runningDays: 0,
    endsInDays: 60,
    impressions: 0,
    views: 0,
    enquiries: 0,
    orders: 0,
  },
  {
    id: "cmp_eq_national",
    m: "mfr_equator_paints",
    name: "Four-region paint push",
    regions: ["Nairobi Metro", "Central", "Coast", "Rift Valley"],
    status: "active",
    daily: 18_000,
    runningDays: 51,
    endsInDays: 29,
    impressions: 2_640_000,
    views: 171_600,
    enquiries: 4_120,
    orders: 622,
  },
  {
    id: "cmp_eq_weather",
    m: "mfr_equator_paints",
    name: "Weatherguard — long rains",
    regions: ["Central", "Nairobi Metro"],
    status: "ended",
    daily: 7_500,
    runningDays: 60,
    endsInDays: null,
    impressions: 894_000,
    views: 52_700,
    enquiries: 1_284,
    orders: 196,
    productIds: ["prd_eq_weather", "prd_eq_roof"],
  },
  {
    id: "cmp_nt_nyanza",
    m: "mfr_nyanza_tiles",
    name: "Nyanza & Rift — large format tiles",
    regions: ["Nyanza", "Rift Valley"],
    status: "active",
    daily: 4_800,
    runningDays: 33,
    endsInDays: 27,
    impressions: 402_000,
    views: 23_100,
    enquiries: 528,
    orders: 61,
    productIds: ["prd_nt_6060", "prd_nt_8080", "prd_nt_wood"],
  },
  {
    id: "cmp_te_central",
    m: "mfr_thika_electricals",
    name: "Central & Eastern — cable and accessories",
    regions: ["Central", "Eastern"],
    status: "active",
    daily: 6_000,
    runningDays: 44,
    endsInDays: 16,
    impressions: 588_000,
    views: 33_400,
    enquiries: 742,
    orders: 98,
  },
  {
    id: "cmp_te_metro",
    m: "mfr_thika_electricals",
    name: "Nairobi Metro — LED range",
    regions: ["Nairobi Metro"],
    status: "paused",
    daily: 8_000,
    runningDays: 19,
    endsInDays: 21,
    impressions: 296_000,
    views: 16_900,
    enquiries: 341,
    orders: 39,
    productIds: ["prd_te_led"],
  },
];

export function seedCampaigns(): Campaign[] {
  return SPECS.map((s) => ({
    id: s.id,
    manufacturerId: s.m,
    name: s.name,
    regions: s.regions,
    productIds: s.productIds ?? [],
    status: s.status,
    dailyBudgetKsh: s.daily,
    // Draft campaigns have not spent; paused ones stopped where they stopped.
    spentKsh: s.status === "draft" ? 0 : s.daily * s.runningDays,
    startsAt: daysAgo(s.runningDays),
    endsAt: s.endsInDays === null ? daysAgo(0.5) : daysAhead(s.endsInDays),
    metrics: {
      impressions: s.impressions,
      views: s.views,
      enquiries: s.enquiries,
      orders: s.orders,
    },
  }));
}
