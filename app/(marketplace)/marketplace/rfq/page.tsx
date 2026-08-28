"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, ClipboardList, Coins, FileText, MessagesSquare, Send, Sparkles, Store, Timer, Truck, Users } from "lucide-react";
import { browsingRepo, enquiryRepo, marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  COUNTIES,
  PRODUCT_CATEGORIES,
  regionForCounty,
  type Region,
} from "@/lib/schemas/common";
import { email, kenyanPhone, countySchema } from "@/lib/schemas/common";
import { priceAtQuantity, priceRange } from "@/lib/schemas/product";
import { parseRequirement, SOURCING_EXAMPLES } from "@/lib/rules/sourcing";
import { Currency, Num } from "@/components/shared/format";
import { ProductThumb } from "@/components/shared/product-thumb";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { BackLink } from "@/components/shared/back-link";
import {
  VerifiedMark,
  verifiedLevel,
  type VerifiedLevel,
} from "@/components/shared/verified-mark";
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

  Two steps, following the shape the large B2B marketplaces use: say what you
  need in one sentence, then confirm the details. The first step is not
  decoration — `parseRequirement` reads the sentence and fills the form in, so
  the common case is one box and one button.
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

/*
  What an RFQ here actually gets you.

  The reference this follows advertises design, logo, bundling and packaging
  customisation, which is what its manufacturers sell. Ours sell construction
  materials by the tonne, so these describe what our own quote flow produces —
  each one is something a supplier's reply genuinely carries.
*/
const PROMISES = [
  {
    icon: Coins,
    title: "Banded pricing",
    body: "Quoted at your quantity, not at list price",
  },
  {
    icon: Truck,
    title: "Delivery to your county",
    body: "Only suppliers who reach your region see it",
  },
  {
    icon: Timer,
    title: "Committed lead time",
    body: "Every quote states when it can be on site",
  },
  {
    icon: Users,
    title: "One request, many suppliers",
    body: "Compare replies side by side, not one at a time",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Describe your requirement",
    body: "Category, quantity and where it has to be delivered. Specification notes if the grade matters.",
  },
  {
    title: "It reaches suppliers who can fulfil it",
    body: "Matched on category and delivery region, so you do not collect declines.",
  },
  {
    title: "Compare the replies",
    body: "Each supplier answers with a firm unit price and a lead time, in your Buildex Connect inbox.",
  },
];

