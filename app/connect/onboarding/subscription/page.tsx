"use client";

import * as React from "react";
import { Alert } from "@/components/ui/primitives";
import {
  BillingCycleToggle,
  PackageCards,
  PackageComparison,
} from "@/components/shared/package-picker";
import { manufacturerRepo } from "@/lib/data";
import type { BillingCycle, PackageKey } from "@/lib/schemas/subscription";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";

export default function SubscriptionStepPage() {
  const { ready, draft } = useStepGuard("subscription");
  const { completeStep, saving } = useOnboarding();

  // Derived rather than synced from the draft by an effect: the choice is
  // whatever the applicant last clicked, otherwise whatever the draft already
  // holds, otherwise Free.
  const [choice, setChoice] = React.useState<{
    pkg: PackageKey;
    cycle: BillingCycle;
  } | null>(null);

  const selected = choice?.pkg ?? draft?.subscription?.package ?? "free";
  const cycle = choice?.cycle ?? draft?.subscription?.billingCycle ?? "monthly";

  if (!ready) return <StepSkeleton />;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft?.manufacturerId) {
      await manufacturerRepo.setSubscription(draft.manufacturerId, selected, cycle);
    }
    await completeStep(
      "subscription",
      { subscription: { package: selected, billingCycle: cycle } },
      "first-listing",
    );
  };

  return (
    <StepShell
      title="Choose a package"
      description="Every manufacturer starts listed. Paid packages add visibility, market data and — on VIP — a Buildex account manager who actively sells your range into the hardware network."
      onSubmit={onSubmit}
      submitting={saving}
      primaryLabel="Continue"
      wide
    >
      <div className="space-y-6">
        <BillingCycleToggle
          cycle={cycle}
          onChange={(nextCycle) => setChoice({ pkg: selected, cycle: nextCycle })}
        />
        <PackageCards
          selected={selected}
          cycle={cycle}
          onSelect={(pkg) => setChoice({ pkg, cycle })}
        />
        <PackageComparison highlight={selected} />

        <Alert tone="info" title="Pricing shown is indicative">
          Package pricing is still with Management and Commercial for approval (Action register:
          &ldquo;Define manufacturer packages and pricing&rdquo;). Treat these figures as
          placeholders for the demo, not as an approved commercial offer.
        </Alert>
      </div>
    </StepShell>
  );
}
