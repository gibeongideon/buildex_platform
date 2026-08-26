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
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [selected, setSelected] = React.useState<PackageKey>("free");

  React.useEffect(() => {
    if (draft?.subscription) {
      setSelected(draft.subscription.package);
      setCycle(draft.subscription.billingCycle);
    }
  }, [draft?.subscription]);

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
        <BillingCycleToggle cycle={cycle} onChange={setCycle} />
        <PackageCards selected={selected} cycle={cycle} onSelect={setSelected} />
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
