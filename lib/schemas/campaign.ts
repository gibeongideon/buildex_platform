import { z } from "zod";
import { REGIONS, regionSchema, type Region } from "./common";

/*
  Regional visibility campaigns — the Premium/VIP feature from the
  requirements: "Allow manufacturers to target specific regions such as
  Kakamega or Kisumu", priced on "relevant hardware coverage, expected turnover
  and commercial demand", reporting "impressions, views, enquiries, orders and
  estimated conversion".

  Regional reach and pricing are modelled from hardware-shop coverage per
  region, so a manufacturer can see what it is actually buying before it
  commits budget.
*/

export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "ended"] as const;
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const CAMPAIGN_STATUS_TONE: Record<
  CampaignStatus,
  "neutral" | "info" | "success" | "warning"
> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  ended: "neutral",
};

/**
 * Hardware-shop coverage and typical monthly turnover per region, which is
 * what regional pricing is derived from. Placeholder figures pending the
 * commercial model — the UI labels them as such.
 */
export const REGION_REACH: Record<
  Region,
  { shops: number; monthlyTurnoverKsh: number; cpmKsh: number }
> = {
  "Nairobi Metro": { shops: 1840, monthlyTurnoverKsh: 2_100_000_000, cpmKsh: 340 },
  Central: { shops: 960, monthlyTurnoverKsh: 780_000_000, cpmKsh: 240 },
  Coast: { shops: 720, monthlyTurnoverKsh: 640_000_000, cpmKsh: 260 },
  Eastern: { shops: 610, monthlyTurnoverKsh: 430_000_000, cpmKsh: 190 },
  "North Eastern": { shops: 145, monthlyTurnoverKsh: 88_000_000, cpmKsh: 120 },
  Nyanza: { shops: 830, monthlyTurnoverKsh: 590_000_000, cpmKsh: 215 },
  "Rift Valley": { shops: 1420, monthlyTurnoverKsh: 1_150_000_000, cpmKsh: 285 },
  Western: { shops: 690, monthlyTurnoverKsh: 460_000_000, cpmKsh: 200 },
};

export const campaignMetricsSchema = z.object({
  impressions: z.number().int().min(0),
  views: z.number().int().min(0),
  enquiries: z.number().int().min(0),
  orders: z.number().int().min(0),
});

export type CampaignMetrics = z.infer<typeof campaignMetricsSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  manufacturerId: z.string(),
  name: z.string().trim().min(3, "Give the campaign a name"),
  regions: z.array(regionSchema).min(1, "Target at least one region"),
  /** Empty means "all products in the catalogue". */
  productIds: z.array(z.string()).default([]),
  status: campaignStatusSchema,
  dailyBudgetKsh: z.number().min(0),
  spentKsh: z.number().min(0),
  startsAt: z.string(),
  endsAt: z.string().nullable().default(null),
  metrics: campaignMetricsSchema,
});

export type Campaign = z.infer<typeof campaignSchema>;

export const campaignFormSchema = z.object({
  name: z.string().trim().min(3, "Give the campaign a name"),
  regions: z.array(regionSchema).min(1, "Target at least one region"),
  dailyBudgetKsh: z
    .number()
    .min(500, "Minimum daily budget is KSh 500")
    .max(500_000, "Budgets above KSh 500,000/day need an account manager"),
  durationDays: z
    .number()
    .int()
    .min(7, "Run for at least 7 days to gather meaningful data")
    .max(180, "Maximum 180 days per campaign"),
});

export type CampaignForm = z.infer<typeof campaignFormSchema>;

export function totalShops(regions: Region[]) {
  return regions.reduce((sum, r) => sum + REGION_REACH[r].shops, 0);
}

/** Blended cost per thousand impressions across the selected regions. */
export function blendedCpm(regions: Region[]) {
  if (regions.length === 0) return 0;
  const shops = totalShops(regions);
  if (shops === 0) return 0;
  const weighted = regions.reduce(
    (sum, r) => sum + REGION_REACH[r].cpmKsh * REGION_REACH[r].shops,
    0,
  );
  return Math.round(weighted / shops);
}

/** Impressions a daily budget buys across the selected regions. */
export function estimatedDailyImpressions(regions: Region[], dailyBudgetKsh: number) {
  const cpm = blendedCpm(regions);
  if (cpm === 0) return 0;
  return Math.round((dailyBudgetKsh / cpm) * 1000);
}

export function conversionRate(metrics: CampaignMetrics) {
  if (metrics.views === 0) return 0;
  return (metrics.enquiries / metrics.views) * 100;
}

export const ALL_REGIONS = REGIONS;
