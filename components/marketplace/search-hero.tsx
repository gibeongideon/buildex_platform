"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { browsingRepo } from "@/lib/data";
import { PRODUCT_CATEGORIES } from "@/lib/schemas/common";
import { useHomeScope, type SearchScope } from "./home-scope";

/*
  The marketplace search hero and its scope tabs.

  Large B2B marketplaces put a tab row over an oversized search field, because
  the first decision a buyer makes is *what kind of thing* they are looking for
  — a product, a supplier, a place to buy from — and the second is the term.

  The reference site's tabs are AI Mode / Products / Manufacturers / Worldwide.
  Ours are Ask AI / Products / Manufacturers / Regions / Services — "Worldwide"
  becomes "Regions" because Buildex trades inside one country, where the useful
  question is which region a supplier delivers to, and Services is the fifth
  because Chapter 9 §9.17 lists a service and a FundiSmart professional as two
  of the eight things a customer searches for.

  Services carries a "soon" marker and leads to a page that says what it will
  hold. It is here now rather than added later on purpose: the tab row is the
  marketplace's top-level information architecture, and retrofitting a category
  of thing into it after customers have learned the shape is a worse change than
  showing an honest placeholder.

  The tabs behave in the two ways the reference site's do, depending on where
  they are:

    · On the home page they are an in-place switch. Choosing "Manufacturers"
      changes the field and the content below it without leaving, because a buyer
      deciding what *kind* of thing they want has not committed to a search yet.
    · Everywhere else they are navigation, and the active tab is derived from the
      route rather than local state — which is what keeps them correct on a page
      reached by a deep link, the mega menu or a card.

  `useHomeScope()` returning null is how this component tells the two apart.
*/

export type { SearchScope };

const TABS: {
  value: SearchScope;
  label: string;
  href: string;
  hint: string;
  /** The line under the field, where no category control takes its place. */
  subhint: string;
  /** Scaffolded, not yet carrying data — the shell's `upcoming` convention. */
  soon?: boolean;
}[] = [
  {
    value: "ask",
    label: "Ask AI",
    href: "/marketplace/ask",
    hint: "Describe what you need — “400 bags of cement to Machakos”…",
    subhint: "Plain language — quantity, material, destination",
  },
  {
    value: "products",
    label: "Products",
    href: "/marketplace/search",
    hint: "Search cement, rebar, tiles, cable…",
    subhint: "Search the whole catalogue",
  },
  {
    value: "manufacturers",
    label: "Manufacturers",
    href: "/marketplace/manufacturers",
    hint: "Search suppliers by name, county or category…",
    subhint: "Search verified suppliers",
  },
  {
    value: "regions",
    label: "Regions",
    href: "/marketplace/regions",
    hint: "Find suppliers who deliver to…",
    subhint: "Find who delivers where you build",
  },
  {
    value: "services",
    label: "Services",
    href: "/marketplace/services",
    hint: "Find a fundi — gypsum installer, mason, plumber…",
    subhint: "Trades and FundiSmart professionals — arriving soon",
    soon: true,
  },
];

const SUGGESTIONS = [
  "OPC 32.5N cement",
  "D12 rebar",
  "IBR roofing sheet",
  "Marine plywood",
  "Vinyl silk emulsion",
  "Twin & earth cable",
];

/** Which surface the current URL belongs to. */
export function scopeForPath(pathname: string): SearchScope {
  if (pathname.startsWith("/marketplace/ask")) return "ask";
  if (pathname.startsWith("/marketplace/manufacturers")) return "manufacturers";
  if (pathname.startsWith("/marketplace/regions")) return "regions";
  if (pathname.startsWith("/marketplace/services")) return "services";
  return "products";
}

function hrefFor(scope: SearchScope, query: string) {
  const tab = TABS.find((t) => t.value === scope) ?? TABS[1];
  return query.trim() ? `${tab.href}?q=${encodeURIComponent(query.trim())}` : tab.href;
}

/**
 * The scope tabs. Rendered large inside the home hero and small as a bar on
 * every other marketplace page, so a buyer can always switch surface.
 */
