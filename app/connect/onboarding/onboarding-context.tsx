"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { onboardingRepo, type OnboardingDraft, type OnboardingStepId } from "@/lib/data";
import { furthestReachableStep, stepIndex } from "@/lib/rules/onboarding";
import { stepHref } from "./steps";

/*
  Wizard state.

  The draft is loaded once for the whole wizard and saved through the
  repository on every step, so "Save & exit" and a mid-wizard refresh both
  resume exactly where the applicant left off. In production the same calls hit
  a server-side draft row instead of localStorage; nothing here changes.
*/

type OnboardingContextValue = {
  draft: OnboardingDraft | null;
  loading: boolean;
  saving: boolean;
  save: (patch: Partial<OnboardingDraft>) => Promise<OnboardingDraft>;
  /** Saves the patch, marks the step complete and moves to `next`. */
  completeStep: (
    step: OnboardingStepId,
    patch: Partial<OnboardingDraft>,
    next: OnboardingStepId,
  ) => Promise<void>;
  restart: () => Promise<void>;
};

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return context;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<OnboardingDraft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    onboardingRepo.load().then((loaded) => {
      if (cancelled) return;
      setDraft(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = React.useCallback(async (patch: Partial<OnboardingDraft>) => {
    setSaving(true);
    try {
      const next = await onboardingRepo.save(patch);
      setDraft(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  const completeStep = React.useCallback(
    async (
      step: OnboardingStepId,
      patch: Partial<OnboardingDraft>,
      next: OnboardingStepId,
    ) => {
      await save({ ...patch, completedSteps: [step], currentStep: next });
      router.push(stepHref(next));
    },
    [router, save],
  );

  const restart = React.useCallback(async () => {
    await onboardingRepo.clear();
    const fresh = await onboardingRepo.load();
    setDraft(fresh);
    router.push(stepHref("account"));
  }, [router]);

  const value = React.useMemo(
    () => ({ draft, loading, saving, save, completeStep, restart }),
    [draft, loading, saving, save, completeStep, restart],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

/**
 * Clamps deep links. A pasted URL for a step the draft cannot justify sends the
 * applicant to the furthest step their data actually supports, rather than
 * rendering a form with nothing behind it.
 */
export function useStepGuard(step: OnboardingStepId) {
  const { draft, loading } = useOnboarding();
  const router = useRouter();
  const allowed = draft ? stepIndex(step) <= stepIndex(furthestReachableStep(draft)) : true;

  React.useEffect(() => {
    if (loading || !draft || allowed) return;
    router.replace(stepHref(furthestReachableStep(draft)));
  }, [allowed, draft, loading, router]);

  return { ready: !loading && Boolean(draft) && allowed, draft, loading };
}
