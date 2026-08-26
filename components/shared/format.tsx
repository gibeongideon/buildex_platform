import * as React from "react";
import { cn, formatKsh, formatNumber, formatPercent } from "@/lib/utils";

/*
  Every figure on screen goes through one of these.

  They exist for two reasons: money is never rendered as a bare number, and
  numerals are always tabular so columns of figures line up. Both matter more
  in a lending product than they do in most software.
*/

export function Currency({
  value,
  decimals = false,
  compact = false,
  className,
}: {
  value: number;
  decimals?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span data-numeric className={cn("text-numeric", className)}>
      {formatKsh(value, { decimals, compact })}
    </span>
  );
}

export function Num({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <span data-numeric className={cn("text-numeric", className)}>
      {formatNumber(value, decimals)}
    </span>
  );
}

export function Pct({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <span data-numeric className={cn("text-numeric", className)}>
      {formatPercent(value, decimals)}
    </span>
  );
}

/** Label/value row used across review screens and detail panels. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6",
        className,
      )}
    >
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground sm:text-right">
        {value || <span className="text-subtle-foreground">Not provided</span>}
      </dd>
    </div>
  );
}
