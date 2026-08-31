"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Factory,
  FlaskConical,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import { resetDemoData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/primitives";

/*
  The demo panel.

  One panel, not two. This and a separate "Walk the build" guide were the same
  idea wearing two pills in the same corner — one explained what each section
  was, the other jumped between them and reset the data — so a presenter had to
  remember which button held which half. They are merged here: what you are
  looking at, who it is for, where else to go, and the controls.

  It floats above the product rather than sitting inside it. Guidance baked into
  a page becomes something a reviewer has to mentally subtract before judging
  the design, and something a developer has to remember to delete before launch.
  Overlaying it keeps the product exactly what it claims to be, and makes the
  scaffolding removable in one line: NEXT_PUBLIC_DEMO_MODE=false.

  Brand blue, not green — green is the interface's success colour, and standing
  green scaffolding reads as "everything is fine" rather than "here is what
  this is".
*/

const ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export type DemoSection = {
  key: string;
  title: string;
  href: string;
  icon: React.ElementType;
  /** What the section does, in one sentence. */
  what: string;
  /** Whose screen this is. */
  who: string;
  /** The two or three things worth actually clicking while you are in there. */
  tryThis: string[];
};

export const DEMO_SECTIONS: DemoSection[] = [
  {
    key: "onboarding",
    title: "Manufacturer onboarding",
    href: "/connect/onboarding/account",
    icon: Factory,
    what: "Nine steps from sign-up to a live listing — account, phone, company, directors, KYB documents, then verification against BRS, KRA and IPRS.",
    who: "A manufacturer applying to sell on Buildex Connect",
    tryThis: [
      "Directors must total 100% ownership before the step will pass",
      "Products added before clearance save as drafts and publish themselves once it clears",
    ],
  },
  {
    key: "portal",
    title: "Manufacturer dashboard",
    href: "/connect/dashboard",
    icon: LayoutDashboard,
    what: "What a verified supplier runs day to day: their catalogue and price bands, the enquiries coming in, regional campaigns and what their listings actually did.",
    who: "A manufacturer already trading on the platform",
    tryThis: [
      "Catalogue → Import takes a CSV price list and checks every row before saving",
      "Mark up to four listings as main products — they lead the storefront",
    ],
  },
  {
    key: "admin",
    title: "Buildex Admin",
    href: "/admin",
    icon: ShieldCheck,
    what: "The internal console — verification decisions, supplier standing, listing moderation, enquiry oversight and one activity trail across the whole platform.",
    who: "Buildex staff: operations, risk, commercial and support",
    tryThis: [
      "Team & roles switches between the four internal roles",
      "Every activity entry is derived from a real record, not a log table",
    ],
  },
  {
    key: "customer",
    title: "Customer account",
    href: "/account",
    icon: UserPlus,
    what: "The buying side of the marketplace: who a customer is, what their membership opens up, and the verification level they have earned rather than bought.",
    who: "Anyone buying materials — a homeowner, a fundi, a contractor or a hardware shop",
    tryThis: [
      "Join at /join — four steps, and business details are only asked for if you say you are a business",
      "Verification level is derived, so it moves when you complete your profile",
    ],
  },
  {
    key: "marketplace",
    title: "The marketplace",
    href: "/marketplace",
    icon: Store,
    what: "What a hardware shop sees: search by product, supplier or delivery region, compare quantity price bands, then send a quote request.",
    who: "A hardware shop buying materials",
    tryThis: [
      "Request a quote reads one sentence and fills the form in",
      "Compare up to four listings side by side at your own order quantity",
      "The offers rail shows more once an account is on a paid membership",
    ],
  },
  {
    key: "procurement",
    title: "Suppliers & vendor bills",
    href: "/admin/suppliers",
    icon: Truck,
    what: "Buildex Interiors' own purchase ledger — the mills, hauliers and clearing agents it buys from, what is owed to each, and which records are incomplete.",
    who: "Buildex finance and procurement",
    tryThis: [
      "Ageing buckets reconcile against the outstanding total",
      "Records missing a KRA PIN or contact are flagged rather than hidden",
    ],
  },
];

/** Screens worth reaching directly that are not a section of their own. */
const SHORTCUTS = [
  { href: "/", label: "Ecosystem home" },
  { href: "/manufacturers", label: "Connect — manufacturer acquisition" },
  { href: "/connect/verification", label: "Verification status (supplier's view)" },
  { href: "/admin/verification", label: "Verification queue (ops view)" },
];

/** Which section the current URL belongs to, longest match first. */
function currentSection(pathname: string) {
  return [...DEMO_SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname.startsWith(s.href));
}

export function DemoPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  if (!ENABLED) return null;

  const active = currentSection(pathname ?? "");

  function reset() {
    setResetting(true);
    // The in-progress application lives in the same store as the seeded data,
    // so one reset clears both. The theme preference is a separate key and
    // deliberately survives.
    resetDemoData();
    setOpen(false);
    setResetting(false);
    router.push("/");
    router.refresh();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          // Clear of the comparison tray, which owns the very bottom edge.
          className="fixed bottom-16 right-4 z-40 flex items-center gap-2 rounded-full border border-brand bg-brand px-3.5 py-2 text-xs font-medium text-brand-foreground shadow-overlay transition-colors hover:bg-brand-hover print:hidden"
        >
          <FlaskConical className="size-3.5" aria-hidden="true" />
          Demo controls
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content className="fixed bottom-16 right-4 z-50 max-h-[min(40rem,calc(100vh-6rem))] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-surface shadow-overlay">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FlaskConical className="size-4 text-brand" aria-hidden="true" />
                Demo controls
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
              {/* `who` is already a sentence-shaped audience — "A manufacturer
                  already trading…", "Buildex staff: …" — so it stands alone
                  rather than taking a "For " prefix that would read "For A". */}
              <p className="mt-1 text-xs text-muted-foreground">{active.who}</p>
              <ul className="mt-2 space-y-1">
                {active.tryThis.map((tip) => (
                  <li key={tip} className="flex gap-1.5 text-xs text-foreground">
                    <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-brand" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            {active ? "The rest of the build" : "The build"}
          </p>
          <ul className="mt-1 divide-y divide-border border-b border-border">
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

          <div className="px-4 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Jump straight to
            </p>
            <ul className="space-y-0.5">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.href}>
                  <Link
                    href={shortcut.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    {shortcut.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Separator className="my-3" />

            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              This build
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Every link opens the real screens with seeded data — nothing here is a
              mock-up image. The data is held in your browser: nothing is sent anywhere,
              and no database is connected yet.
            </p>

            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              loading={resetting}
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
              Reset all demo data
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Clears your in-progress application and restores the seeded manufacturers
              and catalogue. Set{" "}
              <code className="text-numeric">NEXT_PUBLIC_DEMO_MODE=false</code> to remove
              this panel entirely.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
