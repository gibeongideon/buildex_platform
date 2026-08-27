"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { resetDemoData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/primitives";

/*
  Demo control panel.

  The mockup has no seed script and no admin, so this is how a presenter puts
  the app into a particular state mid-demo. Scenario controls that only make
  sense on one screen (advancing a verification check, expiring a document)
  live on that screen instead — this panel holds the global ones.

  Set NEXT_PUBLIC_DEMO_MODE=false to hide it entirely.
*/

const ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

const SHORTCUTS = [
  { href: "/", label: "Ecosystem home" },
  { href: "/marketplace", label: "Marketplace — buyer's view" },
  { href: "/manufacturers", label: "Connect — manufacturer acquisition" },
  { href: "/connect/onboarding/account", label: "Start onboarding" },
  { href: "/connect/dashboard", label: "Manufacturer dashboard" },
  { href: "/connect/verification", label: "Verification status" },
  { href: "/admin", label: "Buildex Admin — internal console" },
  { href: "/admin/verification", label: "Verification queue (ops)" },
];

export function DemoPanel() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  if (!ENABLED) return null;

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
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-overlay transition-colors hover:text-foreground print:hidden"
        >
          <FlaskConical className="size-3.5" aria-hidden="true" />
          Demo controls
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface shadow-overlay">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
              Demo controls
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="px-4 py-3">
            <DialogPrimitive.Description className="text-xs text-muted-foreground">
              This build runs on mock data held in your browser. Nothing is sent
              anywhere, and no database is connected yet.
            </DialogPrimitive.Description>

            <Separator className="my-3" />

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Jump to
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

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={resetting}
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
              Reset all demo data
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Clears your in-progress application and restores the seeded
              manufacturers and catalogue.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
