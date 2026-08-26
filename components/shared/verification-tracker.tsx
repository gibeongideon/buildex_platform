"use client";

import * as React from "react";
import { AlertTriangle, Check, Clock, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/primitives";
import {
  CHECK_LABELS,
  CHECK_TONE,
  checkMeta,
  slaHoursRemaining,
  type CheckStatus,
  type VerificationCheck,
} from "@/lib/schemas/verification";

/*
  The five-check verification pipeline, shown to the manufacturer during
  onboarding and again on their verification page.

  Each row states which authority is responsible and where it stands against
  its SLA. Applicants chase the ones that go quiet, so naming the authority and
  showing the clock removes most of the "any update?" support load.
*/

const ICONS: Record<CheckStatus, React.ElementType> = {
  pending: Clock,
  in_review: Loader2,
  passed: Check,
  action_needed: AlertTriangle,
  not_required: Minus,
};

function SlaLabel({ check }: { check: VerificationCheck }) {
  const hours = slaHoursRemaining(check);
  if (hours === null) return null;

  if (hours < 0) {
    return (
      <span className="text-xs font-medium text-danger text-numeric">
        Overdue by {Math.abs(Math.round(hours))}h
      </span>
    );
  }
  if (hours < 24) {
    return (
      <span className="text-xs text-muted-foreground text-numeric">
        Due in {Math.max(Math.round(hours), 1)}h
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground text-numeric">
      Due in {Math.round(hours / 24)}d
    </span>
  );
}

export function VerificationTracker({
  checks,
  onFixDocuments,
}: {
  checks: VerificationCheck[];
  onFixDocuments?: (documentTypes: string[]) => void;
}) {
  return (
    <ol className="divide-y divide-border">
      {checks.map((check) => {
        const meta = checkMeta(check.key);
        const Icon = ICONS[check.status];
        const dimmed = check.status === "not_required";

        return (
          <li key={check.key} className={cn("flex gap-3 py-4", dimmed && "opacity-60")}>
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                check.status === "passed" && "border-success/25 bg-success-soft text-success",
                check.status === "in_review" && "border-info/25 bg-info-soft text-info",
                check.status === "action_needed" &&
                  "border-warning/30 bg-warning-soft text-warning",
                (check.status === "pending" || check.status === "not_required") &&
                  "border-border bg-surface-muted text-subtle-foreground",
              )}
            >
              <Icon
                className={cn("size-3.5", check.status === "in_review" && "animate-spin")}
                strokeWidth={check.status === "passed" ? 3 : 2}
                aria-hidden="true"
              />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{meta.label}</p>
                <div className="flex items-center gap-2">
                  <SlaLabel check={check} />
                  <StatusPill tone={CHECK_TONE[check.status]}>
                    {CHECK_LABELS[check.status]}
                  </StatusPill>
                </div>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
              <p className="mt-1 text-xs text-subtle-foreground">
                Verified by {meta.authority}
                {check.status === "not_required"
                  ? " · not required for your application"
                  : ` · target ${meta.slaHours >= 24 ? `${meta.slaHours / 24} working day${meta.slaHours > 24 ? "s" : ""}` : `${meta.slaHours} hours`}`}
              </p>

              {check.status === "action_needed" && check.note ? (
                <div
                  role="alert"
                  className="mt-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2"
                >
                  <p className="text-xs text-warning">{check.note}</p>
                  {check.blockingDocuments.length > 0 && onFixDocuments ? (
                    <button
                      type="button"
                      onClick={() => onFixDocuments(check.blockingDocuments)}
                      className="mt-1.5 text-xs font-semibold text-warning underline underline-offset-2"
                    >
                      Upload replacement
                      {check.blockingDocuments.length > 1 ? "s" : ""}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
