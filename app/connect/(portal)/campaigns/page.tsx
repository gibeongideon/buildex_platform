"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  Megaphone,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Store,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num, Pct } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChipGroup,
  EmptyState,
  Separator,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { campaignRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  CAMPAIGN_STATUS_TONE,
  REGION_REACH,
  blendedCpm,
  campaignFormSchema,
  conversionRate,
  estimatedDailyImpressions,
  totalShops,
  type Campaign,
  type CampaignForm,
} from "@/lib/schemas/campaign";
import { REGIONS, type Region } from "@/lib/schemas/common";
import { hasRegionalTargeting, packageMeta } from "@/lib/schemas/subscription";
import { formatDate } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";

/*
  Regional visibility campaigns.

  The builder shows reach and cost *before* the manufacturer commits: pick
  regions, see how many hardware shops that covers, the blended CPM and what a
  daily budget actually buys. Regional pricing is derived from shop coverage and
  turnover per region, so a manufacturer can tell why Nairobi Metro costs more
  than North Eastern rather than being asked to trust a number.
*/

function CampaignBuilder({
  manufacturerId,
  onCreated,
  onCancel,
}: {
  manufacturerId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", regions: [], dailyBudgetKsh: 5000, durationDays: 30 },
  });

  const regions = (form.watch("regions") ?? []) as Region[];
  const budget = form.watch("dailyBudgetKsh") || 0;
  const duration = form.watch("durationDays") || 0;

  const shops = totalShops(regions);
  const cpm = blendedCpm(regions);
  const dailyImpressions = estimatedDailyImpressions(regions, budget);
  const totalBudget = budget * duration;
  // Funnel assumptions stated on screen so nobody mistakes them for measurement.
  const estViews = Math.round(dailyImpressions * duration * 0.058);
  const estEnquiries = Math.round(estViews * 0.024);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await campaignRepo.create({
        manufacturerId,
        name: values.name,
        regions: values.regions,
        productIds: [],
        status: "active",
        dailyBudgetKsh: values.dailyBudgetKsh,
        startsAt: new Date().toISOString(),
        endsAt: new Date(
          Date.now() + values.durationDays * 86_400_000,
        ).toISOString(),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New regional campaign</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Boost your listings where you actually want to sell.
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <Field error={form.formState.errors.name?.message}>
              <Label required>Campaign name</Label>
              <Input
                {...form.register("name")}
                placeholder="Nyanza — cement restocking"
              />
            </Field>

            <Field
              error={
                form.formState.errors.regions?.root?.message ??
                (form.formState.errors.regions as { message?: string } | undefined)
                  ?.message
              }
            >
              <Label required>Target regions</Label>
              <div className="pt-1">
                <ChipGroup
                  label="Target regions"
                  options={REGIONS}
                  value={regions}
                  onChange={(next) =>
                    form.setValue("regions", next, { shouldValidate: true })
                  }
                  columns={2}
                />
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field error={form.formState.errors.dailyBudgetKsh?.message}>
                <Label required>Daily budget</Label>
                <Input
                  {...form.register("dailyBudgetKsh", { valueAsNumber: true })}
                  type="number"
                  min={500}
                  step={500}
                  className="text-right text-numeric"
                />
                <FieldHint>Minimum KSh 500 per day.</FieldHint>
              </Field>
              <Field error={form.formState.errors.durationDays?.message}>
                <Label required>Duration (days)</Label>
                <Input
                  {...form.register("durationDays", { valueAsNumber: true })}
                  type="number"
                  min={7}
                  max={180}
                  className="text-right text-numeric"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Estimated reach
            </p>

            {regions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Select at least one region to see coverage and cost.
              </p>
            ) : (
              <>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Hardware shops covered</dt>
                    <dd className="font-semibold text-foreground">
                      <Num value={shops} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Blended cost per 1,000</dt>
                    <dd className="font-semibold text-foreground">
                      <Currency value={cpm} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Impressions per day</dt>
                    <dd className="font-semibold text-foreground">
                      <Num value={dailyImpressions} />
                    </dd>
                  </div>
                </dl>

                <Separator className="my-3" />

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total budget</dt>
                    <dd className="font-semibold text-foreground">
                      <Currency value={totalBudget} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Projected product views</dt>
                    <dd className="font-semibold text-foreground">
                      <Num value={estViews} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Projected enquiries</dt>
                    <dd className="font-semibold text-foreground">
                      <Num value={estEnquiries} />
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                  Projections apply a 5.8% view rate and 2.4% enquiry rate — the platform
                  averages for wholesale construction supply. Actual results vary by
                  category and price competitiveness.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 lg:col-span-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Launch campaign
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [busy, setBusy] = React.useState(false);
  const conversion = conversionRate(campaign.metrics);
  const shops = totalShops(campaign.regions as Region[]);

  async function toggle() {
    setBusy(true);
    try {
      await campaignRepo.setStatus(
        campaign.id,
        campaign.status === "active" ? "paused" : "active",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={CAMPAIGN_STATUS_TONE[campaign.status]}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </StatusPill>
            <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {campaign.regions.join(", ")} · <Num value={shops} /> shops covered
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Currency value={campaign.dailyBudgetKsh} />/day · spent{" "}
            <Currency value={campaign.spentKsh} /> · from{" "}
            {formatDate(campaign.startsAt)}
            {campaign.endsAt ? ` to ${formatDate(campaign.endsAt)}` : ""}
          </p>
        </div>

        {campaign.status === "active" || campaign.status === "paused" ? (
          <Button variant="secondary" size="sm" loading={busy} onClick={toggle}>
            {campaign.status === "active" ? (
              <>
                <Pause aria-hidden="true" />
                Pause
              </>
            ) : (
              <>
                <Play aria-hidden="true" />
                Resume
              </>
            )}
          </Button>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-5">
        {[
          { label: "Impressions", value: <Num value={campaign.metrics.impressions} /> },
          { label: "Product views", value: <Num value={campaign.metrics.views} /> },
          { label: "Enquiries", value: <Num value={campaign.metrics.enquiries} /> },
          { label: "Orders", value: <Num value={campaign.metrics.orders} /> },
          { label: "View → enquiry", value: <Pct value={conversion} decimals={1} /> },
        ].map((metric) => (
          <div key={metric.label}>
            <dt className="text-[11px] uppercase tracking-wider text-subtle-foreground">
              {metric.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export default function CampaignsPage() {
  const { data: current, loading: loadingManufacturer } = useCurrentManufacturer();
  const manufacturerId = current?.manufacturer.id ?? null;
  const [building, setBuilding] = React.useState(false);

  const { data: campaigns, loading } = useQuery(
    async () =>
      manufacturerId ? campaignRepo.listByManufacturer(manufacturerId) : [],
    [manufacturerId],
  );

  if (loadingManufacturer && !current) {
    return (
      <>
        <PageHeader title="Regional campaigns" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!current) return null;

  const { manufacturer } = current;
  const pkg = manufacturer.subscription?.package ?? "free";
  const allowed = hasRegionalTargeting(pkg);
  const rows = campaigns ?? [];

  const totals = rows.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.metrics.impressions,
      views: acc.views + c.metrics.views,
      enquiries: acc.enquiries + c.metrics.enquiries,
      spent: acc.spent + c.spentKsh,
    }),
    { impressions: 0, views: 0, enquiries: 0, spent: 0 },
  );

  if (!allowed) {
    return (
      <>
        <PageHeader
          title="Regional campaigns"
          description="Pay to be more visible where you actually want to sell."
          breadcrumbs={[
            { label: "Connect", href: "/connect/dashboard" },
            { label: "Campaigns" },
          ]}
        />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Megaphone className="size-5" />}
              title={`Regional targeting is a Premium feature`}
              description={`You are on ${packageMeta(pkg).name}. Premium and VIP let you boost listings in chosen regions — Kakamega rather than Kisumu — priced on hardware coverage in each.`}
              action={
                <Button asChild>
                  <Link href="/connect/subscription">Compare packages</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What regional coverage looks like</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Hardware shop coverage per region, which is what campaign pricing is
              derived from.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="scroll-x">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-5 py-2.5 text-left font-medium text-muted-foreground">
                      Region
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Hardware shops
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Monthly turnover
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium text-muted-foreground">
                      Cost per 1,000
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {REGIONS.map((region) => {
                    const reach = REGION_REACH[region];
                    return (
                      <tr key={region}>
                        <td className="px-5 py-2.5 font-medium text-foreground">
                          {region}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          <Num value={reach.shops} />
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          <Currency value={reach.monthlyTurnoverKsh} compact />
                        </td>
                        <td className="px-5 py-2.5 text-right text-foreground">
                          <Currency value={reach.cpmKsh} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Alert tone="info" className="mt-6" title="Coverage figures are indicative">
          Shop counts and pricing are placeholders pending the approved commercial model.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Regional campaigns"
        description="Boost your listings in the regions that matter to you."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Campaigns" },
        ]}
        actions={
          !building ? (
            <Button onClick={() => setBuilding(true)}>
              <Plus aria-hidden="true" />
              New campaign
            </Button>
          ) : null
        }
      />

      {building ? (
        <CampaignBuilder
          manufacturerId={manufacturer.id}
          onCreated={() => setBuilding(false)}
          onCancel={() => setBuilding(false)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Impressions"
          value={<Num value={totals.impressions} />}
          hint="All campaigns, lifetime"
          icon={<Eye className="size-4" />}
        />
        <StatCard
          label="Product views"
          value={<Num value={totals.views} />}
          hint={
            totals.impressions
              ? `${((totals.views / totals.impressions) * 100).toFixed(1)}% of impressions`
              : "—"
          }
          icon={<MousePointerClick className="size-4" />}
        />
        <StatCard
          label="Enquiries"
          value={<Num value={totals.enquiries} />}
          hint={
            totals.views
              ? `${((totals.enquiries / totals.views) * 100).toFixed(1)}% of views`
              : "—"
          }
          icon={<Store className="size-4" />}
        />
        <StatCard
          label="Spent"
          value={<Currency value={totals.spent} compact />}
          hint={
            totals.enquiries
              ? `${Math.round(totals.spent / totals.enquiries)} KSh per enquiry`
              : "—"
          }
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading && rows.length === 0 ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-5" />}
              title="No campaigns yet"
              description="Pick the regions you want to sell into and set a daily budget. You will see reach and projected enquiries before you commit."
              action={
                <Button onClick={() => setBuilding(true)}>Create your first campaign</Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Alert tone="info" className="mt-6" title="Campaign pricing is indicative">
        Regional cost-per-thousand figures are placeholders pending the approved
        commercial model.
      </Alert>
    </>
  );
}
