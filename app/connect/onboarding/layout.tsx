"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { StepProgressBar, StepRail } from "@/components/shared/stepper";
import { TooltipProvider } from "@/components/ui/primitives";
import { furthestReachableStep, stepIndex } from "@/lib/rules/onboarding";
import type { OnboardingStepId } from "@/lib/data";
import { OnboardingProvider, useOnboarding } from "./onboarding-context";
import { STEPS } from "./steps";

/*
  The wizard runs in its own focused layout — no portal sidebar, no
  cross-navigation. An intake funnel converts better when the only ways out are
  forward or a deliberate "save and exit".
*/

function currentStepFrom(pathname: string): OnboardingStepId {
  const last = pathname.split("/").filter(Boolean).pop() ?? "account";
  return (STEPS.find((s) => s.id === last)?.id ?? "account") as OnboardingStepId;
}

function SavedIndicator() {
  const { saving, draft } = useOnboarding();
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

function WizardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { draft } = useOnboarding();
  const current = currentStepFrom(pathname);
  const currentIndex = stepIndex(current);
  const reachableIndex = draft ? stepIndex(furthestReachableStep(draft)) : 0;

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
          <Link href="/" className="rounded-md">
            <Wordmark product="connect" />
          </Link>
          <div className="flex items-center gap-3">
            <SavedIndicator />
            <ThemeToggle />
            <Link
              href="/connect/dashboard"
              className="hidden rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Save &amp; exit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <div className="hidden lg:block">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Manufacturer onboarding
            </p>
            <StepRail
              steps={STEPS}
              currentIndex={currentIndex}
              reachableIndex={reachableIndex}
            />
          </div>

          <StepProgressBar
            steps={STEPS}
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

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <OnboardingProvider>
        <WizardChrome>{children}</WizardChrome>
      </OnboardingProvider>
    </TooltipProvider>
  );
}
