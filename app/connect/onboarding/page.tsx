"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { furthestReachableStep } from "@/lib/rules/onboarding";
import { useOnboarding } from "./onboarding-context";
import { stepHref } from "./steps";
import { StepSkeleton } from "./step-frame";

/**
 * `/connect/onboarding` is a resume link: it sends the applicant to the
 * furthest step their draft supports, which is the first step for a new
 * applicant and their last position for a returning one.
 */
export default function OnboardingIndexPage() {
  const { draft, loading } = useOnboarding();
  const router = useRouter();

  React.useEffect(() => {
    if (loading || !draft) return;
    router.replace(stepHref(furthestReachableStep(draft)));
  }, [draft, loading, router]);

  return <StepSkeleton />;
}
