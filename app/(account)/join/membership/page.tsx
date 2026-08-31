"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/primitives";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import {
  BillingCycleToggle,
  PlanCards,
  PlanComparison,
} from "@/components/shared/plan-picker";
import { customerRepo } from "@/lib/data";
import {
  MEMBERSHIP_PLAN_FEATURES,
  MEMBERSHIPS,
  annualSavingMonths,
  type MembershipCycle,
  type MembershipTier,
} from "@/lib/schemas/membership";
import { useJoinStepGuard, useRegistration } from "../registration-context";
import { joinHref } from "../steps";

export default function JoinMembershipStepPage() {
  const { ready, draft } = useJoinStepGuard("membership");
  const { save, saving } = useRegistration();
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  // Derived from the last click, otherwise the draft, otherwise free — rather
  // than synced out of the draft by an effect.
  const [choice, setChoice] = React.useState<{
    tier: MembershipTier;
    cycle: MembershipCycle;
  } | null>(null);

  const selected = choice?.tier ?? draft?.membership?.tier ?? "free";
  const cycle = choice?.cycle ?? draft?.membership?.cycle ?? "monthly";

  if (!ready) return <StepSkeleton />;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const next = await save({
        membership: { tier: selected, cycle },
        completedSteps: ["membership"],
      });
      const customer = await customerRepo.createFromDraft(next);
      // The draft has served its purpose; the account is the record now.
      await save({ customerId: customer.id });
      router.push("/account?welcome=1");
    } finally {
      setCreating(false);
    }
  };

  return (
    <StepShell
      title="Choose your membership"
      description="Search, categories and basic supplier information are free at every tier and always will be. What a membership buys is deeper information, better pricing and the ability to reach more suppliers at once."
      backHref={joinHref("profile")}
      onSubmit={onSubmit}
      submitting={saving || creating}
      primaryLabel="Create my account"
      wide
    >
      <div className="space-y-6">
        <BillingCycleToggle
          cycle={cycle}
          onChange={(nextCycle) =>
            setChoice({ tier: selected, cycle: nextCycle as MembershipCycle })
          }
          savingMonths={annualSavingMonths("pro")}
        />

        <PlanCards
          tiers={MEMBERSHIPS}
          selected={selected}
          cycle={cycle}
          onSelect={(tier) => setChoice({ tier: tier as MembershipTier, cycle })}
          label="Membership tier"
        />

        <PlanComparison
          tiers={MEMBERSHIPS}
          features={MEMBERSHIP_PLAN_FEATURES}
          highlight={selected}
          title="What each membership opens up"
        />

        <Alert tone="info" title="Pricing shown is indicative">
          Chapter 9 §9.12 is explicit that package names, prices, token allocations and
          final entitlements are proposals for system design and must be commercially
          validated before launch. Treat these figures as placeholders for the demo, not
          as an approved offer.
        </Alert>
      </div>
    </StepShell>
  );
}
