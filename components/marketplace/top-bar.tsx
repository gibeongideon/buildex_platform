"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Globe,
  MapPin,
  MessageSquare,
  ShoppingCart,
  User,
} from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { REGIONS } from "@/lib/schemas/common";
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

export function UtilityBar({
  region,
  onRegionChange,
}: {
  region: string;
  onRegionChange: (region: string) => void;
}) {
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
            { icon: MessageSquare, label: "Messages", href: "/marketplace" },
            { icon: ClipboardList, label: "Saved lists", href: "/marketplace/rfq" },
            { icon: ShoppingCart, label: "Enquiry basket", href: "/marketplace/rfq" },
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

          <Link
            href="/connect/dashboard"
            className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            <User className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
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