export function SearchScopeTabs({
  size = "lg",
  className,
}: {
  size?: "lg" | "sm";
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const home = useHomeScope();
  const active = home ? home.scope : scopeForPath(pathname);

  // Read the live query at click time rather than during render: it keeps the
  // buyer's term when they switch surface, without pulling `useSearchParams`
  // into a layout and forcing the whole tree out of static rendering.
  function go(scope: SearchScope) {
    // On the home page the tab is a mode switch, so stay put and let the hero
    // and the panels below react.
    if (home) {
      home.setScope(scope);
      return;
    }
    const current =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("q") ?? "";
    router.push(hrefFor(scope, current));
  }

  return (
    <div
      role="tablist"
      aria-label="What are you searching for"
      className={cn(
        "flex items-end",
        size === "sm" ? "flex-nowrap whitespace-nowrap" : "flex-wrap",
        size === "lg" ? "justify-center gap-x-4 gap-y-2 sm:gap-x-8" : "gap-x-1",
        className,
      )}
    >
      {TABS.map((tab, index) => {
        const isActive = tab.value === active;
        return (
          <React.Fragment key={tab.value}>
            {/* Ask AI is a different kind of surface, so it sits apart. */}
            {index === 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "self-center bg-border",
                  size === "lg" ? "mx-1 h-6 w-px sm:mx-2" : "mx-1 h-4 w-px",
                )}
              />
            ) : null}
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => go(tab.value)}
            className={cn(
              "relative font-display font-bold tracking-tight transition-colors",
              size === "lg"
                ? "pb-2 text-base sm:text-xl"
                : "rounded-md px-3 py-2 text-sm",
              isActive
                ? "text-brand dark:text-white"
                : "text-muted-foreground hover:text-foreground",
              size === "sm" && !isActive && "hover:bg-surface-muted",
            )}
          >
            {tab.value === "ask" ? (
              <Sparkles
                className={cn(
                  "mr-1 inline-block align-[-2px]",
                  size === "lg" ? "size-4" : "size-3.5",
                  isActive ? "text-primary" : "text-subtle-foreground",
                )}
                aria-hidden="true"
              />
            ) : null}
            {tab.label}
            {tab.value === "ask" ? (
              <sup
                className={cn(
                  "ml-0.5 font-display text-[0.55em] font-bold",
                  isActive ? "text-primary" : "text-subtle-foreground",
                )}
                aria-hidden="true"
              >
                AI
              </sup>
            ) : null}
            {tab.soon ? (
              <>
                <sup
                  className="ml-1 font-display text-[0.5em] font-bold uppercase tracking-wide text-subtle-foreground"
                  aria-hidden="true"
                >
                  Soon
                </sup>
                <span className="sr-only"> — coming soon</span>
              </>
            ) : null}
            {isActive ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 rounded-full bg-primary",
                  size === "lg" ? "-bottom-px h-1" : "-bottom-px h-0.5",
                )}
              />
            ) : null}
          </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function SearchHero({
  defaultQuery = "",
  compact = false,
}: {
  defaultQuery?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const home = useHomeScope();
  /*
    On the home page the scope is whichever tab is selected; everywhere else it
    follows the route, so submitting from the collapsed header or the nav bar
    keeps you on the surface you are already looking at.
  */
  const scope = home && !compact ? home.scope : scopeForPath(pathname);
  const [query, setQuery] = React.useState(defaultQuery);
  const [category, setCategory] = React.useState("");

  const active = TABS.find((t) => t.value === scope) ?? TABS[1];

  /*
    Recorded here, where a customer actually performs a search, rather than on
    the results page when a `?q=` appears. Those are different events: arriving
    on a link someone sent you is not one of your searches, and remembering it
    as one would fill the dashboard's list with other people's terms.
  */
  function remember(term: string) {
    void browsingRepo.recordSearch(term);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    remember(query);
    const base = hrefFor(scope, query);
    if (scope === "products" && category) {
      const sep = base.includes("?") ? "&" : "?";
      router.push(`${base}${sep}category=${encodeURIComponent(category)}`);
      return;
    }
    router.push(base);
  }

  return (
    <div
      className={cn(
        "mx-auto w-full",
        compact ? "max-w-3xl py-4" : "max-w-5xl py-8 sm:py-10",
      )}
    >
      {!compact ? <SearchScopeTabs size="lg" /> : null}

      <form onSubmit={submit} className={cn(compact ? "" : "mt-6")}>
        {compact ? (
          <div className="flex items-center gap-2 rounded-full border-2 border-brand bg-surface p-1.5 pl-4 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
            {scope === "ask" ? (
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={active.hint}
              aria-label={active.hint}
              className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {scope === "ask" ? "Ask" : "Search"}
            </button>
          </div>
        ) : (
          /*
            Two rows, like the reference: the term gets a full-width line of its
            own, and the narrowing control and the action sit beneath it. At this
            width a single row would leave the query field looking cramped
            between two chunky controls.
          */
          <div className="rounded-2xl border-2 border-brand bg-surface px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
            <div className="flex items-center gap-3">
              {scope === "ask" ? (
                <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Search
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={active.hint}
                aria-label={active.hint}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent text-base text-foreground placeholder:text-subtle-foreground focus:outline-none"
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2.5">
              {scope === "products" ? (
                <label className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">In</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-label="Narrow to a category"
                    className="min-w-0 cursor-pointer border-0 bg-transparent text-sm font-semibold text-foreground focus:outline-none"
                  >
                    <option value="">All categories</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  {active.subhint}
                </p>
              )}

              <button
                type="submit"
                className="h-11 shrink-0 rounded-full bg-primary px-10 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {scope === "ask" ? "Ask" : "Search"}
              </button>
            </div>
          </div>
        )}
      </form>

      {!compact ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          <span className="text-xs text-muted-foreground">Frequently searched:</span>
          {SUGGESTIONS.map((suggestion) => (
            <Link
              key={suggestion}
              href={`/marketplace/search?q=${encodeURIComponent(suggestion)}`}
              onClick={() => remember(suggestion)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
