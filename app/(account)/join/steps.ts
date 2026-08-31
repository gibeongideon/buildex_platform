import type { StepDescriptor } from "@/components/shared/stepper";
import { REGISTRATION_STEP_ORDER } from "@/lib/rules/customers";
import type { RegistrationStepId } from "@/lib/data";

const COPY: Record<RegistrationStepId, { label: string; description: string }> = {
  account: {
    label: "Create your account",
    description: "Your name, email and phone — and a password.",
  },
  "verify-phone": {
    label: "Verify your phone",
    description: "Quotes and delivery updates arrive by SMS.",
  },
  profile: {
    label: "Where you are buying",
    description: "Your location, and what kind of buyer you are.",
  },
  membership: {
    label: "Choose your membership",
    description: "Start free. Upgrade whenever it pays for itself.",
  },
};

export const JOIN_STEPS: StepDescriptor[] = REGISTRATION_STEP_ORDER.map((id) => ({
  id,
  label: COPY[id].label,
  description: COPY[id].description,
  href: `/join/${id}`,
}));

export function joinHref(id: RegistrationStepId) {
  return `/join/${id}`;
}
