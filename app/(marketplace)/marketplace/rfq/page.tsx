"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Send,
  Store,
  Truck,
} from "lucide-react";
import { enquiryRepo, marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  COUNTIES,
  PRODUCT_CATEGORIES,
  regionForCounty,
  type Region,
} from "@/lib/schemas/common";
import { email, kenyanPhone, countySchema } from "@/lib/schemas/common";
import { priceAtQuantity, priceRange } from "@/lib/schemas/product";
import { Currency, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ui/primitives";

/*
  Request for Quotation.

  The buyer states a requirement once — category, quantity, delivery county —
  and it goes to every supplier who can actually serve it. "Actually" is the
  operative word: matching is by category *and* by whether the supplier delivers
  to the buyer's region, so nobody receives an RFQ they cannot fulfil and the
  buyer's inbox is not padded with suppliers who will decline.

  It creates one real enquiry per matched supplier, so the requests land in the
  same portal inbox as any other enquiry.
*/

const rfqSchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES),
  quantity: z.number().int().positive("Enter the quantity you need"),
  unitHint: z.string().trim().max(40),
  county: countySchema,
  neededInDays: z
    .number()
    .int()
    .min(1, "At least one day")
    .max(180, "Beyond 180 days, contact suppliers directly"),
  shopName: z.string().trim().min(2, "Enter your hardware shop's name"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  phone: kenyanPhone,
  email,
  details: z.string().trim().max(600),
});

type RfqForm = z.infer<typeof rfqSchema>;

