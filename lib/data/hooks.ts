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

type Settled<T> = { key: string; data?: T; error?: Error };

/**
 * Runs an async repository call, and re-runs it whenever its dependencies or
 * the underlying data change.
 *
 * `loading` is derived rather than stored: a result is stale exactly when the
 * key it settled against is no longer the current key. That gives
 * stale-while-revalidate for free — previous data stays on screen through a
 * refetch instead of blanking — and keeps the effect free of synchronous
 * setState.
 *
 * `deps` are stringified to build the key, so pass primitives (ids, flags),
 * which is all any caller needs.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const version = useSyncExternalStore(
    subscribeToData,
    getDataVersion,
    () => 0, // server render: version is always zero
  );

  const key = `${version}::${deps.map((dep) => String(dep)).join("|")}`;
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetcher().then(
      (data) => {
        if (!cancelled) setSettled({ key, data });
      },
      (error: unknown) => {
        if (!cancelled) {
          setSettled({
            key,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded — callers pass an inline closure whose
    // identity changes every render. `key` encodes the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: settled?.data,
    error: settled?.key === key ? settled.error : undefined,
    loading: settled?.key !== key,
  };
}
