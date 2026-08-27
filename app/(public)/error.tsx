"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

/*
  Scoped to this route group, so a failure in one screen keeps the surrounding
  chrome and the reader stays oriented instead of being dropped onto a bare page.
*/

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      error={error}
      reset={reset}
      title="This page ran into a problem"
      homeHref="/"
      homeLabel="Go to the home page"
    />
  );
}
