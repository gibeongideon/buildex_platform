"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/primitives";
import type { QueryState as Query } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";

/*
  The three states every data-backed surface has, in one place.

  Written because they were not being handled. Thirty-two of the thirty-five
  screens that call `useQuery` never read its `error`, so a failed call rendered
  its loading skeleton forever: no message, no explanation, no way out. That
  costs nothing today, because the data is in the browser and the call cannot
  fail — and it becomes a visible outage the moment those calls become network
  requests at the backend cutover.

  Handling it per screen would mean writing the same three branches thirty-two
  times, which is how it came to be skipped. So it is one component, and using it
  is less work than not using it.
*/

export function QueryState<T>({
  query,
  skeleton,
  empty,
  isEmpty,
  errorTitle = "Could not load this",
  children,
}: {
  query: Query<T>;
  /** Shown on the first load only — a refetch keeps the previous data on screen. */
  skeleton: React.ReactNode;
  /** Optional: what to show when the call succeeded but returned nothing. */
  empty?: React.ReactNode;
  /** Defaults to "an empty array". Override for other shapes. */
  isEmpty?: (data: T) => boolean;
  errorTitle?: string;
  children: (data: T) => React.ReactNode;
}) {
  const { data, loading, error, refetch } = query;

  /*
    Error first, and only when there is nothing to show. If a refetch fails but
    stale data is still on screen, keeping the data and letting the reader retry
    beats replacing a working table with an error box.
  */
  if (error && data === undefined) {
    return (
      <Alert
        tone="danger"
        title={errorTitle}
        action={
          <Button variant="secondary" size="sm" onClick={refetch}>
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

  // Stale-while-revalidate: the skeleton is for the first load, not every load.
  if (data === undefined) {
    return loading ? <>{skeleton}</> : null;
  }

  const blank = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0;
  if (blank && empty) return <>{empty}</>;

  return <>{children(data)}</>;
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
