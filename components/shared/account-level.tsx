import * as React from "react";
import { StatusPill } from "@/components/ui/primitives";
import { VerifiedMark } from "./verified-mark";
import {
  VERIFICATION_LEVEL_ACCESS,
  VERIFICATION_LEVEL_DESCRIPTIONS,
  VERIFICATION_LEVEL_LABELS,
  VERIFICATION_LEVEL_TONE,
  VERIFICATION_LEVELS,
  verificationLevelIndex,
  type VerificationLevel,
} from "@/lib/schemas/customer";
import { cn } from "@/lib/utils";

/*
  A customer's verification level — Chapter 9 §9.6.

  Deliberately *not* a new seal. The scalloped mark in `verified-mark.tsx`
  means one specific thing on this platform: Buildex checked a company against
  BRS, KRA and IPRS. Minting three more seal variants for customer levels would
  either dilute that or be mistaken for it, on a marketplace where the whole
  product is knowing what a badge actually attests to.

  So a level reads as a pill — the interface's existing device for "what state
  is this record in" — and the seal appears beside it only from
  `verified_member` up, where a real verification has in fact happened. At
  `registered` there is no mark, because nothing beyond an email and a phone has
  been established and a badge for that would be worth nothing.
*/

/** From `verified_member` up, an actual check has been done. */
function hasSeal(level: VerificationLevel) {
  return verificationLevelIndex(level) >= verificationLevelIndex("verified_member");
}

export function AccountLevelBadge({
  level,
  className,
}: {
  level: VerificationLevel;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={VERIFICATION_LEVEL_DESCRIPTIONS[level]}
    >
      {hasSeal(level) ? <VerifiedMark subject="account" /> : null}
      <StatusPill tone={VERIFICATION_LEVEL_TONE[level]}>
        {VERIFICATION_LEVEL_LABELS[level]}
      </StatusPill>
    </span>
  );
}

/**
 * The whole ladder, with the one the account is on marked.
 *
 * Shown rather than described because §9.6 is a progression: a customer needs
 * to see the step above theirs to have any reason to reach it, and the access
 * column is what makes the reason concrete.
 */
export function AccountLevelLadder({ level }: { level: VerificationLevel }) {
  const current = verificationLevelIndex(level);

  return (
    <ol className="space-y-2">
      {VERIFICATION_LEVELS.map((entry, index) => {
        const isCurrent = index === current;
        const reached = index <= current;

        return (
          <li
            key={entry}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "rounded-md border px-3 py-2.5",
              isCurrent
                ? "border-brand bg-brand-soft"
                : "border-border bg-surface",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {VERIFICATION_LEVEL_LABELS[entry]}
              </span>
              {isCurrent ? (
                <StatusPill tone="info">You are here</StatusPill>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {VERIFICATION_LEVEL_DESCRIPTIONS[entry]}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">
              {VERIFICATION_LEVEL_ACCESS[entry]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
