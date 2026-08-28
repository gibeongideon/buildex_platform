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

/*
  A wash rather than a fill.

  The tint fades out over the top third of the card, so the colour lands behind
  the label and the icon and has gone by the time the eye reaches the figure.
  A row of these reads as colour-coded at a glance without any card becoming a
  coloured block — and the value keeps the full contrast of plain surface
  underneath it.

  The rule along the top is the same tone at full strength: two pixels is enough
  to separate one card from its neighbour when the washes are this quiet.
*/
const TONE_WASH: Record<Tone, string> = {
  neutral: "from-surface-muted border-t-border-strong",
  info: "from-info-soft border-t-info",
  success: "from-success-soft border-t-success",
  warning: "from-warning-soft border-t-warning",
  danger: "from-danger-soft border-t-danger",
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
    <div
      className={cn(
        "rounded-lg border border-border border-t-2 bg-surface p-4",
        "bg-gradient-to-b to-surface to-45%",
        TONE_WASH[tone],
        className,
      )}
    >
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
