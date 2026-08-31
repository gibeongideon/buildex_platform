"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  RadioGroup,
  RadioItem,
  Separator,
} from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import { COUNTIES, regionForCounty } from "@/lib/schemas/common";
import {
  CUSTOMER_TYPE_HINTS,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES,
  customerProfileStepSchema,
  isBusinessType,
  type CustomerProfileStep,
  type CustomerType,
} from "@/lib/schemas/customer";
import { cn } from "@/lib/utils";
import { useJoinStepGuard, useRegistration } from "../registration-context";
import { joinHref } from "../steps";

export default function JoinProfileStepPage() {
  const { ready, draft } = useJoinStepGuard("profile");
  const { completeStep, saving } = useRegistration();

  const form = useForm<CustomerProfileStep>({
    resolver: zodResolver(customerProfileStepSchema),
    mode: "onBlur",
    defaultValues: {
      customerType: "homeowner",
      physicalAddress: "",
      town: "",
      county: "Nairobi",
      legalName: "",
      tradingName: "",
      kraPin: "",
    },
  });

  React.useEffect(() => {
    if (!draft?.profile) return;
    form.reset(draft.profile);
  }, [draft?.profile, form]);

  const customerType = form.watch("customerType");
  const county = form.watch("county");
  const needsBusiness = isBusinessType(customerType);

  if (!ready) return <StepSkeleton />;

  const onSubmit = form.handleSubmit(async (values) => {
    await completeStep("profile", { profile: values }, "membership");
  });

  const { errors } = form.formState;
  const region = regionForCounty(county);

  return (
    <StepShell
      title="Where are you buying, and what for?"
      description="Both answers change what you see. Suppliers deliver to some regions and not others, and the deals worth showing a hardware shop are not the ones worth showing a homeowner."
      backHref={joinHref("verify-phone")}
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
    >
      <Card>
        <CardBody className="space-y-5">
          <Field error={errors.customerType?.message}>
            <Label required>What kind of buyer are you?</Label>
            <RadioGroup
              value={customerType}
              onValueChange={(next) =>
                form.setValue("customerType", next as CustomerType, {
                  shouldValidate: true,
                })
              }
              className="grid gap-2 sm:grid-cols-2"
            >
              {CUSTOMER_TYPES.map((type) => {
                const selected = customerType === type;
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                      selected
                        ? "border-brand bg-brand-soft"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <RadioItem value={type} className="mt-0.5" />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm",
                          selected ? "font-medium text-foreground" : "text-foreground",
                        )}
                      >
                        {CUSTOMER_TYPE_LABELS[type]}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {CUSTOMER_TYPE_HINTS[type]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </Field>

          <Separator />

          <Field error={errors.physicalAddress?.message}>
            <Label required>Physical address</Label>
            <Input
              {...form.register("physicalAddress")}
              autoComplete="street-address"
              placeholder="Kamakis, Eastern Bypass"
            />
            <FieldHint>
              Street, estate or building — enough for a delivery to find you.
            </FieldHint>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.town?.message}>
              <Label required>Town or city</Label>
              <Input
                {...form.register("town")}
                autoComplete="address-level2"
                placeholder="Ruiru"
              />
            </Field>

            <Field error={errors.county?.message}>
              <Label required>County</Label>
              <Select {...form.register("county")}>
                {COUNTIES.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </Select>
              {region ? (
                <FieldHint>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden="true" />
                    We will show you suppliers who deliver to {region}.
                  </span>
                </FieldHint>
              ) : null}
            </Field>
          </div>

          {needsBusiness ? (
            <>
              <Separator />
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-foreground">Business details</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Needed because you are buying as a business. Verification happens
                    separately — declaring these now does not verify them.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field error={errors.legalName?.message}>
                    <Label required>Registered legal name</Label>
                    <Input
                      {...form.register("legalName")}
                      placeholder="Mwangi Hardware & Timber Limited"
                    />
                  </Field>

                  <Field error={errors.tradingName?.message}>
                    <Label required>Trading name</Label>
                    <Input
                      {...form.register("tradingName")}
                      placeholder="Mwangi Hardware & Timber"
                    />
                  </Field>
                </div>

                <Field error={errors.kraPin?.message}>
                  <Label required>KRA PIN</Label>
                  <Input
                    {...form.register("kraPin")}
                    placeholder="P051234567M"
                    className="uppercase"
                  />
                  <FieldHint>
                    Used for tax-compliant invoicing, and later for business
                    verification.
                  </FieldHint>
                </Field>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {needsBusiness ? null : (
        <Alert tone="info" className="mt-4" title="You can change this later">
          Buying for a business further down the line? Switch your account type in
          settings and add the registration details then — nothing here locks you in.
        </Alert>
      )}
    </StepShell>
  );
}
