"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

/*
  The catch-all boundary. Route groups have their own, so this only runs for
  anything outside them — and as the backstop if a group boundary itself throws.
*/

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel error={error} reset={reset} />;
}
