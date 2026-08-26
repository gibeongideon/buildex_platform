"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  MessageSquare,
  Package,
  ShieldCheck,
  Store,
} from "lucide-react";
import { browsingRepo, enquiryRepo, marketplaceRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import {
  formatBandRange,
  formatLeadTime,
  priceAtQuantity,
  priceRange,
} from "@/lib/schemas/product";
import { canTransact } from "@/lib/schemas/verification";
import { enquiryFormSchema } from "@/lib/schemas/enquiry";
import { COUNTIES, regionForCounty, type Region } from "@/lib/schemas/common";
import { ProductThumb } from "@/components/shared/product-thumb";
import { ProductCard } from "@/components/shared/product-card";
import { Currency, DetailRow, Num } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * The enquiry form collects contact details only — the quantity comes from the
 * calculator above it, so a buyer never has to type the same number twice or
 * reconcile two fields that disagree.
 */
const contactSchema = enquiryFormSchema.omit({ quantity: true });
type ContactFields = import("zod").infer<typeof contactSchema>;

/*
  Product detail.

  The centrepiece is the quantity calculator: a buyer types the quantity they
  actually want and immediately sees which band that falls in, the unit price
  and the line total. Published bands are the whole basis of wholesale pricing,
  so making them interactive rather than a static table is the single most
  useful thing this page can do.

  From here the two-tier navigation goes both ways — up to the supplier's own
  storefront, and sideways to comparable listings from other suppliers.
*/

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const { data: listing, loading } = useQuery(
    () => marketplaceRepo.getListing(productId),
    [productId],
  );
  const { data: related } = useQuery(
    () => marketplaceRepo.relatedFromManufacturer(productId, 4),
    [productId],
  );
  const { data: similar } = useQuery(
    () => marketplaceRepo.similarFromOthers(productId, 3),
    [productId],
  );

  const [quantity, setQuantity] = React.useState<number | null>(null);
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Record the view so the marketplace home's browsing-history and
  // "keep looking for" rails reflect what was actually opened.
  React.useEffect(() => {
    browsingRepo.record(productId);
  }, [productId]);

  const product = listing?.product;
  const manufacturer = listing?.manufacturer;

  const form = useForm<ContactFields>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    defaultValues: {
      shopName: "",
      contactName: "",
      phone: "+254",
      email: "",
      county: "",
      message: "",
    },
  });

  if (loading && !listing) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-48" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!listing || !product || !manufacturer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Package className="size-5" />}
              title="Listing not available"
              description="This product is no longer published, or its supplier is not currently cleared to list on the marketplace."
              action={
                <Button asChild>
                  <Link href="/marketplace">Back to the marketplace</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const range = priceRange(product.priceBands);
  const verified = manufacturer.status === "approved";
  const ordersEnabled = canTransact(manufacturer.status);
  const effectiveQty = quantity ?? product.moq;
  const unitPrice = priceAtQuantity(product.priceBands, effectiveQty);
  const belowMoq = effectiveQty < product.moq;
  const activeBandIndex = product.priceBands.findIndex(
    (b) => effectiveQty >= b.minQty && (b.maxQty === null || effectiveQty <= b.maxQty),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await enquiryRepo.create({
        manufacturerId: manufacturer.id,
        productId: product.id,
        productName: product.name,
        shopName: values.shopName,
        contactName: values.contactName,
        phone: values.phone,
        email: values.email,
        county: values.county,
        region: (regionForCounty(values.county) ?? "Nairobi Metro") as Region,
        quantity: effectiveQty,
        unit: product.unit,
        message: values.message,
        neededBy: null,
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="Breadcrumb" className="mb-5">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All listings
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <ProductThumb
            productId={product.id}
            category={product.category}
            className="h-56 rounded-lg border border-border sm:h-72"
            iconClassName="size-16"
          />

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {product.category}
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground text-numeric">
              SKU {product.sku}
              {product.packSize ? ` · ${product.packSize}` : ""}
            </p>

            {product.description ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Wholesale price bands</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The unit price falls as your order size rises. Enter your quantity to
                see where you land.
              </p>
            </CardHeader>
            <CardBody className="p-0">
              <div className="scroll-x">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-left font-medium text-muted-foreground"
                      >
                        Order quantity
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2.5 text-right font-medium text-muted-foreground"
                      >
                        Price per {product.unit}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.priceBands.map((band, index) => (
                      <tr
                        key={index}
                        className={cn(index === activeBandIndex && "bg-brand-soft")}
                      >
                        <td className="px-5 py-2.5">
                          <span
                            className={cn(
                              index === activeBandIndex
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatBandRange(band, product.unit)}
                          </span>
                          {index === activeBandIndex ? (
                            <StatusPill tone="info" className="ml-2">
                              Your band
                            </StatusPill>
                          ) : null}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <Currency
                            value={band.unitPrice}
                            className={cn(
                              index === activeBandIndex
                                ? "font-semibold text-foreground"
                                : "text-foreground",
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card className="mt-5">
            <CardHeader>
              <CardTitle>Ordering</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="divide-y divide-border">
                <DetailRow
                  label="Minimum order quantity"
                  value={
                    <span className="text-numeric">
                      {product.moq} {product.unit}
                      {product.moq === 1 ? "" : "s"}
                    </span>
                  }
                />
                <DetailRow
                  label="Lead time"
                  value={`${formatLeadTime(product.leadTimeDays)} from confirmed order`}
                />
                <DetailRow
                  label="Delivers to"
                  value={product.availableRegions.join(", ")}
                />
                <DetailRow label="Delivery" value={manufacturer.storefront.deliveryPolicy} />
                <DetailRow
                  label="Payment"
                  value={manufacturer.storefront.paymentTerms.join(" · ")}
                />
              </dl>
            </CardBody>
          </Card>

          {related && related.length > 0 ? (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  More from {manufacturer.tradingName}
                </h2>
                <Link
                  href={`/marketplace/manufacturer/${manufacturer.id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Visit store
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    manufacturer={manufacturer}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {similar && similar.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Compare with other suppliers
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Same category, different manufacturers — cheapest entry price first.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {similar.map(({ product: item, manufacturer: maker }) => (
                  <ProductCard key={item.id} product={item} manufacturer={maker} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardBody>
              <p className="text-xs text-muted-foreground">from</p>
              <p className="flex items-baseline gap-1.5">
                <Currency
                  value={range.min}
                  className="text-2xl font-semibold tracking-tight text-foreground"
                />
                <span className="text-sm text-muted-foreground">/{product.unit}</span>
              </p>
              {range.min !== range.max ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Currency value={range.max} /> at the smallest order size
                </p>
              ) : null}

              <div className="mt-4 border-t border-border pt-4">
                <Field>
                  <Label>Your order quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={effectiveQty}
                    onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                    className="text-right text-numeric"
                  />
                  <FieldHint>
                    Minimum {product.moq} {product.unit}
                    {product.moq === 1 ? "" : "s"}
                  </FieldHint>
                </Field>

                {belowMoq ? (
                  <Alert tone="warning" className="mt-3">
                    Below this supplier&apos;s minimum of {product.moq} {product.unit}
                    {product.moq === 1 ? "" : "s"}. You can still enquire — some
                    suppliers flex on MOQ.
                  </Alert>
                ) : unitPrice ? (
                  <div className="mt-3 rounded-md border border-border bg-surface-muted p-3">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Unit price</span>
                      <Currency
                        value={unitPrice}
                        className="font-semibold text-foreground"
                      />
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-border pt-1.5 text-sm">
                      <span className="text-muted-foreground">
                        <Num value={effectiveQty} /> × {product.unit}
                        {effectiveQty === 1 ? "" : "s"}
                      </span>
                      <Currency
                        value={unitPrice * effectiveQty}
                        className="text-base font-semibold text-foreground"
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Indicative. The supplier confirms on quote.
                    </p>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
            </CardHeader>
            <CardBody>
              <Link
                href={`/marketplace/manufacturer/${manufacturer.id}`}
                className="flex items-start gap-3 rounded-md transition-colors hover:opacity-80"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-brand">
                  <Store className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {manufacturer.tradingName}
                    </span>
                    {verified ? (
                      <BadgeCheck
                        className="size-4 shrink-0 text-success"
                        aria-label="Verified"
                      />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {manufacturer.county} · since {manufacturer.yearEstablished}
                  </span>
                </span>
              </Link>

              <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Response rate</dt>
                  <dd className="font-medium text-foreground text-numeric">
                    {manufacturer.storefront.responseRatePercent}%
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Typical reply</dt>
                  <dd className="font-medium text-foreground">
                    within {manufacturer.storefront.avgResponseHours}h
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Orders fulfilled</dt>
                  <dd className="font-medium text-foreground text-numeric">
                    {manufacturer.storefront.ordersFulfilled}
                  </dd>
                </div>
              </dl>

              {!ordersEnabled ? (
                <Alert tone="warning" className="mt-3">
                  This supplier is completing a site visit. Enquiries reach them, but
                  orders are disabled until verification clears.
                </Alert>
              ) : null}

              <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
                <Link href={`/marketplace/manufacturer/${manufacturer.id}`}>
                  Visit store
                </Link>
              </Button>
            </CardBody>
          </Card>

          <Card id="enquire">
            <CardHeader>
              <CardTitle>Request a quote</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The supplier replies with a firm price and lead time.
              </p>
            </CardHeader>
            <CardBody>
              {sent ? (
                <div className="text-center">
                  <CheckCircle2
                    className="mx-auto size-8 text-success"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Enquiry sent
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {manufacturer.tradingName} typically replies within{" "}
                    {manufacturer.storefront.avgResponseHours} hours. It now appears in
                    their portal inbox.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSent(false);
                      form.reset();
                    }}
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-4">
                  <Field error={form.formState.errors.shopName?.message}>
                    <Label required>Hardware shop</Label>
                    <Input
                      {...form.register("shopName")}
                      placeholder="Mwangi Hardware & Timber"
                    />
                  </Field>

                  <Field error={form.formState.errors.contactName?.message}>
                    <Label required>Your name</Label>
                    <Input {...form.register("contactName")} placeholder="James Mwangi" />
                  </Field>

                  <Field error={form.formState.errors.phone?.message}>
                    <Label required>Phone</Label>
                    <Input
                      {...form.register("phone")}
                      type="tel"
                      placeholder="+254712345678"
                    />
                  </Field>

                  <Field error={form.formState.errors.email?.message}>
                    <Label required>Email</Label>
                    <Input
                      {...form.register("email")}
                      type="email"
                      placeholder="you@shop.co.ke"
                    />
                  </Field>

                  <Field error={form.formState.errors.county?.message}>
                    <Label required>Delivery county</Label>
                    <Select {...form.register("county")}>
                      <option value="">Select a county</option>
                      {COUNTIES.map((county) => (
                        <option key={county.name} value={county.name}>
                          {county.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="text-sm font-medium text-foreground text-numeric">
                      {effectiveQty} {product.unit}
                      {effectiveQty === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Change it in the calculator above.
                    </p>
                  </div>

                  <Field error={form.formState.errors.message?.message}>
                    <Label>Message</Label>
                    <Textarea
                      {...form.register("message")}
                      rows={3}
                      placeholder="Delivery timing, site location, anything the supplier should know."
                    />
                  </Field>

                  <Button type="submit" className="w-full" loading={submitting}>
                    <MessageSquare aria-hidden="true" />
                    Send enquiry
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>

          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              Every supplier on Buildex Connect is checked against BRS, KRA and IPRS
              records before their listings go live.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
