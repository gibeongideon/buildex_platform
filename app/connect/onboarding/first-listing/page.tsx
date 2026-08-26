"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChipGroup,
} from "@/components/ui/primitives";
import { Field, FieldHint, Input, Label, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ProductPreviewCard } from "@/components/shared/product-preview-card";
import { manufacturerRepo, productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { PRODUCT_CATEGORIES, REGIONS, type Region } from "@/lib/schemas/common";
import {
  PRODUCT_UNITS,
  listingDraftSchema,
  type ListingFields,
} from "@/lib/schemas/product";
import { canListProducts, canTransact } from "@/lib/schemas/verification";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";

const DEFAULT_BANDS = [
  { minQty: 50, maxQty: 199, unitPrice: 0 },
  { minQty: 200, maxQty: null, unitPrice: 0 },
];

export default function FirstListingStepPage() {
  const { ready, draft } = useStepGuard("first-listing");
  const { save } = useOnboarding();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const manufacturerId = draft?.manufacturerId ?? null;
  const { data: manufacturer } = useQuery(
    async () => (manufacturerId ? manufacturerRepo.getById(manufacturerId) : null),
    [manufacturerId],
  );

  const form = useForm<ListingFields>({
    resolver: zodResolver(listingDraftSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      category: undefined,
      sku: "",
      description: "",
      unit: undefined,
      packSize: "",
      priceBands: DEFAULT_BANDS,
      moq: 50,
      leadTimeDays: 3,
      availableRegions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "priceBands",
  });

  React.useEffect(() => {
    // Default the listing's regions to wherever the company said it distributes.
    if (draft?.company?.distributionRegions?.length && !form.getValues("availableRegions").length) {
      form.setValue("availableRegions", draft.company.distributionRegions);
    }
  }, [draft?.company, form]);

  if (!ready) return <StepSkeleton />;

  const values = form.watch();
  const publishable = manufacturer ? canListProducts(manufacturer.status) : false;

  const onSubmit = form.handleSubmit(async (listing) => {
    if (!manufacturerId) return;
    setSubmitting(true);
    try {
      await productRepo.create({
        ...listing,
        manufacturerId,
        imageUrls: [],
        // Until verification clears, listings sit as drafts rather than going
        // live — the manufacturer keeps their work, the marketplace stays clean.
        status: publishable ? "active" : "draft",
      });
      await save({ firstListing: { ...listing, availableRegions: listing.availableRegions } });
      router.push("/connect/dashboard");
    } finally {
      setSubmitting(false);
    }
  });

  const { errors } = form.formState;

  return (
    <StepShell
      title="List your first product"
      description="Wholesale construction supply trades in quantity bands, so price it the way you actually sell it. The preview shows exactly what a hardware shop will see."
      back="subscription"
      onSubmit={onSubmit}
      submitting={submitting}
      primaryLabel={publishable ? "Publish and finish" : "Save draft and finish"}
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          {manufacturer && !canTransact(manufacturer.status) ? (
            <Alert tone="info" title="Your listing will be saved as a draft">
              Verification is still in progress. This product goes live automatically the
              moment your checks clear — you do not need to come back and publish it.
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field error={errors.name?.message}>
                <Label required>Product name</Label>
                <Input
                  {...form.register("name")}
                  placeholder="Savannah OPC 32.5N Cement"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.category?.message}>
                  <Label required>Category</Label>
                  <Select {...form.register("category")}>
                    <option value="">Select a category</option>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field error={errors.sku?.message}>
                  <Label required>Your SKU</Label>
                  <Input
                    {...form.register("sku")}
                    placeholder="SAV-OPC325"
                    className="uppercase"
                  />
                  <FieldHint>Used on orders and delivery notes.</FieldHint>
                </Field>
              </div>

              <Field error={errors.description?.message}>
                <Label>Description</Label>
                <Textarea
                  {...form.register("description")}
                  rows={3}
                  placeholder="What it is used for, and anything that distinguishes it from the competition."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.unit?.message}>
                  <Label required>Sold by</Label>
                  <Select {...form.register("unit")}>
                    <option value="">Select a unit</option>
                    {PRODUCT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field error={errors.packSize?.message}>
                  <Label>Pack size</Label>
                  <Input {...form.register("packSize")} placeholder="50 kg" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wholesale price bands</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bands must run continuously with no gaps, and the price per unit must fall as
                quantity rises. Leave the last band&apos;s maximum empty to mean &ldquo;and
                above&rdquo;.
              </p>

              {fields.map((field, index) => {
                const bandErrors = errors.priceBands?.[index];
                const isLast = index === fields.length - 1;

                return (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-md border border-border bg-surface-muted p-3 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-start"
                  >
                    <Field error={bandErrors?.minQty?.message}>
                      <Label className="text-xs">From qty</Label>
                      <Input
                        {...form.register(`priceBands.${index}.minQty`, { valueAsNumber: true })}
                        type="number"
                        min={1}
                        className="text-right text-numeric"
                      />
                    </Field>

                    <Field error={bandErrors?.maxQty?.message}>
                      <Label className="text-xs">To qty</Label>
                      <Input
                        {...form.register(`priceBands.${index}.maxQty`, {
                          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                        })}
                        type="number"
                        min={1}
                        placeholder={isLast ? "and above" : ""}
                        className="text-right text-numeric"
                      />
                    </Field>

                    <Field error={bandErrors?.unitPrice?.message}>
                      <Label className="text-xs">Price per unit</Label>
                      <MoneyInput
                        {...form.register(`priceBands.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        min={0}
                        step="0.01"
                      />
                    </Field>

                    <div className="flex sm:pt-6">
                      {fields.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 aria-hidden="true" />
                          <span className="sr-only">Remove band {index + 1}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {fields.length < 5 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const last = form.getValues(`priceBands.${fields.length - 1}`);
                    const start = (last?.maxQty ?? last?.minQty ?? 0) + 1;
                    // The band being appended becomes the open-ended one, so
                    // the previous band needs a real ceiling.
                    if (last?.maxQty === null) {
                      form.setValue(
                        `priceBands.${fields.length - 1}.maxQty`,
                        last.minQty + 99,
                      );
                      append({
                        minQty: last.minQty + 100,
                        maxQty: null,
                        unitPrice: last.unitPrice,
                      });
                    } else {
                      append({ minQty: start, maxQty: null, unitPrice: last?.unitPrice ?? 0 });
                    }
                  }}
                >
                  <Plus aria-hidden="true" />
                  Add band
                </Button>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ordering &amp; availability</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.moq?.message}>
                  <Label required>Minimum order quantity</Label>
                  <Input
                    {...form.register("moq", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    className="text-right text-numeric"
                  />
                </Field>

                <Field error={errors.leadTimeDays?.message}>
                  <Label required>Lead time (days)</Label>
                  <Input
                    {...form.register("leadTimeDays", { valueAsNumber: true })}
                    type="number"
                    min={0}
                    max={120}
                    className="text-right text-numeric"
                  />
                  <FieldHint>From confirmed order to dispatch.</FieldHint>
                </Field>
              </div>

              <Field error={errors.availableRegions?.message}>
                <Label required>Regions you can deliver to</Label>
                <div className="pt-1">
                  <ChipGroup
                    label="Available regions"
                    options={REGIONS}
                    value={(values.availableRegions ?? []) as Region[]}
                    onChange={(next) =>
                      form.setValue("availableRegions", next, { shouldValidate: true })
                    }
                    columns={2}
                  />
                </div>
              </Field>
            </CardBody>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Hardware shop preview
          </p>
          <ProductPreviewCard
            product={{
              name: values.name ?? "",
              category: values.category ?? "",
              packSize: values.packSize ?? "",
              unit: values.unit ?? "",
              priceBands: values.priceBands ?? [],
              moq: values.moq ?? 0,
              leadTimeDays: values.leadTimeDays ?? 0,
              availableRegions: values.availableRegions ?? [],
              manufacturerName:
                manufacturer?.tradingName ?? draft?.company?.tradingName ?? "Your company",
              verified: manufacturer?.status === "approved",
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            This is the same component the marketplace renders, so what you see here is what
            hardware shops get.
          </p>
        </aside>
      </div>
    </StepShell>
  );
}
