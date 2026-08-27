"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/*
  Surfacing a failed repository call.

  Thirty-two of the thirty-five screens that call `useQuery` never read its
  `error`, so a failed call rendered its loading skeleton forever: no message, no
  explanation, no way out. That costs nothing today, because the data is in the
  browser and the call cannot fail — and it becomes a visible outage the moment
  those calls are network requests.

  Deliberately a banner rather than a wrapper that owns the whole render. On
  these screens the query result feeds the filters, the KPI cards and the table,
  so a render-prop wrapper would mean moving every derived value inside a
  callback on thirty-two pages — a large diff, and a lot of risk, to fix
  something a single line can fix. This composes with the loading and empty
  branches each page already has.
*/

export function QueryError({
  error,
  onRetry,
  title = "Could not load this",
  className,
}: {
  error: Error | undefined;
  onRetry: () => void;
  title?: string;
  className?: string;
}) {
  if (!error) return null;

  return (
    <Alert
      tone="danger"
      className={cn("mb-6", className)}
      title={title}
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Retry
        </Button>
      }
    >
      {error.message || "Something went wrong fetching this data."} Nothing was lost —
      this screen only reads.
    </Alert>
  );
}

/**
 * A run of skeleton rows — the shape 24 screens were each hand-rolling with
 * `Array.from({ length: n }).map(...)`.
 */
export function SkeletonRows({
  rows = 5,
  className,
  itemClassName = "h-12",
}: {
  rows?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

/** The same, laid out on a grid — for card surfaces rather than tables. */
export function SkeletonGrid({
  count = 6,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  itemClassName = "h-40",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}
