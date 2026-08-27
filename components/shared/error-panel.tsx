"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  What a reader sees when a screen fails to render.

  Shared by every `error.tsx` boundary so the recovery is the same wherever it
  happens, and so the reassurance is accurate in one place: this prototype keeps
  its data in the browser and every screen only reads, so a crash cannot have
  destroyed anything. That is worth saying — the instinct after an error page is
  to assume work was lost.

  The digest is shown when Next provides one. In production the real message is
  stripped from the client bundle deliberately, and the digest is the only thing
  that ties what the reader saw to what the server logged.
*/

export function ErrorPanel({
  error,
  reset,
  title = "This screen ran into a problem",
  homeHref = "/",
  homeLabel = "Go to the home page",
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>

      <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing was lost — this prototype keeps its data in your browser, and this screen
        only reads it. Trying again usually works.
      </p>

      {error.digest ? (
        <p className="mt-3 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs text-muted-foreground text-numeric">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {reset ? (
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        ) : null}
        <Button variant="secondary" asChild>
          <Link href={homeHref}>
            <Home aria-hidden="true" />
            {homeLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
