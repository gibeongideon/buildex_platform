"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/lib/schemas/common";

/*
  The marketplace search hero and its scope tabs.

  Large B2B marketplaces put a tab row over an oversized search field, because
  the first decision a buyer makes is *what kind of thing* they are looking for
  — a product, a supplier, a place to buy from — and the second is the term.

  The reference site's tabs are AI Mode / Products / Manufacturers / Worldwide.
  Ours are Ask AI / Products / Manufacturers / Regions — "Worldwide" becomes
  "Regions" because Buildex trades inside one country, where the useful question
  is which region a supplier delivers to.

  The tabs are navigation, not just a mode switch on a form: clicking one goes
  to that surface and carries any query with it, and the active tab is derived
  from the current route rather than local state. That means the tabs stay
  correct on a page you arrived at by any other route — a deep link, the mega
  menu, a card — which local state could not guarantee.
*/

export type SearchScope = "ask" | "products" | "manufacturers" | "regions";

const TABS: { value: SearchScope; label: string; href: string; hint: string }[] = [
  {
    value: "ask",
    label: "Ask AI",
    href: "/marketplace/ask",
    hint: "Describe what you need — “400 bags of cement to Machakos”…",
  },
  {
    value: "products",
    label: "Products",
    href: "/marketplace/search",
    hint: "Search cement, rebar, tiles, cable…",
  },
  {
    value: "manufacturers",
    label: "Manufacturers",
    href: "/marketplace/manufacturers",
    hint: "Search suppliers by name, county or category…",
  },
  {
    value: "regions",
    label: "Regions",
    href: "/marketplace/regions",
    hint: "Find suppliers who deliver to…",
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
  const active = scopeForPath(pathname);

  // Read the live query at click time rather than during render: it keeps the
  // buyer's term when they switch surface, without pulling `useSearchParams`
  // into a layout and forcing the whole tree out of static rendering.
  function go(scope: SearchScope) {
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
  // Scope follows the route, so submitting from the collapsed header or the nav
  // bar keeps you on the surface you are already looking at.
  const scope = scopeForPath(pathname);
  const [query, setQuery] = React.useState(defaultQuery);
  const [category, setCategory] = React.useState("");

  const active = TABS.find((t) => t.value === scope) ?? TABS[1];

  function submit(event: React.FormEvent) {
    event.preventDefault();
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
                  {scope === "ask"
                    ? "Plain language — quantity, material, destination"
                    : scope === "manufacturers"
                      ? "Search verified suppliers"
                      : "Find who delivers where you build"}
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
