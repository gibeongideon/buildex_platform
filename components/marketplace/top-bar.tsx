"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Globe,
  MapPin,
  ShoppingCart,
  User,
} from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { customerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { REGIONS } from "@/lib/schemas/common";
import type { Customer } from "@/lib/schemas/customer";
import { cn } from "@/lib/utils";

/*
  Marketplace utility chrome.

  Modelled on the large B2B marketplaces (Alibaba and its peers), because the
  pattern is genuinely well-tested for this job: a promo strip, then a dense
  utility row carrying delivery context, messages, saved lists, cart and
  account, then a navigation row.

  The one substantive change is delivery context: those marketplaces ask
  "ship to which country". Buildex trades inside one country, so the useful
  question is which *region* — it is what determines whether a supplier can
  deliver at all, and it filters the whole catalogue.
*/

export function PromoStrip() {
  // `on-brand`, not `bg-brand`: the structural blue token lifts to a pale tint
  // in dark mode, which would leave white text on lavender. `on-brand` resolves
  // to a deep ground in both themes.
  return (
    <div className="on-brand relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-r from-transparent to-primary/25"
      />
      <div className="relative mx-auto flex max-w-[112rem] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center sm:px-6 lg:px-8">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          Verified suppliers
        </span>
        <p className="text-sm font-medium text-white">
          Every manufacturer checked before listing
        </p>
        <Link
          href="/manufacturers"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sell on Buildex Connect
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

const UTILITY_LINKS = [
  { label: "About Buildex", href: "/" },
  { label: "Help centre", href: "/marketplace/rfq" },
  { label: "Buildex Capital", href: "/" },
  { label: "Sell on Buildex Connect", href: "/manufacturers" },
];

/**
 * The account control.
 *
 * The one place a visitor learns they have an identity here, so it names the
 * account rather than saying a generic "Account" — and when nobody is signed
 * in it offers the thing that fixes that, instead of the dead link into the
 * supplier portal it used to be.
 *
 * Exported because it appears twice: in the utility bar and again in the
 * collapsed scroll header. Two copies is how one of them ends up still
 * pointing at the supplier dashboard.
 */
export function AccountLink({
  customer,
  tabIndex,
  className,
}: {
  customer: Customer | null | undefined;
  tabIndex?: number;
  className?: string;
}) {
  return (
    <Link
      href={customer ? "/account" : "/join"}
      tabIndex={tabIndex}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted",
        className,
      )}
    >
      <User className="size-5" aria-hidden="true" />
      <span className="hidden max-w-32 truncate sm:inline">
        {customer ? customer.name.split(" ")[0] : "Sign in"}
      </span>
    </Link>
  );
}

/** Who is signed in on the buying side, for the chrome that names them. */
export function useMarketplaceCustomer() {
  return useQuery(() => customerRepo.current(), []).data;
}

export function UtilityBar({
  region,
  onRegionChange,
}: {
  region: string;
  onRegionChange: (region: string) => void;
}) {
  const customer = useMarketplaceCustomer();

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[112rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/marketplace" className="shrink-0 rounded-md">
          <Wordmark product="connect" size="sm" className="lg:hidden" />
          <Wordmark product="connect" className="hidden lg:inline-flex" />
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <label className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-muted md:flex">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Deliver to</span>
            <select
              value={region}
              onChange={(event) => onRegionChange(event.target.value)}
              aria-label="Delivery region"
              className="cursor-pointer border-0 bg-transparent text-sm font-semibold text-foreground focus:outline-none"
            >
              <option value="">All Kenya</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <span className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground lg:flex">
            <Globe className="size-4" aria-hidden="true" />
            English · KSh
          </span>

          <ThemeToggle className="hidden lg:inline-flex" />

          {[
            {
              icon: ClipboardList,
              label: "Quotations",
              href: customer ? "/account/quotations" : "/marketplace/rfq",
            },
            {
              icon: ShoppingCart,
              label: "Enquiry basket",
              href: "/marketplace/rfq",
            },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              title={label}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </Link>
          ))}

          <AccountLink customer={customer} />
        </div>
      </div>
    </div>
  );
}

export function UtilityLinks({ className }: { className?: string }) {
  return (
    <div className={cn("hidden items-center gap-1 lg:flex", className)}>
      {UTILITY_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
