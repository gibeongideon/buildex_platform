"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, FileText, Flame, Sparkles, Truck } from "lucide-react";
import {
  AccountLink,
  PromoStrip,
  UtilityBar,
  UtilityLinks,
  useMarketplaceCustomer,
} from "@/components/marketplace/top-bar";
import { CategoryMegaMenu } from "@/components/marketplace/mega-menu";
import { SearchHero, SearchScopeTabs } from "@/components/marketplace/search-hero";
import { HomeScopeProvider } from "@/components/marketplace/home-scope";
import { CompareProvider, CompareTray } from "@/components/marketplace/compare";
import { EntrySteps } from "@/components/marketplace/entry-steps";
import { Wordmark } from "@/components/shared/brand";
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
  { href: "/marketplace/ask", label: "Ask AI", icon: Sparkles },
  { href: "/marketplace/manufacturers", label: "Verified manufacturers", icon: BadgeCheck },
  { href: "/marketplace/regions", label: "Delivery regions", icon: Truck },
  { href: "/marketplace/top-ranking", label: "Top ranking", icon: Flame },
  { href: "/marketplace/rfq", label: "Request a quote", icon: FileText },
];

export function MarketplaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/marketplace";
  const customer = useMarketplaceCustomer();
  /*
    Exactly one search input per page.

    Two inputs sharing a label are ambiguous to a screen reader and to anyone
    driving the page by keyboard, so the layout's compact field is rendered in
    one place only (the scope bar) and stands down entirely on pages that carry
    their own: the home hero, Ask AI, the supplier directory and a storefront.
  */
  const ownsSearch =
    isHome ||
    pathname.startsWith("/marketplace/ask") ||
    pathname.startsWith("/marketplace/manufacturer");
  const showCompactSearch = !ownsSearch;
  const [region, setRegion] = React.useState("");
  const [stuck, setStuck] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);

  /*
    The reference site collapses its header on scroll: the promo strip and the
    tall search hero give way to one compact bar carrying the logo, an inline
    search and the utilities. Search is then never more than a click away, and
    the grid gets the viewport back.

    A sentinel element plus IntersectionObserver rather than a scroll listener,
    so this costs nothing per frame.
  */
  const brandedHeaderRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const node = brandedHeaderRef.current;
    if (!node) return;

    /*
      Driven by scroll position, not IntersectionObserver.

      The observer was correct about *where* the threshold is and wrong about
      *when*: its callback is delivered asynchronously, so flicking back to the
      top with Home or a fast wheel left the collapsed bar on screen for a
      couple of frames while the real header was already back — long enough to
      see two BUILDEX lockups, and long enough to screenshot. Measured at two
      frames before this change, none after.

      A scroll handler resolves in the same frame. It does one number comparison
      and is passive, so it costs nothing that matters; correctness is worth
      more here than avoiding a per-frame read.
    */
    let threshold = node.offsetTop + node.offsetHeight;
    const measure = () => {
      threshold = node.offsetTop + node.offsetHeight;
    };
    const onScroll = () => {
      const next = window.scrollY > threshold;
      /*
        Written straight to the DOM as well as to state.

        A React state update lands on the *next* frame however it is triggered,
        so the bar stayed on screen for a frame after the page had already
        returned to the top — with the real header back underneath it. Setting
        the attribute here happens inside the scroll event, before paint, so the
        two can never be drawn together. State still drives what is *inside* the
        bar, where a frame's delay costs nothing.
      */
      barRef.current?.setAttribute("data-stuck", String(next));
      barRef.current?.setAttribute("aria-hidden", String(!next));
      setStuck(next);
    };

    // Not called synchronously here: setState inside an effect body is the
    // pattern the React Compiler rejects, and a frame later is soon enough for
    // a page restored mid-scroll.
    const initial = requestAnimationFrame(() => {
      measure();
      onScroll();
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      {/*
        On the home page the scope tabs switch content in place, so the hero and
        the page below it share one selection. Off the home page the provider
        stands down and the tabs go back to being navigation.
      */}
      {/*
        Comparison selection is held for the whole marketplace, not one page: a
        buyer builds a shortlist while moving between search, a listing and a
        storefront, and losing it on navigation would make the feature useless.
      */}
      <CompareProvider>
      <HomeScopeProvider enabled={isHome}>
      <div className="flex min-h-dvh flex-col bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-foreground"
        >
          Skip to content
        </a>

        <div ref={brandedHeaderRef}>
          <PromoStrip />
          <UtilityBar region={region} onRegionChange={setRegion} />
        </div>

        {/* The collapsed bar: logo + inline search, only once scrolled past. */}
        <div
          ref={barRef}
          data-stuck={stuck}
          className={cn(
            "fixed inset-x-0 top-0 z-40 border-b border-border bg-surface/95 backdrop-blur",
            // Position comes from the attribute, which the scroll handler sets
            // synchronously — not from the class list, which waits for a render.
            "data-[stuck=false]:-translate-y-full data-[stuck=true]:translate-y-0",
            /*
              Animated in, but removed instantly.

              Sliding it *out* over 200ms means that when you scroll back up the
              bar animates away across the header that is sliding back in, and
              for those 200ms two BUILDEX lockups and two search fields are on
              screen at once. Long enough to see, and long enough to screenshot.
              Nobody misses a header appearing too fast; everybody notices two.
            */
            /*
              No transition. Sliding the bar in or out means 200ms during which
              it is painted across the header that is arriving or leaving — and
              400ms of doubled header, measured, is long enough to see and to
              screenshot. The bar's position is now driven entirely by the
              attribute above, which the scroll handler sets before paint, so it
              is either there or it is not.
            */
            stuck ? "shadow-overlay" : "",
          )}
          aria-hidden={!stuck}
        >
          <div className="mx-auto flex h-14 max-w-[112rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/marketplace" className="shrink-0 rounded-md" tabIndex={stuck ? 0 : -1}>
              <Wordmark product="connect" size="sm" />
            </Link>
            {/*
              Only mounted while the bar is actually shown. Rendering it hidden
              would leave a second search input in the DOM with the same label —
              focusable by keyboard and ambiguous to screen readers.
            */}
            <div className="min-w-0 flex-1">{stuck ? <SearchHero compact /> : null}</div>
            <Link
              href="/marketplace/rfq"
              tabIndex={stuck ? 0 : -1}
              className="hidden shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground md:block"
            >
              Request a quote
            </Link>
            <AccountLink customer={customer} tabIndex={stuck ? 0 : -1} />
          </div>
        </div>

        {/*
          `relative` is what lets the mega menu span the full width of this row
          rather than being clipped to the button it hangs off.
        */}
        <div className="relative border-b border-border bg-surface">
          <div className="mx-auto flex max-w-[112rem] items-center gap-2 px-4 sm:px-6 lg:px-8">
            <CategoryMegaMenu />

            <nav aria-label="Marketplace" className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "font-semibold text-brand"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {link.href === "/marketplace/ask" ? (
                      <link.icon className="size-4 text-primary" aria-hidden="true" />
                    ) : null}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <UtilityLinks className="ml-auto" />
          </div>
        </div>

        {isHome ? (
          <section className="border-b border-border bg-surface-muted">
            <div className="mx-auto max-w-[112rem] px-4 sm:px-6 lg:px-8">
              {/*
                Chapter 9 §9.2's customer promise, and the six verbs it opens
                with. It sits above the search field rather than below it
                because the field is the answer to the promise: the chapter's
                whole argument is that search is the front door, so the words
                that frame it have to arrive first.
              */}
              <div className="pt-8 text-center sm:pt-10">
                <h1 className="font-display text-xl font-bold uppercase tracking-tight text-foreground sm:text-2xl">
                  Africa&rsquo;s home of construction materials
                </h1>
                {/*
                  A wrapping flex row, not a paragraph with margins between the
                  separators. Written the obvious way — `{verb}` next to a
                  `<span className="mx-1.5">·</span>` — it renders with *no
                  whitespace characters at all*: the margin only looks like
                  spacing, so the browser sees one unbreakable 576px token and a
                  360px phone gets a horizontally scrolling page. Each verb is
                  its own flex item here, so the line breaks where it should.
                */}
                <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-brand dark:text-white">
                  {["Search", "Compare", "Discover", "Connect", "Shop", "Save"].map(
                    (verb, index) => (
                      <React.Fragment key={verb}>
                        {index > 0 ? (
                          <li aria-hidden="true" className="text-primary">
                            &middot;
                          </li>
                        ) : null}
                        <li>{verb}</li>
                      </React.Fragment>
                    ),
                  )}
                </ul>
                <p className="mx-auto mt-2.5 max-w-xl text-sm text-muted-foreground">
                  Find trusted materials. Connect with trusted suppliers. Build with
                  confidence.
                </p>
              </div>
              <SearchHero />
              <EntrySteps signedIn={Boolean(customer)} />
            </div>
          </section>
        ) : (
          <div className="border-b border-border bg-surface">
            {/*
              Four tabs and a search field do not fit 375px side by side, so the
              row wraps: tabs scroll horizontally on their own line, search takes
              the full width beneath.
            */}
            <div className="mx-auto flex max-w-[112rem] flex-wrap items-center gap-x-3 px-4 sm:px-6 lg:px-8">
              <div className="scroll-x -mx-1 w-full py-1 sm:w-auto">
                <SearchScopeTabs size="sm" className="px-1" />
              </div>
              {showCompactSearch ? (
                <div className="min-w-0 w-full pb-2 sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1 sm:pb-0 sm:py-2">
                  <SearchHero compact />
                </div>
              ) : null}
            </div>
          </div>
        )}


        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="on-brand mt-12">
          <div className="mx-auto max-w-[112rem] px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                {/* The shared lockup, not a copy of it — see the public footer. */}
                <Wordmark product="connect" reversed />
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
                    { label: "My account", href: "/account" },
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
      </HomeScopeProvider>
      <CompareTray />
      </CompareProvider>
    </TooltipProvider>
  );
}
