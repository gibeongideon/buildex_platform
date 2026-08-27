import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/primitives";

/**
 * A single figure with its label. Deliberately plain: in a product where
 * numbers carry the meaning, decoration around them costs legibility.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        {/*
          Uppercase 12px is the least legible text on any of these screens, and
          it is the label for every number — so it takes the stronger of the two
          secondary tones and a heavier weight, not the faintest.
        */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-subtle-foreground">{icon}</span> : null}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground text-numeric">
          {value}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
