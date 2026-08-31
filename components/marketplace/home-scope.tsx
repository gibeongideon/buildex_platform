"use client";

import * as React from "react";

/*
  Which surface the marketplace home is showing.

  The reference marketplace's tabs are an in-place switch, not navigation: on the
  home page, choosing "Manufacturers" changes the search field and the content
  underneath it without leaving. That is the behaviour worth copying — a buyer
  deciding *what kind of thing* they want has not yet committed to a search, so
  sending them to a different page for the answer is premature.

  The hero lives in the marketplace layout and the panels live in the home page,
  so the choice has to be shared. This context is that share, and it exists only
  on the home page: everywhere else the tabs stay route-derived navigation,
  because there the active surface genuinely *is* the current page and deriving
  it from the URL is what keeps it correct on a deep link.
*/

export type SearchScope =
  | "ask"
  | "products"
  | "manufacturers"
  | "regions"
  | "services";

type HomeScopeValue = {
  scope: SearchScope;
  setScope: (next: SearchScope) => void;
};

const HomeScopeContext = React.createContext<HomeScopeValue | null>(null);

/**
 * Provides the in-place scope, but only where it should exist.
 *
 * `enabled` is a prop rather than the caller wrapping conditionally because the
 * marketplace layout renders one tree for every route: off the home page the
 * context must be absent, so that `SearchScopeTabs` falls back to navigating.
 */
export function HomeScopeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [scope, setScope] = React.useState<SearchScope>("products");
  const value = React.useMemo(() => ({ scope, setScope }), [scope]);
  if (!enabled) return <>{children}</>;
  return <HomeScopeContext.Provider value={value}>{children}</HomeScopeContext.Provider>;
}

/**
 * The home page's selected scope, or null when not on the home page.
 *
 * Returning null rather than a default is deliberate: callers need to know
 * whether an in-place switch is available at all, since off the home page the
 * tabs must navigate instead.
 */
export function useHomeScope() {
  return React.useContext(HomeScopeContext);
}
