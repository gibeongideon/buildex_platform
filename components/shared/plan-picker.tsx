"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Switch,
} from "@/components/ui/primitives";
import { Currency } from "./format";
import { cn } from "@/lib/utils";

/*
  Plan selection — the cards, the billing toggle and the comparison table.

  This product has two ladders: what a manufacturer pays to sell here
  (`lib/schemas/subscription.ts`) and what a customer pays to buy here
  (`lib/schemas/membership.ts`). They are different tiers with different names,
  but a price card is a price card, so the components below know nothing about
  either. Each side passes its own tiers and its own feature rows.

  That matters beyond saving code. Both ladders are shown in two places — while
  signing up and later when upgrading — and the thing a customer is most likely
  to feel cheated by is a comparison table that reads differently in the two
  places. One component means it cannot.
*/

/** Anything with a name and two prices can be a tier. */
export type PlanTier = {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  recommended?: boolean;
};

/** One row of a comparison table, keyed by tier. */
export type PlanFeature = {
  label: string;
  /** Optional section heading, for tables long enough to need them. */
  group?: string;
  values: Record<string, boolean | string>;
};

export type PlanCycle = "monthly" | "annual";

function FeatureValue({ value }: { value: boolean | string | undefined }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto size-4 text-success" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false || value === undefined) {
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
  /** Months saved by paying annually. Omit to hide the badge. */
  savingMonths,
}: {
  cycle: PlanCycle;
  onChange: (cycle: PlanCycle) => void;
  savingMonths?: number;
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
        {savingMonths && savingMonths > 0 ? (
          <span className="ml-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            {savingMonths} months free
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function PlanCards({
  tiers,
  selected,
  cycle,
  onSelect,
  currentKey,
  label,
}: {
  tiers: readonly PlanTier[];
  selected: string;
  cycle: PlanCycle;
  onSelect: (key: string) => void;
  /** Marks the tier the account is already on. */
  currentKey?: string;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      // Four across only on very wide screens: inside a portal these sit
      // between a 16rem nav and a 20rem summary rail, where four columns
      // squeeze the annual prices past the card edge.
      className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
    >
      {tiers.map((tier) => {
        const price = cycle === "annual" ? tier.annual : tier.monthly;
        const active = selected === tier.key;
        const isCurrent = currentKey === tier.key;
        const savedMonths =
          tier.monthly === 0
            ? 0
            : Math.round((tier.monthly * 12 - tier.annual) / tier.monthly);

        return (
          <button
            key={tier.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(tier.key)}
            className={cn(
              "relative flex flex-col rounded-lg border p-5 text-left transition-colors",
              active
                ? "border-brand bg-brand-soft"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            {tier.recommended && !isCurrent ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-foreground">
                Recommended
              </span>
            ) : null}
            {isCurrent ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Current plan
              </span>
            ) : null}

            <span className="text-sm font-semibold text-foreground">{tier.name}</span>

            <span className="mt-3 flex flex-wrap items-baseline gap-x-1">
              {price === 0 ? (
                <span className="text-lg font-semibold text-foreground">Free</span>
              ) : (
                <>
                  <Currency
                    value={price}
                    className="text-lg font-semibold text-foreground"
                  />
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
              {tier.tagline}
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

export function PlanComparison({
  tiers,
  features,
  highlight,
  title = "Compare plans",
}: {
  tiers: readonly PlanTier[];
  features: readonly PlanFeature[];
  highlight?: string;
  title?: string;
}) {
  /*
    Grouped only when the rows carry groups. The supplier's twelve features read
    fine as one list; the customer access matrix is twenty-eight rows, which
    needs sections to be scannable at all.
  */
  const groups = React.useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, PlanFeature[]>();
    for (const feature of features) {
      const key = feature.group ?? "";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        order.push(key);
      }
      byGroup.get(key)!.push(feature);
    }
    return order.map((key) => ({ group: key, rows: byGroup.get(key)! }));
  }, [features]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <div className="scroll-x">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="px-5 py-3 text-left font-medium text-muted-foreground"
                >
                  Feature
                </th>
                {tiers.map((tier) => (
                  <th
                    key={tier.key}
                    scope="col"
                    className={cn(
                      "px-3 py-3 text-center font-semibold",
                      highlight === tier.key ? "text-brand" : "text-foreground",
                    )}
                  >
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map(({ group, rows }) => (
              <tbody key={group || "ungrouped"} className="divide-y divide-border">
                {group ? (
                  <tr className="border-t border-border bg-surface-muted">
                    <th
                      scope="colgroup"
                      colSpan={tiers.length + 1}
                      className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground"
                    >
                      {group}
                    </th>
                  </tr>
                ) : null}
                {rows.map((feature) => (
                  <tr key={feature.label}>
                    <th
                      scope="row"
                      className="px-5 py-2.5 text-left font-normal text-muted-foreground"
                    >
                      {feature.label}
                    </th>
                    {tiers.map((tier) => (
                      <td
                        key={tier.key}
                        className={cn(
                          "px-3 py-2.5 text-center",
                          highlight === tier.key && "bg-brand-soft/50",
                        )}
                      >
                        <FeatureValue value={feature.values[tier.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
