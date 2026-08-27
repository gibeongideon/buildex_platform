"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

/*
  Covers both the onboarding wizard and the manufacturer portal. A failure
  mid-onboarding is the one worth reassuring about: the draft is saved on every
  step, so "try again" resumes rather than restarts.
*/

export default function ConnectError({
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
      title="Buildex Connect ran into a problem"
      homeHref="/connect/dashboard"
      homeLabel="Back to your dashboard"
    />
  );
}
