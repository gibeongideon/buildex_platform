"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChipGroup,
} from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { manufacturerRepo } from "@/lib/data";
import {
  CAPACITY_BANDS,
  COUNTIES,
  PRODUCT_CATEGORIES,
  REGIONS,
  type ProductCategory,
  type Region,
} from "@/lib/schemas/common";
import { companyStepSchema, type CompanyStep } from "@/lib/schemas/manufacturer";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";

type PinCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "duplicate"; company: string };

export default function CompanyStepPage() {
  const { ready, draft } = useStepGuard("company");
  const { completeStep, saving } = useOnboarding();
  const [pinCheck, setPinCheck] = React.useState<PinCheck>({ state: "idle" });

  const form = useForm<CompanyStep>({
    resolver: zodResolver(companyStepSchema),
    mode: "onBlur",
    defaultValues: {
      legalName: "",
      tradingName: "",
      brsNumber: "",
      kraPin: "",
      yearEstablished: new Date().getFullYear() - 5,
      physicalAddress: "",
      county: "",
      website: "",
      categories: [],
      capacityBand: "",
      distributionRegions: [],
    },
  });

  React.useEffect(() => {
    if (draft?.company) form.reset(draft.company);
  }, [draft?.company, form]);

  if (!ready) return <StepSkeleton />;

  /**
   * A KRA PIN can only back one manufacturer account. Checking on blur rather
   * than on submit means the applicant finds out before filling in the rest of
   * the form.
   */
  async function checkPin(value: string) {
    const pin = value.trim().toUpperCase();
    if (!/^[A-Z]\d{9}[A-Z]$/.test(pin)) {
      setPinCheck({ state: "idle" });
      return;
    }
    setPinCheck({ state: "checking" });
    const existing = await manufacturerRepo.findByKraPin(pin);
    setPinCheck(
      existing
        ? { state: "duplicate", company: existing.legalName }
        : { state: "available" },
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (pinCheck.state === "duplicate") return;
    await completeStep("company", { company: values }, "directors");
  });

  const { errors } = form.formState;
  const categories = form.watch("categories") ?? [];
  const regions = form.watch("distributionRegions") ?? [];

  return (
    <StepShell
      title="Company details"
      description="Enter these exactly as they appear on your registration documents. Buildex verifies them against BRS and KRA records, and mismatches are the most common reason an application stalls."
      back="verify-phone"
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
      primaryDisabled={pinCheck.state === "duplicate"}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field error={errors.legalName?.message}>
                <Label required>Registered legal name</Label>
                <Input
                  {...form.register("legalName")}
                  placeholder="Savannah Cement Works Limited"
                />
              </Field>

              <Field error={errors.tradingName?.message}>
                <Label required>Trading name</Label>
                <Input {...form.register("tradingName")} placeholder="Savannah Cement" />
                <FieldHint>What hardware shops will see on the marketplace.</FieldHint>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field error={errors.brsNumber?.message}>
                <Label required>BRS registration number</Label>
                <Input
                  {...form.register("brsNumber")}
                  placeholder="PVT-7XKLM9Y"
                  className="uppercase"
                />
              </Field>

              <Field error={errors.kraPin?.message}>
                <Label required>KRA PIN</Label>
                <Input
                  {...form.register("kraPin", {
                    onBlur: (event) => checkPin(event.target.value),
                  })}
                  placeholder="P051234567M"
                  className="uppercase"
                />
                {pinCheck.state === "checking" ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    Checking the KRA registry…
                  </p>
                ) : null}
                {pinCheck.state === "available" ? (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    PIN is not yet registered on Buildex Connect.
                  </p>
                ) : null}
              </Field>
            </div>

            {pinCheck.state === "duplicate" ? (
              <Alert
                tone="danger"
                title="This KRA PIN is already registered"
                action={
                  <a
                    href="mailto:connect@buildex.co.ke"
                    className="text-sm font-semibold underline underline-offset-2"
                  >
                    Contact support
                  </a>
                }
              >
                <p className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{pinCheck.company}</span> already holds an
                    account using this PIN. A PIN can only back one manufacturer account. If
                    this is your company, ask your administrator to invite you, or contact
                    Buildex to recover access.
                  </span>
                </p>
              </Alert>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field error={errors.yearEstablished?.message}>
                <Label required>Year established</Label>
                <Input
                  {...form.register("yearEstablished", { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={new Date().getFullYear()}
                  className="text-numeric"
                />
              </Field>

              <Field error={errors.website?.message}>
                <Label>Website</Label>
                <Input
                  {...form.register("website")}
                  type="url"
                  placeholder="https://yourcompany.co.ke"
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <Field error={errors.physicalAddress?.message}>
              <Label required>Physical address</Label>
              <Input
                {...form.register("physicalAddress")}
                placeholder="Plot 114, Athi River Industrial Area"
              />
              <FieldHint>
                Where production happens. Used if a physical verification visit is required.
              </FieldHint>
            </Field>

            <Field error={errors.county?.message}>
              <Label required>County</Label>
              <Select {...form.register("county")}>
                <option value="">Select a county</option>
                {COUNTIES.map((county) => (
                  <option key={county.name} value={county.name}>
                    {county.name} — {county.region}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you manufacture</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <Field error={errors.categories?.message}>
              <Label required>Product categories</Label>
              <FieldHint>
                Hardware shops browse by category first. Select every category you produce.
              </FieldHint>
              <div className="pt-1">
                <ChipGroup
                  label="Product categories"
                  options={PRODUCT_CATEGORIES}
                  value={categories as ProductCategory[]}
                  onChange={(next) =>
                    form.setValue("categories", next, { shouldValidate: true })
                  }
                  columns={2}
                />
              </div>
            </Field>

            <Field error={errors.capacityBand?.message}>
              <Label required>Monthly production capacity</Label>
              <Select {...form.register("capacityBand")}>
                <option value="">Select a range</option>
                {CAPACITY_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>
                    {band.label}
                  </option>
                ))}
              </Select>
              <FieldHint>
                By value, so it is comparable across cement, paint and timber.
              </FieldHint>
            </Field>

            <Field error={errors.distributionRegions?.message}>
              <Label required>Regions you currently supply</Label>
              <div className="pt-1">
                <ChipGroup
                  label="Distribution regions"
                  options={REGIONS}
                  value={regions as Region[]}
                  onChange={(next) =>
                    form.setValue("distributionRegions", next, { shouldValidate: true })
                  }
                  columns={2}
                />
              </div>
            </Field>
          </CardBody>
        </Card>
      </div>
    </StepShell>
  );
}
