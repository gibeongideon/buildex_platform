"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { StepProgressBar, StepRail } from "@/components/shared/stepper";
import { TooltipProvider } from "@/components/ui/primitives";
import {
  furthestReachableRegistrationStep,
  registrationStepIndex,
} from "@/lib/rules/customers";
import type { RegistrationStepId } from "@/lib/data";
import { RegistrationProvider, useRegistration } from "./registration-context";
import { JOIN_STEPS } from "./steps";

/*
  Customer registration runs in the same focused chrome as the manufacturer
  wizard — no marketplace header, no sidebar, one way forward.

  The one difference is the escape hatch. A manufacturer mid-application has
  something worth saving and gets "Save & exit"; a customer mid-sign-up has not
  committed to anything, so the link back is simply to the marketplace. §9.40
  again: ordinary access must not feel like an application process.
*/

function currentStepFrom(pathname: string): RegistrationStepId {
  const last = pathname.split("/").filter(Boolean).pop() ?? "account";
  return (JOIN_STEPS.find((s) => s.id === last)?.id ?? "account") as RegistrationStepId;
}

function SavedIndicator() {
  const { saving, draft } = useRegistration();
  if (saving) {
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  }
  if (!draft?.account) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
      Progress saved
    </span>
  );
}

function JoinChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { draft } = useRegistration();
  const current = currentStepFrom(pathname);
  const currentIndex = registrationStepIndex(current);
  const reachableIndex = draft
    ? registrationStepIndex(furthestReachableRegistrationStep(draft))
    : 0;

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#wizard"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-foreground"
      >
        Skip to form
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/marketplace" className="rounded-md">
            <Wordmark product="connect" />
          </Link>
          <div className="flex items-center gap-3">
            <SavedIndicator />
            <ThemeToggle />
            <Link
              href="/marketplace"
              className="hidden rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Keep browsing
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <div className="hidden lg:block">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Create your account
            </p>
            <StepRail
              steps={JOIN_STEPS}
              currentIndex={currentIndex}
              reachableIndex={reachableIndex}
            />
          </div>

          <StepProgressBar
            steps={JOIN_STEPS}
            currentIndex={currentIndex}
            className="mb-6 lg:hidden"
          />

          <main id="wizard" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <RegistrationProvider>
        <JoinChrome>{children}</JoinChrome>
      </RegistrationProvider>
    </TooltipProvider>
  );
}
