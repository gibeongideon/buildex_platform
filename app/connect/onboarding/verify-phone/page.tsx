"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OtpField } from "@/components/shared/otp-field";
import { otpStepSchema, type OtpStep } from "@/lib/schemas/manufacturer";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import { stepHref } from "../steps";

export default function VerifyPhoneStepPage() {
  const { ready, draft } = useStepGuard("verify-phone");
  const { completeStep, saving } = useOnboarding();

  const form = useForm<OtpStep>({
    resolver: zodResolver(otpStepSchema),
    mode: "onSubmit",
    defaultValues: { code: "" },
  });

  if (!ready) return <StepSkeleton />;

  const onSubmit = form.handleSubmit(async () => {
    await completeStep("verify-phone", { phoneVerified: true }, "company");
  });

  return (
    <StepShell
      title="Verify your phone number"
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{draft?.account?.phone}</span>. Enquiries
          from hardware shops and verification updates both arrive by SMS, so this number needs
          to be reachable.
        </>
      }
      backHref={stepHref("account")}
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryLabel="Verify and continue"
    >
      <OtpField
        registration={form.register("code")}
        error={form.formState.errors.code?.message}
        onFill={(code) => form.setValue("code", code, { shouldValidate: true })}
        changeNumberHref="/connect/onboarding/account"
        reason={null}
      />
    </StepShell>
  );
}
