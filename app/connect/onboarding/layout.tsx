import type { Metadata } from "next";
import { OnboardingShell } from "./onboarding-shell";

export const metadata: Metadata = {
  title: "Manufacturer onboarding",
  description:
    "Register as a manufacturer on Buildex Connect: company details, directors, documents and verification.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingShell>{children}</OnboardingShell>;
}
