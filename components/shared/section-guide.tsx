"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Compass,
  Factory,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Truck,
  X,
} from "lucide-react";

/*
  A guided tour of the build, for demonstrations.

  The prototype spans three businesses and four audiences — an applying
  manufacturer, a verified supplier, a hardware shop, and Buildex's own staff —
  and which screen belongs to whom is not obvious from a URL.

  It floats above the product rather than sitting inside it. Guidance baked into
  a page becomes something a reviewer has to mentally subtract before judging
  the design, and something a developer has to remember to delete before launch.
  Overlaying it keeps the product exactly what it claims to be, and makes the
  scaffolding removable in one line.

  Brand blue, not green: green is the interface's success colour, and a standing
  green panel on every page reads as "everything is fine" rather than "here is
  what this is".
*/

export type DemoSection = {
  key: string;
  title: string;
  href: string;
  icon: React.ElementType;
  /** What the section does, in one sentence. */
  what: string;
  /** Whose screen this is. */
  who: string;
};

export const DEMO_SECTIONS: DemoSection[] = [
  {
    key: "onboarding",
    title: "Manufacturer onboarding",
    href: "/connect/onboarding/account",
    icon: Factory,
    what: "Nine steps from sign-up to a live listing — account, phone, company, directors, KYB documents, then verification against BRS, KRA and IPRS.",
    who: "A manufacturer applying to sell on Buildex Connect",
  },
  {
    key: "portal",
    title: "Manufacturer dashboard",
    href: "/connect/dashboard",
    icon: LayoutDashboard,
    what: "What a verified supplier runs day to day: their catalogue and price bands, the enquiries coming in, regional campaigns and what their listings actually did.",
    who: "A manufacturer already trading on the platform",
  },
  {
    key: "admin",
    title: "Buildex Admin",
    href: "/admin",
    icon: ShieldCheck,
    what: "The internal console — verification decisions, supplier standing, listing moderation, enquiry oversight and one activity trail across the whole platform.",
    who: "Buildex staff: operations, risk, commercial and support",
  },
  {
    key: "marketplace",
    title: "The marketplace",
    href: "/marketplace",
    icon: Store,
    what: "What a hardware shop sees: search by product, supplier or delivery region, compare quantity price bands, then send a quote request.",
    who: "A hardware shop buying materials",
  },
  {
    key: "procurement",
    title: "Suppliers & vendor bills",
    href: "/admin/suppliers",
    icon: Truck,
    what: "Buildex Interiors' own purchase ledger — the mills, hauliers and clearing agents it buys from, what is owed to each, and which records are incomplete.",
    who: "Buildex finance and procurement",
  },
];

/** Which section the current URL belongs to, longest match first. */
function currentSection(pathname: string) {
  return [...DEMO_SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname.startsWith(s.href));
}

const ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

/**
 * The floating guide. Mounted once in the root layout, so it is available on
 * every screen and belongs to none of them.
 */
export function DemoGuide() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  if (!ENABLED) return null;
  const active = currentSection(pathname ?? "");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          // Stacked above the Demo controls pill; both are scaffolding, and
          // keeping them in one corner leaves the product's own chrome alone.
          className="fixed bottom-28 right-4 z-40 flex items-center gap-2 rounded-full border border-brand bg-brand px-3.5 py-2 text-xs font-medium text-brand-foreground shadow-overlay transition-colors hover:bg-brand-hover print:hidden"
        >
          <Compass className="size-3.5" aria-hidden="true" />
          Walk the build
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content className="fixed bottom-28 right-4 z-50 max-h-[min(38rem,calc(100vh-9rem))] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-surface shadow-overlay">
          <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Compass className="size-4 text-brand" aria-hidden="true" />
                Walk the build
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                For guidance only — this panel is not part of the product.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {active ? (
            <div className="border-b border-border bg-brand-soft px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                You are here
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{active.title}</p>
              <p className="mt-0.5 text-sm text-foreground">{active.what}</p>
              <p className="mt-1 text-xs text-muted-foreground">For {active.who}.</p>
            </div>
          ) : null}

          <ul className="divide-y divide-border">
            {DEMO_SECTIONS.filter((s) => s.key !== active?.key).map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.key}>
                  <Link
                    href={section.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground group-hover:text-brand">
                        {section.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {section.who}
                      </span>
                      <span className="mt-1 block text-xs text-foreground">
                        {section.what}
                      </span>
                    </span>
                    <ArrowRight
                      className="mt-1 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Every link opens the real screens with seeded data — nothing here is a
            mock-up image. Set <code className="text-numeric">NEXT_PUBLIC_DEMO_MODE=false</code>{" "}
            to remove this panel entirely.
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
