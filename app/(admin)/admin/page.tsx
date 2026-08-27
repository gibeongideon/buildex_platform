"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CircleCheck,
  Clock,
  Megaphone,
  MessageSquare,
  Package,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, Num } from "@/components/shared/format";
import { ActivityRow, ActivityRowSkeleton } from "@/components/admin/activity-row";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { activityRepo, adminRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";

/*
  Buildex Admin overview.

  Two jobs, in this order: tell an admin whether anything needs them right now,
  then show what the platform has been doing. The exceptions panel comes before
  the activity feed because a feed tells you what happened, and exceptions tell
  you what to do — and an ops shift starts with the second question.
*/

export default function AdminOverviewPage() {
  const { data: summary, error, refetch } = useQuery(() => adminRepo.summary(), []);
  const { data: exceptions, loading: loadingExceptions } = useQuery(
    () => adminRepo.exceptions(),
    [],
  );
  const { data: recent, loading: loadingRecent } = useQuery(
    () => activityRepo.list({ limit: 10 }),
    [],
  );

  const high = (exceptions ?? []).filter((e) => e.severity === "high");
  const verifiedShare =
    summary && summary.suppliersTotal > 0
      ? (summary.verifiedSuppliers / summary.suppliersTotal) * 100
      : 0;

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Everything happening across Buildex Connect, and what needs a decision."
        breadcrumbs={[{ label: "Buildex Admin" }]}
        actions={
          <Button asChild>
            <Link href="/admin/verification">
              <ShieldCheck aria-hidden="true" />
              Verification queue
            </Link>
          </Button>
        }
      />

      <QueryError error={error} onRetry={refetch} />


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting decision"
          tone="warning"
          loading={!summary}
          value={summary?.applicationsAwaitingDecision}
          hint={
            summary?.checksPastSla
              ? `${summary.checksPastSla} checks past SLA`
              : "All checks within SLA"
          }
          icon={<ShieldCheck className="size-4" />}
        />
        <StatCard
          label="Verified suppliers"
          tone="success"
          loading={!summary}
          value={summary?.verifiedSuppliers}
          hint={
            summary
              ? `${summary.suppliersTotal} onboarded · ${verifiedShare.toFixed(0)}% cleared`
              : "—"
          }
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          label="Live listings"
          tone="success"
          loading={!summary}
          value={<Num value={summary?.liveListings ?? 0} />}
          hint={
            summary?.draftListings
              ? `${summary.draftListings} held as drafts`
              : "Nothing pending"
          }
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Unanswered enquiries"
          tone="warning"
          loading={!summary}
          value={summary?.enquiriesUnanswered}
          hint="Across every supplier"
          icon={<MessageSquare className="size-4" />}
        />
      </div>

      {/*
        `?? 0` on a money tile renders "KSh 0" while the figure is still loading,
        which reads as a fact — no value in flight, nothing accepted, no spend.
        Same defect as category counts showing 0 during load: an unknown number
        has to look unknown, so these use the card's own loading state.
      */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enquiry value in flight"
          tone="info"
          loading={!summary}
          value={<Currency value={summary?.enquiryValueInFlightKsh ?? 0} compact />}
          hint="New and quoted, at enquiry quantity"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Accepted value"
          tone="success"
          loading={!summary}
          value={<Currency value={summary?.acceptedValueKsh ?? 0} compact />}
          hint="Converted to orders, lifetime"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Active campaigns"
          tone="info"
          loading={!summary}
          value={summary?.activeCampaigns}
          hint="Regional visibility running now"
          icon={<Megaphone className="size-4" />}
        />
        <StatCard
          label="Campaign spend"
          tone="info"
          loading={!summary}
          value={<Currency value={summary?.campaignSpendKsh ?? 0} compact />}
          hint="Lifetime, all suppliers"
          icon={<Activity className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Needs attention</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Checks past SLA, stalled applications, expired documents and
                suppliers who are not replying.
              </p>
            </div>
            {high.length > 0 ? (
              <StatusPill tone="danger">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {high.length} urgent
              </StatusPill>
            ) : null}
          </CardHeader>
          <CardBody className="p-0">
            {loadingExceptions && !exceptions ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (exceptions ?? []).length === 0 ? (
              <EmptyState
                icon={<CircleCheck className="size-5" />}
                title="Nothing outstanding"
                description="Every check is within SLA, no documents have expired, and suppliers are answering."
              />
            ) : (
              <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
                {(exceptions ?? []).map((exception) => (
                  <li key={exception.id}>
                    <Link
                      href={exception.href}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                          exception.severity === "high"
                            ? "bg-danger-soft text-danger"
                            : "bg-warning-soft text-warning",
                        )}
                      >
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">
                          {exception.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {exception.detail}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-1.5 size-4 shrink-0 text-subtle-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Every submission, check, listing, enquiry and campaign, newest first.
              </p>
            </div>
            <Link
              href="/admin/activity"
              className="text-sm font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loadingRecent && !recent ? (
              <ul className="divide-y divide-border">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <ActivityRowSkeleton key={i} />
                ))}
              </ul>
            ) : (recent ?? []).length === 0 ? (
              <EmptyState
                icon={<Activity className="size-5" />}
                title="No activity yet"
                description="Events appear as manufacturers onboard, list products and receive enquiries."
              />
            ) : (
              <ul className="divide-y divide-border">
                {(recent ?? []).map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">Credit is not here yet.</span>{" "}
              Portfolio monitoring, the loan tracker, DPD/NPL buckets and the pilot
              metrics arrive with Buildex Capital. None of that data exists, and the
              requirements are explicit that credit figures must be validated rather than
              estimated — so those pages are deliberately absent rather than empty.
            </span>
          </p>
        </CardBody>
      </Card>
    </>
  );
}
