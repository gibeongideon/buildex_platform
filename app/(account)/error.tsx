"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

/*
  Covers registration and the account area. A failure mid-registration is the
  one worth reassuring about: the draft is saved on every step, so "try again"
  resumes rather than restarts.
*/

export default function AccountError({
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
      title="Your account ran into a problem"
      homeHref="/marketplace"
      homeLabel="Back to the marketplace"
    />
  );
}
