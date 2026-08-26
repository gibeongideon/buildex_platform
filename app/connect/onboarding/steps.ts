import type { StepDescriptor } from "@/components/shared/stepper";
import { ONBOARDING_STEP_ORDER } from "@/lib/rules/onboarding";
import type { OnboardingStepId } from "@/lib/data";

const COPY: Record<OnboardingStepId, { label: string; description: string }> = {
  account: {
    label: "Create your account",
    description: "Your contact details and login for Buildex Connect.",
  },
  "verify-phone": {
    label: "Verify your phone",
    description: "We send order enquiries and verification updates by SMS.",
  },
  company: {
    label: "Company details",
    description: "Registered details as they appear at BRS and KRA.",
  },
  directors: {
    label: "Directors & ownership",
    description: "Everyone listed on your CR12, with shareholding.",
  },
  documents: {
    label: "Upload documents",
    description: "Your KYB pack. PDF, JPG or PNG.",
  },
  review: {
    label: "Review & submit",
    description: "Check everything before it goes to Buildex Operations.",
  },
  verification: {
    label: "Verification",
    description: "Live status of the checks on your application.",
  },
  subscription: {
    label: "Choose a package",
    description: "Start free and upgrade whenever you like.",
  },
  "first-listing": {
    label: "List your first product",
    description: "See exactly what a hardware shop will see.",
  },
};

export const STEPS: StepDescriptor[] = ONBOARDING_STEP_ORDER.map((id) => ({
  id,
  label: COPY[id].label,
  description: COPY[id].description,
  href: `/connect/onboarding/${id}`,
}));

export function stepHref(id: OnboardingStepId) {
  return `/connect/onboarding/${id}`;
}
