"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, MapPin, Package, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionGuide } from "@/components/shared/section-guide";
import { StatCard } from "@/components/shared/stat-card";
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
import { Button } from "@/components/ui/button";
import { Currency } from "@/components/shared/format";
import { cn, formatDate } from "@/lib/utils";
import { activationChecklist } from "@/lib/rules/onboarding";
import { STATUS_LABELS, STATUS_TONE, canTransact } from "@/lib/schemas/verification";
import { packageMeta } from "@/lib/schemas/subscription";
import { priceRange } from "@/lib/schemas/product";
import { useCurrentManufacturer } from "../use-current-manufacturer";

export default function ConnectDashboardPage() {
  const { data, loading } = useCurrentManufacturer();

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72" />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Package className="size-5" />}
              title="No manufacturer account yet"
              description="Complete onboarding to set up your Buildex Connect account."
              action={
                <Button asChild>
                  <Link href="/connect/onboarding/account">Start onboarding</Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const { manufacturer, products, isDemoFallback } = data;
  const checklist = activationChecklist(manufacturer, products);
  const done = checklist.filter((item) => item.done).length;
  const active = products.filter((p) => p.status === "active");
  const drafts = products.filter((p) => p.status === "draft");
  const catalogueFloor = active.length
    ? Math.min(...active.map((p) => priceRange(p.priceBands).min))
    : 0;

  return (
    <>
      <PageHeader
        title={`Welcome, ${manufacturer.tradingName}`}
        description="Your Buildex Connect account at a glance."
        actions={
          <Button asChild>
            <Link href="/connect/catalogue">
              Add a product
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <SectionGuide sectionKey="portal" />

      {isDemoFallback ? (
        <Alert
          tone="info"
          className="mb-6"
          title="Viewing a seeded demo account"
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/onboarding/account">Onboard your own</Link>
            </Button>
          }
        >
          You have not completed onboarding in this browser, so this shows{" "}
          {manufacturer.legalName} from the seed data.
        </Alert>
      ) : null}

      {!canTransact(manufacturer.status) ? (
        <Alert
          tone={STATUS_TONE[manufacturer.status]}
          className="mb-6"
          title={
            <span className="inline-flex items-center gap-2">
              Verification
              <StatusPill tone={STATUS_TONE[manufacturer.status]}>
                {STATUS_LABELS[manufacturer.status]}
              </StatusPill>
            </span>
          }
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/verification">View checks</Link>
            </Button>
          }
        >
          {manufacturer.status === "conditionally_approved"
            ? "You can list products now. Orders stay disabled until your site visit clears."
            : "Your listings stay as drafts and go live automatically once verification completes."}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active listings"
          tone="success"
          value={active.length}
          hint={drafts.length ? `${drafts.length} in draft` : "All listings live"}
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Lowest catalogue price"
          tone="info"
          value={catalogueFloor ? <Currency value={catalogueFloor} /> : "—"}
          hint="Best band across your range"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Regions covered"
          tone="info"
          value={manufacturer.distributionRegions.length}
          hint={manufacturer.distributionRegions.slice(0, 2).join(", ")}
          icon={<MapPin className="size-4" />}
        />
        <StatCard
          label="Package"
          tone="info"
          value={
            manufacturer.subscription
              ? packageMeta(manufacturer.subscription.package).name
              : "None"
          }
          hint={
            manufacturer.subscription?.renewsAt
              ? `Renews ${formatDate(manufacturer.subscription.renewsAt)}`
              : "Choose a package to unlock visibility"
          }
          icon={<Sparkles className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Your catalogue</CardTitle>
            <Link
              href="/connect/catalogue"
              className="text-xs font-medium text-brand hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {products.length === 0 ? (
              <EmptyState
                icon={<Package className="size-5" />}
                title="No products listed yet"
                description="Hardware shops browse by category and region. Your first listing is what makes you findable."
                action={
                  <Button asChild>
                    <Link href="/connect/onboarding/first-listing">List a product</Link>
                  </Button>
                }
              />
            ) : (
              <div className="scroll-x">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-5 py-2.5 text-left font-medium text-muted-foreground">
                        Product
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Category
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        From
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.slice(0, 8).map((product) => (
                      <tr key={product.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{product.category}</td>
                        <td className="px-3 py-3 text-right">
                          <Currency value={priceRange(product.priceBands).min} />
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            /{product.unit}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <StatusPill
                            tone={
                              product.status === "active"
                                ? "success"
                                : product.status === "out_of_stock"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {product.status === "out_of_stock"
                              ? "Out of stock"
                              : product.status === "active"
                                ? "Live"
                                : "Draft"}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Get set up</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground text-numeric">
              {done} of {checklist.length} complete
            </p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={checklist.length}
              aria-label="Account setup progress"
            >
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardBody className="space-y-1">
            {checklist.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-md px-1 py-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    item.done
                      ? "border-success bg-success text-white"
                      : "border-border-strong bg-surface",
                  )}
                >
                  {item.done ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      item.done
                        ? "text-muted-foreground line-through"
                        : "font-medium text-foreground",
                    )}
                  >
                    {item.label}
                  </p>
                  {!item.done ? (
                    <>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                      <Link
                        href={item.href}
                        className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
                      >
                        {item.cta}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
