import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton, type Tone } from "@/components/ui/primitives";

/**
 * A single figure with its label.
 *
 * The icon carries a tone, and the tone carries meaning: an overdue count is
 * amber, a breach is red, a completion is green, everything else is brand blue.
 * That is the difference between an interface with colour and an interface that
 * is merely coloured — a reader can scan a row of these and know where to look
 * before reading a single number.
 *
 * Numbers still do the talking. The tone tints a small chip behind the icon and
 * nothing else, so the figure itself stays the loudest thing on the card.
 */

const TONE_CHIP: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "info",
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Meaning, not decoration — see the note above. */
  tone?: Tone;
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
        {icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              TONE_CHIP[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
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