export default function RfqPage() {
  const [sent, setSent] = React.useState<{ count: number; names: string[] } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<RfqForm>({
    resolver: zodResolver(rfqSchema),
    mode: "onBlur",
    defaultValues: {
      category: undefined as unknown as RfqForm["category"],
      quantity: 100,
      unitHint: "",
      county: "",
      neededInDays: 14,
      shopName: "",
      contactName: "",
      phone: "+254",
      email: "",
      details: "",
    },
  });

  const category = form.watch("category");
  const county = form.watch("county");
  const quantity = form.watch("quantity") || 0;
  const region = county ? regionForCounty(county) : undefined;

  // Live match preview: who would receive this, and roughly what it would cost.
  const { data: matches } = useQuery(
    async () =>
      category
        ? marketplaceRepo.search({
            categories: [category],
            regions: region ? [region] : undefined,
            sort: "price-asc",
          })
        : null,
    [category, region],
  );

  const matched = matches?.listings ?? [];
  const suppliers = new Map<string, { name: string; verified: boolean; best: number }>();
  for (const { product, manufacturer } of matched) {
    const unit =
      priceAtQuantity(product.priceBands, quantity) ?? priceRange(product.priceBands).min;
    const existing = suppliers.get(manufacturer.id);
    if (!existing || unit < existing.best) {
      suppliers.set(manufacturer.id, {
        name: manufacturer.tradingName,
        verified: manufacturer.status === "approved",
        best: unit,
      });
    }
  }
  const supplierList = [...suppliers.entries()].sort((a, b) => a[1].best - b[1].best);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      // One enquiry per matched supplier, cheapest listing from each — so the
      // request lands in the normal portal inbox rather than a parallel system.
      const bestPerSupplier = new Map<string, (typeof matched)[number]>();
      for (const listing of matched) {
        const current = bestPerSupplier.get(listing.manufacturer.id);
        const price = priceRange(listing.product.priceBands).min;
        if (!current || price < priceRange(current.product.priceBands).min) {
          bestPerSupplier.set(listing.manufacturer.id, listing);
        }
      }

      const names: string[] = [];
      for (const listing of bestPerSupplier.values()) {
        await enquiryRepo.create({
          manufacturerId: listing.manufacturer.id,
          productId: listing.product.id,
          productName: listing.product.name,
          shopName: values.shopName,
          contactName: values.contactName,
          phone: values.phone,
          email: values.email,
          county: values.county,
          region: (regionForCounty(values.county) ?? "Nairobi Metro") as Region,
          quantity: values.quantity,
          unit: listing.product.unit,
          message:
            `RFQ: ${values.quantity} ${values.unitHint || listing.product.unit} of ${values.category}. ` +
            `Needed within ${values.neededInDays} days.` +
            (values.details ? ` ${values.details}` : ""),
          neededBy: new Date(
            Date.now() + values.neededInDays * 86_400_000,
          ).toISOString(),
        });
        names.push(listing.manufacturer.tradingName);
      }
      setSent({ count: names.length, names });
    } finally {
      setSubmitting(false);
    }
  });

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <CardBody className="text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
            <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground">
              Your request went to {sent.count}{" "}
              {sent.count === 1 ? "supplier" : "suppliers"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Each of them can deliver this category to your region. They will reply with a
              firm price and lead time.
            </p>

            <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left">
              {sent.names.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm"
                >
                  <Store className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="text-foreground">{name}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/marketplace">Back to marketplace</Link>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSent(null);
                  form.reset();
                }}
              >
                Send another request
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[70rem] px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Marketplace
        </Link>
      </nav>

      <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
        <FileText className="size-5 text-brand" aria-hidden="true" />
        Request for Quotation
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Describe what you need once. We send it to every verified supplier who makes that
        category <em>and</em> delivers to your region — so you only hear from people who can
        actually fulfil it.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>What you need</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field error={form.formState.errors.category?.message}>
                <Label required>Category</Label>
                <Select {...form.register("category")}>
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={form.formState.errors.quantity?.message}>
                  <Label required>Quantity</Label>
                  <Input
                    {...form.register("quantity", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    className="text-right text-numeric"
                  />
                </Field>
                <Field error={form.formState.errors.unitHint?.message}>
                  <Label>Unit</Label>
                  <Input {...form.register("unitHint")} placeholder="bags, sheets, m²…" />
                  <FieldHint>Optional. Helps suppliers quote precisely.</FieldHint>
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={form.formState.errors.county?.message}>
                  <Label required>Delivery county</Label>
                  <Select {...form.register("county")}>
                    <option value="">Select a county</option>
                    {COUNTIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  {region ? <FieldHint>Region: {region}</FieldHint> : null}
                </Field>
                <Field error={form.formState.errors.neededInDays?.message}>
                  <Label required>Needed within (days)</Label>
                  <Input
                    {...form.register("neededInDays", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    max={180}
                    className="text-right text-numeric"
                  />
                </Field>
              </div>

              <Field error={form.formState.errors.details?.message}>
                <Label>Specification and notes</Label>
                <Textarea
                  {...form.register("details")}
                  rows={4}
                  placeholder="Grade, dimensions, colour, site access, phased delivery — anything that affects the quote."
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where to reach you</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={form.formState.errors.shopName?.message}>
                  <Label required>Hardware shop</Label>
                  <Input {...form.register("shopName")} placeholder="Mwangi Hardware & Timber" />
                </Field>
                <Field error={form.formState.errors.contactName?.message}>
                  <Label required>Your name</Label>
                  <Input {...form.register("contactName")} placeholder="James Mwangi" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={form.formState.errors.phone?.message}>
                  <Label required>Phone</Label>
                  <Input {...form.register("phone")} type="tel" placeholder="+254712345678" />
                </Field>
                <Field error={form.formState.errors.email?.message}>
                  <Label required>Email</Label>
                  <Input {...form.register("email")} type="email" placeholder="you@shop.co.ke" />
                </Field>
              </div>
            </CardBody>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Who will receive this</CardTitle>
            </CardHeader>
            <CardBody>
              {!category ? (
                <p className="text-sm text-muted-foreground">
                  Pick a category to see which suppliers match.
                </p>
              ) : supplierList.length === 0 ? (
                <Alert tone="warning">
                  No verified supplier currently lists {category}
                  {region ? ` with delivery to ${region}` : ""}. Try a wider region, or
                  browse the marketplace directly.
                </Alert>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground text-numeric">
                      {supplierList.length}
                    </span>{" "}
                    {supplierList.length === 1 ? "supplier" : "suppliers"} make {category}
                    {region ? (
                      <>
                        {" "}
                        and deliver to{" "}
                        <span className="font-medium text-foreground">{region}</span>
                      </>
                    ) : null}
                    .
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {supplierList.slice(0, 8).map(([id, supplier]) => (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Store className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                          <span className="truncate text-sm text-foreground">
                            {supplier.name}
                          </span>
                          {supplier.verified ? (
                            <BadgeCheck
                              className="size-3.5 shrink-0 text-success"
                              aria-label="Verified"
                            />
                          ) : null}
                        </span>
                        <Currency
                          value={supplier.best}
                          className="shrink-0 text-xs font-semibold text-foreground"
                        />
                      </li>
                    ))}
                  </ul>

                  {quantity > 0 && supplierList.length > 0 ? (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Best indicative at <Num value={quantity} />
                        </span>
                        <Currency
                          value={supplierList[0][1].best * quantity}
                          className="font-semibold text-foreground"
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From the cheapest matching band. Suppliers confirm on quote.
                      </p>
                    </>
                  ) : null}
                </>
              )}

              <Button
                type="submit"
                className="mt-5 w-full"
                loading={submitting}
                disabled={supplierList.length === 0}
              >
                <Send aria-hidden="true" />
                Send to {supplierList.length || "…"}{" "}
                {supplierList.length === 1 ? "supplier" : "suppliers"}
              </Button>
            </CardBody>
          </Card>

          <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Truck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              Matching is by category and delivery region, so you will not receive quotes
              from suppliers who cannot reach your site.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
