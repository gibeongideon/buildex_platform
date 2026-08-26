"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Wizard progress.

  Nine steps is too many to read horizontally, so desktop gets a vertical rail
  where every step name is legible at a glance, and mobile gets a compact
  "step N of M" bar. Steps the draft cannot yet justify are locked rather than
  hidden — the applicant can see what is still ahead of them.
*/

export type StepDescriptor = {
  id: string;
  label: string;
  description?: string;
  href: string;
};

type StepState = "complete" | "current" | "upcoming" | "locked";

function stateFor(
  index: number,
  currentIndex: number,
  reachableIndex: number,
): StepState {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return index <= reachableIndex ? "upcoming" : "locked";
}

function Marker({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
        state === "complete" && "border-brand bg-brand text-brand-foreground",
        state === "current" && "border-brand bg-surface text-brand",
        state === "upcoming" && "border-border-strong bg-surface text-subtle-foreground",
        state === "locked" && "border-border bg-surface-muted text-subtle-foreground",
      )}
    >
      {state === "complete" ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : state === "locked" ? (
        <Lock className="size-3" />
      ) : (
        index + 1
      )}
    </span>
  );
}

export function StepRail({
  steps,
  currentIndex,
  reachableIndex,
  className,
}: {
  steps: StepDescriptor[];
  currentIndex: number;
  reachableIndex: number;
  className?: string;
}) {
  return (
    <nav aria-label="Onboarding progress" className={className}>
      <ol className="space-y-0.5">
        {steps.map((step, index) => {
          const state = stateFor(index, currentIndex, reachableIndex);
          const interactive = state !== "locked" && state !== "current";
          const isLast = index === steps.length - 1;

          const body = (
            <>
              <div className="relative flex flex-col items-center self-stretch">
                <Marker state={state} index={index} />
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 w-px flex-1",
                      index < currentIndex ? "bg-brand/40" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
              <div className="min-w-0 pb-4">
                <p
                  className={cn(
                    "text-sm leading-6",
                    state === "current"
                      ? "font-semibold text-foreground"
                      : state === "locked"
                        ? "text-subtle-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                {step.description && state === "current" ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                ) : null}
              </div>
            </>
          );

          return (
            <li key={step.id}>
              {interactive ? (
                <Link
                  href={step.href}
                  className="flex gap-3 rounded-md transition-colors hover:opacity-80"
                >
                  {body}
                </Link>
              ) : (
                <div
                  className="flex gap-3"
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepProgressBar({
  steps,
  currentIndex,
  className,
}: {
  steps: StepDescriptor[];
  currentIndex: number;
  className?: string;
}) {
  const current = steps[currentIndex];
  const percent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{current?.label}</p>
        <p className="shrink-0 text-xs text-muted-foreground text-numeric">
          Step {currentIndex + 1} of {steps.length}
        </p>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
