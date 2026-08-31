"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, CheckboxRow, Separator } from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label } from "@/components/ui/field";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import {
  customerAccountStepSchema,
  type CustomerAccountStep,
} from "@/lib/schemas/customer";
import { useJoinStepGuard, useRegistration } from "../registration-context";

export default function JoinAccountStepPage() {
  const { ready, draft } = useJoinStepGuard("account");
  const { completeStep, saving } = useRegistration();

  const form = useForm<CustomerAccountStep>({
    resolver: zodResolver(customerAccountStepSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "+254",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
      acceptedDataProcessing: false,
    },
  });

  // Repopulate on return. Passwords are never held in the draft, so they are
  // re-entered — which is the right behaviour regardless.
  React.useEffect(() => {
    if (!draft?.account) return;
    form.reset({ ...draft.account, password: "", confirmPassword: "" });
  }, [draft?.account, form]);

  if (!ready) return <StepSkeleton />;

  const onSubmit = form.handleSubmit(async (values) => {
    await completeStep(
      "account",
      {
        account: {
          name: values.name,
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
      description="Search is free and stays free. An account is what lets you save what you find, request quotes and build a trading record."
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryLabel="Create account"
    >
      <Card>
        <CardBody className="space-y-5">
          <Field error={errors.name?.message}>
            <Label required>Full name</Label>
            <Input
              {...form.register("name")}
              autoComplete="name"
              placeholder="Grace Wanjiru"
            />
            <FieldHint>
              Or your business name, if you are buying for a company.
            </FieldHint>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.email?.message}>
              <Label required>Email address</Label>
              <Input
                {...form.register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.co.ke"
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
                id="join-accept-terms"
                checked={form.watch("acceptedTerms")}
                onCheckedChange={(checked) =>
                  form.setValue("acceptedTerms", checked, { shouldValidate: true })
                }
                label="I accept the Buildex Connect marketplace terms"
                description="Covers how quotations, orders and disputes work between you and a supplier."
              />
            </Field>

            <Field error={errors.acceptedDataProcessing?.message}>
              <CheckboxRow
                id="join-accept-data"
                checked={form.watch("acceptedDataProcessing")}
                onCheckedChange={(checked) =>
                  form.setValue("acceptedDataProcessing", checked, {
                    shouldValidate: true,
                  })
                }
                label="I consent to Buildex processing my details to run my account"
                description="Required under the Data Protection Act, 2019. Covers matching you to suppliers who can reach your area, and the trading record on your Trust Profile."
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Selling rather than buying?{" "}
        <Link
          href="/connect/onboarding/account"
          className="font-medium text-brand hover:underline"
        >
          Register as a manufacturer
        </Link>
      </p>
    </StepShell>
  );
}
