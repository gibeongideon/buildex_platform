"use client";

import * as React from "react";
import Link from "next/link";
import { Megaphone, Pause, Play, Search, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num, Pct } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { adminRepo, campaignRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_TONE,
  conversionRate,
  totalShops,
  type Campaign,
} from "@/lib/schemas/campaign";
import { cn, formatRelative } from "@/lib/utils";

/*
  Campaign oversight.

  Ops can pause a campaign — the one case where Buildex intervenes in something
  a manufacturer is paying for, so the reason has to be visible: budget
  overspend, or a supplier who has stopped answering the enquiries the campaign
  is generating.
*/

const STATUS_LABELS: Record<Campaign["status"], string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export default function AdminCampaignsPage() {
  const { data: rows, loading } = useQuery(() => adminRepo.campaignRows(), []);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const all = rows ?? [];

  const filtered = all.filter(({ campaign, manufacturer }) => {
    if (status && campaign.status !== status) return false;
    if (query.trim()) {
      const haystack = [campaign.name, manufacturer.tradingName, ...campaign.regions]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const active = all.filter((r) => r.campaign.status === "active");
  const spend = all.reduce((sum, r) => sum + r.campaign.spentKsh, 0);
  const enquiries = all.reduce((sum, r) => sum + r.campaign.metrics.enquiries, 0);
  const views = all.reduce((sum, r) => sum + r.campaign.metrics.views, 0);

  async function setStatusFor(id: string, next: Campaign["status"]) {
    setBusyId(id);
    try {
      await campaignRepo.setStatus(id, next);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Regional visibility campaigns across every supplier."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Campaigns" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active campaigns"
          value={active.length}
          hint={`of ${all.length} total`}
          icon={<Megaphone className="size-4" />}
        />
        <StatCard
          label="Spend to date"
          value={<Currency value={spend} />}
          hint="Indicative pricing"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Enquiries generated"
          value={<Num value={enquiries} />}
          icon={<Megaphone className="size-4" />}
        />
        <StatCard
          label="View → enquiry"
          value={<Pct value={views ? (enquiries / views) * 100 : 0} />}
          hint="Across all campaigns"
          icon={<Target className="size-4" />}
        />
      </div>

      <Alert tone="info" className="mt-6" title="Campaign pricing is indicative">
        Regional CPM and reach figures come from modelled hardware-shop coverage. They are
        placeholders pending the commercial model, and are labelled as such everywhere a
        manufacturer sees them.
      </Alert>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaign, supplier or region"
              aria-label="Search campaigns"
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="h-9 w-auto"
          >
            <option value="">All statuses</option>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric sm:ml-auto">
            {filtered.length} of {all.length}
          </p>
        </div>

        <CardBody className="p-0">
          {loading && !rows ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-5" />}
              title="No campaigns match"
              description="Try clearing the status filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[68rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Campaign
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Regions
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Budget / day
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Spent
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Views
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Enquiries
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                      Conversion
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(({ campaign, manufacturer }) => {
                    const busy = busyId === campaign.id;
                    const rate = conversionRate(campaign.metrics);

                    return (
                      <tr key={campaign.id} className={cn("align-middle", busy && "opacity-50")}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{campaign.name}</p>
                          <Link
                            href={`/admin/manufacturers/${manufacturer.id}`}
                            className="text-xs text-muted-foreground hover:text-brand hover:underline"
                          >
                            {manufacturer.tradingName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Started {formatRelative(campaign.startsAt)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-muted-foreground">
                            {campaign.regions.join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground text-numeric">
                            <Num value={totalShops(campaign.regions)} /> shops covered
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Currency value={campaign.dailyBudgetKsh} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Currency value={campaign.spentKsh} />
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground">
                          <Num value={campaign.metrics.views} />
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground">
                          <Num value={campaign.metrics.enquiries} />
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-medium text-numeric",
                            rate >= 4 ? "text-success" : rate >= 1.5 ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          <Pct value={rate} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={CAMPAIGN_STATUS_TONE[campaign.status]}>
                            {STATUS_LABELS[campaign.status]}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {campaign.status === "active" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusFor(campaign.id, "paused")}
                                title="Pause"
                              >
                                <Pause aria-hidden="true" />
                                <span className="sr-only">Pause {campaign.name}</span>
                              </Button>
                            ) : campaign.status === "paused" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusFor(campaign.id, "active")}
                                title="Resume"
                              >
                                <Play aria-hidden="true" />
                                <span className="sr-only">Resume {campaign.name}</span>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
