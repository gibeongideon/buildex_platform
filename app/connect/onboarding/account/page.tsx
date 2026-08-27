"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, CheckboxRow, Separator } from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label } from "@/components/ui/field";
import { accountStepSchema, type AccountStep } from "@/lib/schemas/manufacturer";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { SectionGuide } from "@/components/shared/section-guide";
import { StepShell, StepSkeleton } from "../step-frame";

export default function AccountStepPage() {
  const { ready, draft } = useStepGuard("account");
  const { completeStep, saving } = useOnboarding();

  const form = useForm<AccountStep>({
    resolver: zodResolver(accountStepSchema),
    mode: "onBlur",
    defaultValues: {
      contactName: "",
      email: "",
      phone: "+254",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
      acceptedDataProcessing: false,
    },
  });

  // Repopulate when returning to the step. Passwords are never stored in the
  // draft, so they are re-entered — which is the correct behaviour anyway.
  React.useEffect(() => {
    if (!draft?.account) return;
    form.reset({
      ...draft.account,
      password: "",
      confirmPassword: "",
    });
  }, [draft?.account, form]);

  if (!ready) return <StepSkeleton />;

  const onSubmit = form.handleSubmit(async (values) => {
    await completeStep(
      "account",
      {
        account: {
          contactName: values.contactName,
          email: values.email,
          phone: values.phone,
          acceptedTerms: values.acceptedTerms,
          acceptedDataProcessing: values.acceptedDataProcessing,
        },
      },
      "verify-phone",
    );
  });

  const { errors } = form.formState;

  return (
    <StepShell
      title="Create your Buildex Connect account"
      description="This is the person Buildex Operations will contact about your application. You can add colleagues to the account later."
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryLabel="Create account"
    >
      <SectionGuide sectionKey="onboarding" />
      <Card>
        <CardBody className="space-y-5">
          <Field error={errors.contactName?.message}>
            <Label required>Full name</Label>
            <Input
              {...form.register("contactName")}
              autoComplete="name"
              placeholder="Grace Wanjiru"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.email?.message}>
              <Label required>Work email</Label>
              <Input
                {...form.register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@company.co.ke"
              />
            </Field>

            <Field error={errors.phone?.message}>
              <Label required>Mobile number</Label>
              <Input
                {...form.register("phone")}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+254712345678"
              />
              <FieldHint>We verify this by SMS on the next step.</FieldHint>
            </Field>
          </div>

          <Separator />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.password?.message}>
              <Label required>Password</Label>
              <Input
                {...form.register("password")}
                type="password"
                autoComplete="new-password"
              />
              <FieldHint>At least 8 characters, with a letter and a number.</FieldHint>
            </Field>

            <Field error={errors.confirmPassword?.message}>
              <Label required>Confirm password</Label>
              <Input
                {...form.register("confirmPassword")}
                type="password"
                autoComplete="new-password"
              />
            </Field>
          </div>

          <Separator />

          <div className="space-y-3">
            <Field error={errors.acceptedTerms?.message}>
              <CheckboxRow
                id="accept-terms"
                checked={form.watch("acceptedTerms")}
                onCheckedChange={(checked) =>
                  form.setValue("acceptedTerms", checked, { shouldValidate: true })
                }
                label="I accept the Buildex Connect marketplace terms"
                description="Covers listing conduct, pricing accuracy and order fulfilment obligations."
              />
            </Field>

            <Field error={errors.acceptedDataProcessing?.message}>
              <CheckboxRow
                id="accept-data"
                checked={form.watch("acceptedDataProcessing")}
                onCheckedChange={(checked) =>
                  form.setValue("acceptedDataProcessing", checked, { shouldValidate: true })
                }
                label="I consent to Buildex verifying my company and director details"
                description="Required under the Data Protection Act, 2019. Covers checks against BRS, KRA and IPRS records."
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/connect/dashboard" className="font-medium text-brand hover:underline">
          Go to your dashboard
        </Link>
      </p>
    </StepShell>
  );
}
