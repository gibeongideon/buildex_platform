"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare } from "lucide-react";
import { Alert, Card, CardBody } from "@/components/ui/primitives";
import { Field, Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { otpStepSchema, type OtpStep } from "@/lib/schemas/manufacturer";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";

/** Fixed so the demo is repeatable. Any six digits are accepted regardless. */
const DEMO_CODE = "482913";
const RESEND_SECONDS = 30;

export default function VerifyPhoneStepPage() {
  const { ready, draft } = useStepGuard("verify-phone");
  const { completeStep, saving } = useOnboarding();
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

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
      back="account"
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryLabel="Verify and continue"
    >
      <Card>
        <CardBody className="space-y-5">
          <Field error={form.formState.errors.code?.message}>
            <Label required>Verification code</Label>
            <Input
              {...form.register("code")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg font-semibold tracking-[0.5em] text-numeric"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={secondsLeft > 0}
              onClick={() => setSecondsLeft(RESEND_SECONDS)}
            >
              {secondsLeft > 0 ? (
                <span className="text-numeric">Resend code in {secondsLeft}s</span>
              ) : (
                "Resend code"
              )}
            </Button>
            <Link
              href="/connect/onboarding/account"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Use a different number
            </Link>
          </div>
        </CardBody>
      </Card>

      <Alert
        tone="info"
        className="mt-4"
        title="Demo build — no SMS is sent"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => form.setValue("code", DEMO_CODE, { shouldValidate: true })}
          >
            Fill code
          </Button>
        }
      >
        <p className="flex items-center gap-2">
          <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
          Your code is{" "}
          <span className="font-semibold tracking-wider text-numeric">{DEMO_CODE}</span> — any six
          digits will work.
        </p>
      </Alert>
    </StepShell>
  );
}
