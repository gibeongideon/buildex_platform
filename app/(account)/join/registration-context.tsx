"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  registrationRepo,
  type RegistrationDraft,
  type RegistrationPatch,
  type RegistrationStepId,
} from "@/lib/data";
import {
  furthestReachableRegistrationStep,
  registrationStepIndex,
} from "@/lib/rules/customers";
import { joinHref } from "./steps";

/*
  Customer registration state.

  Same shape as the manufacturer wizard's provider, for the same reason: the
  draft is loaded once for the whole wizard and saved through the repository on
  every step, so a mid-registration refresh resumes where the customer left
  off. Two providers rather than one because the drafts are different records
  with different steps — sharing the state would mean a manufacturer's
  half-finished application and a customer's half-finished sign-up living in
  the same row.
*/

type RegistrationContextValue = {
  draft: RegistrationDraft | null;
  loading: boolean;
  saving: boolean;
  save: (patch: RegistrationPatch) => Promise<RegistrationDraft>;
  /** Saves the patch, marks the step complete and moves to `next`. */
  completeStep: (
    step: RegistrationStepId,
    patch: Partial<RegistrationDraft>,
    next: RegistrationStepId,
  ) => Promise<void>;
  restart: () => Promise<void>;
};

const RegistrationContext = React.createContext<RegistrationContextValue | null>(null);

export function useRegistration() {
  const context = React.useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used inside RegistrationProvider");
  }
  return context;
}

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<RegistrationDraft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    registrationRepo.load().then((loaded) => {
      if (cancelled) return;
      setDraft(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = React.useCallback(async (patch: RegistrationPatch) => {
    setSaving(true);
    try {
      const next = await registrationRepo.save(patch);
      setDraft(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  const completeStep = React.useCallback(
    async (
      step: RegistrationStepId,
      patch: Partial<RegistrationDraft>,
      next: RegistrationStepId,
    ) => {
      await save({ ...patch, completedSteps: [step], currentStep: next });
      router.push(joinHref(next));
    },
    [router, save],
  );

  const restart = React.useCallback(async () => {
    await registrationRepo.clear();
    const fresh = await registrationRepo.load();
    setDraft(fresh);
    router.push(joinHref("account"));
  }, [router]);

  const value = React.useMemo(
    () => ({ draft, loading, saving, save, completeStep, restart }),
    [draft, loading, saving, save, completeStep, restart],
  );

  return (
    <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
  );
}

/** Clamps a deep link to the furthest step the draft actually supports. */
export function useJoinStepGuard(step: RegistrationStepId) {
  const { draft, loading } = useRegistration();
  const router = useRouter();
  const allowed = draft
    ? registrationStepIndex(step) <=
      registrationStepIndex(furthestReachableRegistrationStep(draft))
    : true;

  React.useEffect(() => {
    if (loading || !draft || allowed) return;
    router.replace(joinHref(furthestReachableRegistrationStep(draft)));
  }, [allowed, draft, loading, router]);

  return { ready: !loading && Boolean(draft) && allowed, draft, loading };
}
