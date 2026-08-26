"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getDataVersion, subscribeToData } from "@/lib/data";

/*
  React bindings over the repository seam.

  Components use these instead of calling repositories directly so that every
  data-backed surface gets the same three states — loading, error, empty —
  without each screen inventing its own.
*/

export type QueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
};

/**
 * Runs an async repository call, and re-runs it whenever the underlying data
 * changes. Previous data is kept while refetching so mutations don't blank the
 * screen — the same stale-while-revalidate behaviour a real data client gives.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const version = useSyncExternalStore(
    subscribeToData,
    getDataVersion,
    () => 0, // server render: version is always zero
  );

  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: undefined }));

    fetcher().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: undefined });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      },
    );

    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded — callers pass an inline closure, so
    // its identity changes every render. `deps` is the real dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return state;
}

/**
 * True once the component has mounted on the client.
 *
 * The mock store reads localStorage, which does not exist during SSR. Views
 * backed by it render their skeleton on the server and their real content
 * after mount, which avoids hydration mismatches without disabling SSR.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
