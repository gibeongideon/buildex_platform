"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, FileText, Flame, Truck } from "lucide-react";
import { PromoStrip, UtilityBar, UtilityLinks } from "@/components/marketplace/top-bar";
import { CategoryMegaMenu } from "@/components/marketplace/mega-menu";
import { SearchHero } from "@/components/marketplace/search-hero";
import { BuildexMark, Wordmark } from "@/components/shared/brand";
import { TooltipProvider } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/*
  Marketplace chrome.

  Its own route group so the buyer-facing marketplace can carry a different
  header from the corporate site: promo strip → utility bar → navigation row
  with the mega menu. The home page shows the full search hero; every other
  page gets a compact search bar in the nav row, so search is never more than
  one field away.
*/

const NAV_LINKS = [
  { href: "/marketplace/manufacturers", label: "Verified manufacturers", icon: BadgeCheck },
  { href: "/marketplace/regions", label: "Delivery regions", icon: Truck },
  { href: "/marketplace/top-ranking", label: "Top ranking", icon: Flame },
  { href: "/marketplace/rfq", label: "Request a quote", icon: FileText },
];

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/marketplace";
  const [region, setRegion] = React.useState("");
  const [stuck, setStuck] = React.useState(false);

  /*
    The reference site collapses its header on scroll: the promo strip and the
    tall search hero give way to one compact bar carrying the logo, an inline
    search and the utilities. Search is then never more than a click away, and
    the grid gets the viewport back.

    A sentinel element plus IntersectionObserver rather than a scroll listener,
    so this costs nothing per frame.
  */
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: "0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-foreground"
        >
          Skip to content
        </a>

        <PromoStrip />
        <UtilityBar region={region} onRegionChange={setRegion} />
        {/* Crossing this marks the point where the header collapses. */}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />

        {/* The collapsed bar: logo + inline search, only once scrolled past. */}
        <div
          className={cn(
            "fixed inset-x-0 top-0 z-40 border-b border-border bg-surface/95 backdrop-blur transition-transform duration-200",
            stuck ? "translate-y-0 shadow-overlay" : "-translate-y-full",
          )}
          aria-hidden={!stuck}
        >
          <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/marketplace" className="shrink-0 rounded-md" tabIndex={stuck ? 0 : -1}>
              <Wordmark product="connect" size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <SearchHero compact />
            </div>
            <Link
              href="/marketplace/rfq"
              tabIndex={stuck ? 0 : -1}
              className="hidden shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground md:block"
            >
              Request a quote
            </Link>
            <Link
              href="/connect/dashboard"
              tabIndex={stuck ? 0 : -1}
              className="shrink-0 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/*
          `relative` is what lets the mega menu span the full width of this row
          rather than being clipped to the button it hangs off.
        */}
        <div className="relative border-b border-border bg-surface">
          <div className="mx-auto flex max-w-[90rem] items-center gap-2 px-4 sm:px-6 lg:px-8">
            <CategoryMegaMenu />

            <nav aria-label="Marketplace" className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "font-semibold text-brand"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {!isHome ? (
              <div className="ml-auto hidden min-w-0 flex-1 justify-end lg:flex">
                <div className="w-full max-w-md">
                  <SearchHero compact />
                </div>
              </div>
            ) : (
              <UtilityLinks className="ml-auto" />
            )}
          </div>
        </div>

        {isHome ? (
          <section className="border-b border-border bg-surface-muted">
            <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
              <SearchHero />
            </div>
          </section>
        ) : null}

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="on-brand mt-12">
          <div className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="inline-flex items-center gap-2.5">
                  <BuildexMark className="h-7 text-white" />
                  <span className="flex flex-col items-start leading-none">
                    <span className="font-display text-base font-extrabold tracking-tight text-white">
                      BUILDEX
                    </span>
                    <span className="mt-1 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                      CONNECT
                    </span>
                  </span>
                </span>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                  Wholesale building materials from verified Kenyan manufacturers, priced
                  in quantity bands and delivered by region.
                </p>
                <p className="mt-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Building Better Lives
                </p>
              </div>

              {[
                {
                  title: "Buy",
                  links: [
                    { label: "All listings", href: "/marketplace/search" },
                    { label: "Top ranking", href: "/marketplace/top-ranking" },
                    { label: "Request a quote", href: "/marketplace/rfq" },
                    { label: "Delivery regions", href: "/marketplace/regions" },
                  ],
                },
                {
                  title: "Sell",
                  links: [
                    { label: "Sell on Buildex Connect", href: "/manufacturers" },
                    { label: "Start onboarding", href: "/connect/onboarding/account" },
                    { label: "Supplier packages", href: "/manufacturers#packages" },
                    { label: "Supplier portal", href: "/connect/dashboard" },
                  ],
                },
                {
                  title: "Buildex",
                  links: [
                    { label: "Buildex Interiors", href: "/" },
                    { label: "Buildex Capital", href: "/" },
                    { label: "Verified manufacturers", href: "/marketplace/manufacturers" },
                  ],
                },
              ].map((section) => (
                <div key={section.title}>
                  <p className="text-sm font-semibold text-white">{section.title}</p>
                  <ul className="mt-3 space-y-2">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="rounded text-sm text-white/70 transition-colors hover:text-white hover:underline"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/60">
                © {new Date().getFullYear()} Buildex Interiors Co. Ltd. Nairobi, Kenya.
              </p>
              <p className="text-xs text-white/50">
                Prototype build — mock data only, no live services connected.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
