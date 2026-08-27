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
      title="The marketplace ran into a problem"
      homeHref="/marketplace"
      homeLabel="Back to the marketplace"
    />
  );
}
