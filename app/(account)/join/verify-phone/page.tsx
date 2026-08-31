"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OtpField } from "@/components/shared/otp-field";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import { otpStepSchema, type OtpStep } from "@/lib/schemas/manufacturer";
import { useJoinStepGuard, useRegistration } from "../registration-context";
import { joinHref } from "../steps";

export default function JoinVerifyPhoneStepPage() {
  const { ready, draft } = useJoinStepGuard("verify-phone");
  const { completeStep, saving } = useRegistration();

  const form = useForm<OtpStep>({
    resolver: zodResolver(otpStepSchema),
    mode: "onSubmit",
    defaultValues: { code: "" },
  });

  if (!ready) return <StepSkeleton />;

  const onSubmit = form.handleSubmit(async () => {
    await completeStep("verify-phone", { phoneVerified: true }, "profile");
  });

  return (
    <StepShell
      title="Verify your phone number"
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{draft?.account?.phone}</span>. A
          verified number is what lets a supplier reach you about a quote, and it is one of
          the checks behind your Trust Profile.
        </>
      }
      backHref={joinHref("account")}
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryLabel="Verify and continue"
    >
      <OtpField
        registration={form.register("code")}
        error={form.formState.errors.code?.message}
        onFill={(code) => form.setValue("code", code, { shouldValidate: true })}
        changeNumberHref={joinHref("account")}
        reason={null}
      />
    </StepShell>
  );
}
