"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  The marketplace search hero.

  Large B2B marketplaces put a big centred tab row over an oversized search
  field, because the first decision a buyer makes is *what kind of thing* they
  are looking for — a product, a supplier, or a place to buy from — and the
  second is the search term itself.

  The reference site's tabs are AI Mode / Products / Manufacturers / Worldwide.
  Ours are Ask AI / Products / Manufacturers / Regions — "Worldwide" becomes
  "Regions" because Buildex trades inside one country, where the useful question
  is which region a supplier delivers to.

  Ask AI takes a requirement in plain language. It is a deterministic matcher
  over the catalogue's own vocabulary rather than a language model, and the page
  says so — it shows exactly what it recognised, so the buyer can see why they
  got the results they did.
*/

export type SearchScope = "ask" | "products" | "manufacturers" | "regions";

const TABS: { value: SearchScope; label: string; hint: string }[] = [
  {
    value: "ask",
    label: "Ask AI",
    hint: "Describe what you need — “400 bags of cement to Machakos”…",
  },
  { value: "products", label: "Products", hint: "Search cement, rebar, tiles, cable…" },
  {
    value: "manufacturers",
    label: "Manufacturers",
    hint: "Search suppliers by name, county or category…",
  },
  { value: "regions", label: "Regions", hint: "Find suppliers who deliver to…" },
];

const SUGGESTIONS = [
  "OPC 32.5N cement",
  "D12 rebar",
  "IBR roofing sheet",
  "Marine plywood",
  "Vinyl silk emulsion",
  "Twin & earth cable",
];

export function SearchHero({
  defaultScope = "products",
  defaultQuery = "",
  compact = false,
}: {
  defaultScope?: SearchScope;
  defaultQuery?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [scope, setScope] = React.useState<SearchScope>(defaultScope);
  const [query, setQuery] = React.useState(defaultQuery);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (scope === "ask") {
      router.push(`/marketplace/ask${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      return;
    }
    if (scope === "manufacturers") {
      router.push(`/marketplace/manufacturers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      return;
    }
    if (scope === "regions") {
      router.push(`/marketplace/regions${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      return;
    }
    router.push(`/marketplace/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  const active = TABS.find((t) => t.value === scope) ?? TABS[0];

  return (
    <div className={cn("mx-auto w-full max-w-3xl", compact ? "py-4" : "py-8 sm:py-12")}>
      {!compact ? (
        <div
          role="tablist"
          aria-label="What are you searching for"
          // Three tabs at display weight do not fit 375px at the desktop gap,
          // so the gap and type size both step down on the smallest screens.
          className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2 sm:gap-x-8"
        >
          {TABS.map((tab) => {
            const isActive = tab.value === scope;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setScope(tab.value)}
                className={cn(
                  "relative pb-2 font-display font-bold tracking-tight transition-colors",
                  "text-base sm:text-xl",
                  isActive
                    ? "text-brand dark:text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.value === "ask" ? (
                  <Sparkles
                    className={cn(
                      "mr-1 inline-block size-4 align-[-2px]",
                      isActive ? "text-primary" : "text-subtle-foreground",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
                {tab.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-primary"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <form onSubmit={submit} className={cn(compact ? "" : "mt-6")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border-2 border-brand bg-surface p-1.5 shadow-sm",
            "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background",
            compact ? "pl-4" : "pl-5",
          )}
        >
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={active.hint}
            aria-label={active.hint}
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent text-foreground placeholder:text-subtle-foreground focus:outline-none",
              compact ? "h-9 text-sm" : "h-12 text-base",
            )}
          />
          <button
            type="submit"
            className={cn(
              "shrink-0 rounded-full bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary-hover",
              compact ? "h-9 px-5 text-sm" : "h-12 px-8 text-base",
            )}
          >
            {scope === "ask" ? "Ask" : "Search"}
          </button>
        </div>
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
