"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  StatusPill,
} from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn, makeId } from "@/lib/utils";
import {
  DIRECTOR_ROLES,
  directorsStepSchema,
  type DirectorsStep,
} from "@/lib/schemas/manufacturer";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";
import { stepHref } from "../steps";

/*
  Directors and shareholding.

  Requirements §5.2 — director national IDs are checked against IPRS. The
  lookup here is a stub: any ID beginning with 9 returns a mismatch so the
  failure path is demonstrable, everything else matches.
*/
const MISMATCH_PREFIX = "9";

function emptyDirector() {
  return {
    id: makeId("dir"),
    fullName: "",
    nationalId: "",
    role: "Director" as const,
    ownershipPercent: 0,
    phone: "+254",
    iprsStatus: "unchecked" as const,
  };
}

export default function DirectorsStepPage() {
  const { ready, draft } = useStepGuard("directors");
  const { completeStep, saving } = useOnboarding();

  const form = useForm<DirectorsStep>({
    resolver: zodResolver(directorsStepSchema),
    mode: "onBlur",
    defaultValues: { directors: [emptyDirector()] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "directors",
  });

  React.useEffect(() => {
    if (draft?.directors?.length) {
      form.reset({ directors: draft.directors });
    } else if (draft?.account && fields.length === 1 && !fields[0].fullName) {
      // The person creating the account is almost always a director, so seed
      // the first row from what they already gave us.
      form.setValue("directors.0.fullName", draft.account.contactName);
      form.setValue("directors.0.phone", draft.account.phone);
      form.setValue("directors.0.role", "Managing Director");
      form.setValue("directors.0.ownershipPercent", 100);
    }
    // Only re-seed when the draft itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.directors, draft?.account]);

  if (!ready) return <StepSkeleton />;

  async function runIprsCheck(index: number) {
    const nationalId = form.getValues(`directors.${index}.nationalId`);
    if (!/^\d{7,8}$/.test(nationalId)) return;

    // setValue rather than useFieldArray.update: update() remounts the row,
    // which steals focus mid-typing and regenerates the React key.
    form.setValue(`directors.${index}.iprsStatus`, "checking");
    await new Promise((resolve) => setTimeout(resolve, 900));
    form.setValue(
      `directors.${index}.iprsStatus`,
      nationalId.startsWith(MISMATCH_PREFIX) ? "mismatch" : "matched",
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    await completeStep("directors", { directors: values.directors }, "documents");
  });

  const directors = form.watch("directors") ?? [];
  const total = directors.reduce((sum, d) => sum + (Number(d.ownershipPercent) || 0), 0);
  const balanced = Math.round(total) === 100;
  const { errors } = form.formState;
  const arrayError =
    errors.directors?.root?.message ??
    (errors.directors as { message?: string } | undefined)?.message;

  return (
    <StepShell
      title="Directors & ownership"
      description="List everyone who appears on your CR12. Shareholding must add up to 100% — a company search that doesn't reconcile is the single most common sign of a fabricated structure, so Buildex checks it before anything else."
      backHref={stepHref("company")}
      onSubmit={onSubmit}
      submitting={saving || form.formState.isSubmitting}
    >
      <div className="space-y-4">
        {fields.map((field, index) => {
          const status = directors[index]?.iprsStatus ?? "unchecked";
          const fieldErrors = errors.directors?.[index];

          return (
            <Card key={field.id}>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>Director {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  {status === "matched" ? (
                    <StatusPill tone="success" icon={<CheckCircle2 className="size-3" />}>
                      IPRS matched
                    </StatusPill>
                  ) : null}
                  {status === "mismatch" ? (
                    <StatusPill tone="danger" icon={<XCircle className="size-3" />}>
                      IPRS mismatch
                    </StatusPill>
                  ) : null}
                  {status === "checking" ? (
                    <StatusPill tone="info" icon={<Loader2 className="size-3 animate-spin" />}>
                      Checking IPRS
                    </StatusPill>
                  ) : null}
                  {fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">Remove director {index + 1}</span>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>

              <CardBody className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field error={fieldErrors?.fullName?.message}>
                    <Label required>Full name</Label>
                    <Input
                      {...form.register(`directors.${index}.fullName`)}
                      placeholder="As it appears on the National ID"
                    />
                  </Field>

                  <Field error={fieldErrors?.nationalId?.message}>
                    <Label required>National ID number</Label>
                    <Input
                      {...form.register(`directors.${index}.nationalId`, {
                        onBlur: () => runIprsCheck(index),
                      })}
                      inputMode="numeric"
                      placeholder="22458901"
                      className="text-numeric"
                    />
                    <FieldHint>Checked against IPRS records.</FieldHint>
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field error={fieldErrors?.role?.message}>
                    <Label required>Role</Label>
                    <Select {...form.register(`directors.${index}.role`)}>
                      {DIRECTOR_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field error={fieldErrors?.ownershipPercent?.message}>
                    <Label required>Ownership %</Label>
                    <Input
                      {...form.register(`directors.${index}.ownershipPercent`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      className="text-right text-numeric"
                    />
                  </Field>

                  <Field error={fieldErrors?.phone?.message}>
                    <Label required>Mobile number</Label>
                    <Input
                      {...form.register(`directors.${index}.phone`)}
                      type="tel"
                      placeholder="+254712345678"
                    />
                  </Field>
                </div>

                {status === "mismatch" ? (
                  <Alert tone="danger" title="IPRS could not match this ID">
                    The name and National ID do not correspond in the population register.
                    Check for typos — if they are correct, Buildex Operations will follow up
                    after you submit.
                  </Alert>
                ) : null}
              </CardBody>
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append(emptyDirector())}
          >
            <Plus aria-hidden="true" />
            Add another director
          </Button>
          <p className="text-sm">
            <span className="text-muted-foreground">Ownership allocated: </span>
            <span
              className={cn(
                "font-semibold text-numeric",
                balanced ? "text-success" : "text-danger",
              )}
            >
              {total.toFixed(0)}%
            </span>
            {!balanced ? (
              <span className="ml-2 text-xs text-muted-foreground text-numeric">
                ({total > 100 ? "over" : "short"} by {Math.abs(100 - total).toFixed(0)}%)
              </span>
            ) : null}
          </p>
        </div>

        {arrayError ? (
          <p role="alert" className="text-sm text-danger">
            {arrayError}
          </p>
        ) : null}
      </div>
    </StepShell>
  );
}
