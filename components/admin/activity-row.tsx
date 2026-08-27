"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  CreditCard,
  FileText,
  Megaphone,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import type { ActivityActorType, ActivityEvent, ActivityKind } from "@/lib/data";

/*
  One row of the platform timeline, shared by the overview and the Activity
  section so the two can never drift.

  Icon and tone are keyed off the event kind rather than the actor, because when
  scanning a mixed feed the question is "what happened", not "who did it" — the
  actor is already in the summary text.
*/

const KIND_ICON: Record<ActivityKind, React.ElementType> = {
  application_submitted: FileText,
  check_started: ShieldCheck,
  check_passed: ShieldCheck,
  manufacturer_verified: BadgeCheck,
  document_uploaded: Upload,
  listing_created: Package,
  listing_updated: Package,
  enquiry_received: MessageSquare,
  enquiry_quoted: Send,
  campaign_launched: Megaphone,
  campaign_ended: Megaphone,
  subscription_started: CreditCard,
};

const KIND_TONE: Record<ActivityKind, string> = {
  application_submitted: "text-brand bg-brand-soft",
  check_started: "text-info bg-info-soft",
  check_passed: "text-success bg-success-soft",
  manufacturer_verified: "text-success bg-success-soft",
  document_uploaded: "text-muted-foreground bg-surface-muted",
  listing_created: "text-brand bg-brand-soft",
  listing_updated: "text-muted-foreground bg-surface-muted",
  enquiry_received: "text-warning bg-warning-soft",
  enquiry_quoted: "text-success bg-success-soft",
  campaign_launched: "text-brand bg-brand-soft",
  campaign_ended: "text-muted-foreground bg-surface-muted",
  subscription_started: "text-brand bg-brand-soft",
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  application_submitted: "Application submitted",
  check_started: "Check opened",
  check_passed: "Check passed",
  manufacturer_verified: "Manufacturer verified",
  document_uploaded: "Document uploaded",
  listing_created: "Listing created",
  listing_updated: "Listing updated",
  enquiry_received: "Enquiry received",
  enquiry_quoted: "Enquiry answered",
  campaign_launched: "Campaign launched",
  campaign_ended: "Campaign ended",
  subscription_started: "Package taken",
};

export const ACTOR_LABELS: Record<ActivityActorType, string> = {
  manufacturer: "Manufacturer",
  buyer: "Hardware shop",
  ops: "Buildex Operations",
  system: "Authority / system",
};

export function ActivityRow({ event }: { event: ActivityEvent }) {
  const Icon = KIND_ICON[event.kind] ?? Activity;

  const body = (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
          KIND_TONE[event.kind],
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">{event.summary}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{ACTIVITY_KIND_LABELS[event.kind]}</span>
          <span aria-hidden="true">·</span>
          <span>{ACTOR_LABELS[event.actor.type]}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={event.at}>{formatRelative(event.at)}</time>
        </p>
      </div>
      {event.href ? (
        <ChevronRight
          className="mt-2 size-4 shrink-0 text-subtle-foreground"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  return (
    <li className="px-4 py-3 transition-colors hover:bg-surface-muted">
      {event.href ? (
        <Link href={event.href} className="block rounded-md">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

export function ActivityRowSkeleton() {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="size-8 shrink-0 animate-pulse rounded-md bg-surface-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
      </div>
    </li>
  );
}