/** The one-sentence brief that opens the flow. */
function StartCard({
  brief,
  onBrief,
  onContinue,
  matchedOn,
}: {
  brief: string;
  onBrief: (value: string) => void;
  onContinue: () => void;
  matchedOn: string[];
}) {
  return (
    <Card className="shadow-sm">
      <CardBody className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Tell us what you need
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One sentence is enough. For example, &ldquo;{SOURCING_EXAMPLES[0]}&rdquo;.
          </p>
        </div>

        <Field>
          <Label className="sr-only">What do you need quoted?</Label>
          <Textarea
            value={brief}
            onChange={(event) => onBrief(event.target.value)}
            rows={4}
            placeholder="400 bags of cement delivered to Machakos, needed within two weeks"
          />
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/*
            Not "generate with AI". This is the same deterministic matcher that
            powers Ask AI — it reads the catalogue's own vocabulary, so it can
            show exactly what it recognised instead of asking to be trusted.
          */}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            {matchedOn.length > 0 ? (
              <span>
                Recognised{" "}
                <span className="font-medium text-foreground">
                  {matchedOn.join(", ")}
                </span>{" "}
                — the form will be filled in for you to check.
              </span>
            ) : (
              <span>
                We read your sentence for category, county and quantity, and fill the
                form in. You confirm everything before it goes anywhere.
              </span>
            )}
          </p>

          <Button onClick={onContinue} className="shrink-0">
            Write RFQ details
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default function RfqPage() {
  const [step, setStep] = React.useState<"start" | "details">("start");
  const [brief, setBrief] = React.useState("");
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

  // Read during render rather than on every keystroke in an effect: the parse
  // is pure and cheap, and its result is only ever a function of the brief.
  const parsed = brief.trim() ? parseRequirement(brief) : null;

  // Live match preview: who would receive this, and roughly what it would cost.
  const { data: matches, error, refetch } = useQuery(
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

  /*
    What this browser has already opened. The reference offers quotes on
    products you have browsed, and we can honour that literally — the same
    history that powers the marketplace home rail.
  */
  const { data: browsed } = useQuery(() => browsingRepo.recent(8), []);
  const recent = browsed ?? [];

  const matched = matches?.listings ?? [];
  const suppliers = new Map<
    string,
    { name: string; level: VerifiedLevel | null; best: number }
  >();
  for (const { product, manufacturer } of matched) {
    const unit =
      priceAtQuantity(product.priceBands, quantity) ?? priceRange(product.priceBands).min;
    const existing = suppliers.get(manufacturer.id);
    if (!existing || unit < existing.best) {
      suppliers.set(manufacturer.id, {
        name: manufacturer.tradingName,
        level: verifiedLevel(manufacturer.status),
        best: unit,
      });
    }
  }
  const supplierList = [...suppliers.entries()].sort((a, b) => a[1].best - b[1].best);

  /** Carry whatever the sentence gave us into the form, then show it. */
  function openDetails() {
    if (parsed) {
      if (parsed.categories[0]) form.setValue("category", parsed.categories[0]);
      if (parsed.county) form.setValue("county", parsed.county);
      if (parsed.quantity) form.setValue("quantity", parsed.quantity);
      if (parsed.urgent) form.setValue("neededInDays", 3);
      if (!form.getValues("details")) form.setValue("details", brief.trim());
    }
    setStep("details");
  }

  /** A browsed product is a requirement already half-stated. */
  function quoteFor(product: { category: RfqForm["category"]; name: string }) {
    form.setValue("category", product.category);
    if (!form.getValues("details")) {
      form.setValue("details", `Similar to ${product.name}.`);
    }
    setStep("details");
  }

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
                  setBrief("");
                  setStep("start");
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

  if (step === "start") {
    return (
      <>
        {/* The band, carrying the brand rather than the reference's purple. */}
        <section className="on-brand">
          <div className="mx-auto max-w-[80rem] px-4 py-8 sm:px-6 lg:px-8">
            <BackLink href="/marketplace" tone="onDark">
              Marketplace
            </BackLink>

            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand">
                  <FileText className="size-3.5" aria-hidden="true" />
                  RFQ
                </span>

                <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Get quotes for one requirement
                </h1>
                <p className="mt-2 max-w-xl text-sm text-white/80">
                  Describe what you need once. It reaches every verified supplier who makes
                  that category <em>and</em> delivers to your region — so every reply is one
                  you can actually act on.
                </p>
              </div>

              {/*
                Two up even on a phone. Stacked, these four push the box that
                actually starts a request off the bottom of the screen, and the
                lines are short enough to sit side by side.
              */}
              <ul className="grid grid-cols-2 gap-2 sm:gap-3">
                {PROMISES.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="rounded-lg border border-white/20 bg-white/10 p-3"
                  >
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/70">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[80rem] px-4 pb-10 sm:px-6 lg:px-8">
          {/* Lifted over the band's edge, as the reference does. */}
          <div className="-mt-6">
            <StartCard
              brief={brief}
              onBrief={setBrief}
              onContinue={openDetails}
              matchedOn={parsed?.matchedOn ?? []}
            />
          </div>

          {recent.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Get quotes for products you have browsed
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Starts a request in that category — you set the quantity and delivery.
              </p>

              <ul className="scroll-x mt-4 flex gap-3">
                {recent.map((product) => (
                  <li key={product.id} className="w-40 shrink-0 sm:w-44">
                    <button
                      type="button"
                      onClick={() => quoteFor(product)}
                      className="group w-full rounded-lg border border-border bg-surface p-2 text-left transition-colors hover:border-brand"
                    >
                      <ProductThumb
                        productId={product.id}
                        category={product.category}
                        className="aspect-square w-full rounded-md"
                        sizes="176px"
                      />
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">
                        {product.name}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-brand group-hover:underline">
                        Get quotes
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((stepInfo, index) => (
              <div
                key={stepInfo.title}
                className="rounded-lg border border-border bg-surface-muted p-4"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground text-numeric">
                  {index + 1}
                </span>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {stepInfo.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {stepInfo.body}
                </p>
              </div>
            ))}
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[76rem] px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setStep("start")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowRight className="size-3.5 rotate-180" aria-hidden="true" />
        Start over
      </button>

      <QueryError error={error} onRetry={refetch} />

      <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
        <ClipboardList className="size-5 text-brand" aria-hidden="true" />
        Post your request
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Check what we read from your description, then send it. Nothing has gone to a
        supplier yet.
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

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
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
                    {supplierList.length === 1 ? "supplier makes" : "suppliers make"}{" "}
                    {category}
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
                          {supplier.level ? (
                            <VerifiedMark
                              level={supplier.level}
                              subject="supplier"
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
                Post to {supplierList.length || "…"}{" "}
                {supplierList.length === 1 ? "supplier" : "suppliers"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="size-4 text-brand" aria-hidden="true" />
                How RFQ works
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-3">
                {HOW_IT_WORKS.map((stepInfo, index) => (
                  <li key={stepInfo.title} className="flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand text-numeric">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {stepInfo.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {stepInfo.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <div className="rounded-lg border border-border bg-surface-muted p-4">
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
