"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, Switch } from "@/components/ui/primitives";
import { Currency } from "./format";
import { cn } from "@/lib/utils";
import {
  PACKAGE_FEATURES,
  SUBSCRIPTION_PACKAGES,
  annualSavingMonths,
  packagePrice,
  type BillingCycle,
  type PackageKey,
} from "@/lib/schemas/subscription";

/*
  Package selection, shared by the onboarding step and the portal's
  subscription page. One component means the comparison a manufacturer sees
  while signing up is the same one they see when they upgrade.
*/

const PACKAGE_KEYS = ["free", "basic", "premium", "vip"] as const;

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto size-4 text-success" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto size-4 text-subtle-foreground" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-xs text-foreground">{value}</span>;
}

export function BillingCycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={cn(
          "text-sm",
          cycle === "monthly" ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        Monthly
      </span>
      <Switch
        checked={cycle === "annual"}
        onCheckedChange={(checked) => onChange(checked ? "annual" : "monthly")}
        aria-label="Bill annually"
      />
      <span
        className={cn(
          "text-sm",
          cycle === "annual" ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        Annual
        <span className="ml-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          2 months free
        </span>
      </span>
    </div>
  );
}

export function PackageCards({
  selected,
  cycle,
  onSelect,
  currentPackage,
}: {
  selected: PackageKey;
  cycle: BillingCycle;
  onSelect: (pkg: PackageKey) => void;
  /** Marks the package the manufacturer is already on. */
  currentPackage?: PackageKey;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Subscription package"
      // Four across only on very wide screens: inside the portal these sit
      // between a 16rem nav and a 20rem summary rail, where four columns
      // squeeze the annual prices past the card edge.
      className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
    >
      {SUBSCRIPTION_PACKAGES.map((pkg) => {
        const price = packagePrice(pkg.key, cycle);
        const active = selected === pkg.key;
        const isCurrent = currentPackage === pkg.key;
        const savedMonths = annualSavingMonths(pkg.key);

        return (
          <button
            key={pkg.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(pkg.key)}
            className={cn(
              "relative flex flex-col rounded-lg border p-5 text-left transition-colors",
              active
                ? "border-brand bg-brand-soft"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            {pkg.recommended && !isCurrent ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-foreground">
                Recommended
              </span>
            ) : null}
            {isCurrent ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Current plan
              </span>
            ) : null}

            <span className="text-sm font-semibold text-foreground">{pkg.name}</span>

            <span className="mt-3 flex flex-wrap items-baseline gap-x-1">
              {price === 0 ? (
                <span className="text-lg font-semibold text-foreground">Free</span>
              ) : (
                <>
                  <Currency value={price} className="text-lg font-semibold text-foreground" />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    per {cycle === "annual" ? "year" : "month"}
                  </span>
                </>
              )}
            </span>
            {cycle === "annual" && savedMonths > 0 ? (
              <span className="mt-1 text-xs text-success">
                Saves {savedMonths} months versus monthly
              </span>
            ) : null}

            <span className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              {pkg.tagline}
            </span>

            <span
              className={cn(
                "mt-4 flex h-9 items-center justify-center rounded-md border text-sm font-medium",
                active
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border-strong text-foreground",
              )}
            >
              {active ? "Selected" : "Select"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PackageComparison({ highlight }: { highlight?: PackageKey }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare packages</CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <div className="scroll-x">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Feature
                </th>
                {SUBSCRIPTION_PACKAGES.map((pkg) => (
                  <th
                    key={pkg.key}
                    scope="col"
                    className={cn(
                      "px-3 py-3 text-center font-semibold",
                      highlight === pkg.key ? "text-brand" : "text-foreground",
                    )}
                  >
                    {pkg.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PACKAGE_FEATURES.map((feature) => (
                <tr key={feature.label}>
                  <th
                    scope="row"
                    className="px-5 py-2.5 text-left font-normal text-muted-foreground"
                  >
                    {feature.label}
                  </th>
                  {PACKAGE_KEYS.map((key) => (
                    <td
                      key={key}
                      className={cn(
                        "px-3 py-2.5 text-center",
                        highlight === key && "bg-brand-soft/50",
                      )}
                    >
                      <FeatureValue value={feature[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
