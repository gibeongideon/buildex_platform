import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Factory,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
  A guided tour of the build, for demonstrations.

  The prototype spans three businesses and four audiences — an applying
  manufacturer, a verified supplier, a hardware shop, and Buildex's own staff —
  and which screen belongs to whom is not obvious from a URL. So each section
  states plainly what it is and who it is for: once on the home page as a
  jumping-off point, and again as a banner on the section itself, so someone who
  arrives by a deep link is not left guessing.

  One definition, two surfaces. The home page and the banners read the same
  array, so a section can never describe itself differently in two places.
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

export function sectionByKey(key: string) {
  const section = DEMO_SECTIONS.find((s) => s.key === key);
  if (!section) throw new Error(`Unknown demo section: ${key}`);
  return section;
}

/**
 * The green explainer shown at the top of a section.
 *
 * Green because it is guidance rather than product chrome — it should read as a
 * note *about* the screen, not part of it. Deliberately compact: it sits above
 * real work and must not push it down the page.
 */
export function SectionGuide({
  sectionKey,
  className,
}: {
  sectionKey: string;
  className?: string;
}) {
  const section = sectionByKey(sectionKey);

  return (
    <aside
      aria-label={`About ${section.title}`}
      className={cn(
        "mb-6 rounded-lg border border-success/30 bg-success-soft px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Compass className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-success">{section.title}</p>
          <p className="mt-0.5 text-sm text-foreground">{section.what}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            For {section.who}.{" "}
            <Link href="/#sections" className="text-success hover:underline">
              See the other sections
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}

/** The home page's jumping-off grid. */
export function SectionQuickLinks() {
  return (
    <section id="sections" className="border-b border-border bg-surface scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
              <Compass className="size-3.5" aria-hidden="true" />
              Walk the build
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
              Every section, and who it is for
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              The prototype covers four audiences and three businesses. Each link opens
              the real screens with seeded data — nothing here is a mock-up image.
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.key}>
                <Link
                  href={section.href}
                  className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-success"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground group-hover:text-success">
                        {section.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{section.who}</p>
                    </div>
                    <ArrowRight
                      className="mt-1 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-success"
                      aria-hidden="true"
                    />
                  </div>
                  {/* The green explanation the demo actually leans on. */}
                  <p className="mt-3 border-t border-border pt-3 text-sm text-success">
                    {section.what}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
