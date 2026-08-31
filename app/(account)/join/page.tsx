"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StepSkeleton } from "@/components/shared/step-frame";
import { furthestReachableRegistrationStep } from "@/lib/rules/customers";
import { useRegistration } from "./registration-context";
import { joinHref } from "./steps";

/**
 * `/join` is a resume link: the first step for a new visitor, and their last
 * position for anyone coming back to a half-finished sign-up.
 */
export default function JoinIndexPage() {
  const { draft, loading } = useRegistration();
  const router = useRouter();

  React.useEffect(() => {
    if (loading || !draft) return;
    router.replace(joinHref(furthestReachableRegistrationStep(draft)));
  }, [draft, loading, router]);

  return <StepSkeleton />;
}
