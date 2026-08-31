"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Skeleton } from "@/components/ui/primitives";

/*
  Common frame for a wizard step: heading, a single card of content, and one
  row of actions. Keeping the frame in one place is what stops the steps
  drifting apart in spacing, button order and back-link behaviour.

  Shared by both wizards in the product — manufacturer onboarding and customer
  registration. It used to live inside the onboarding folder and take a typed
  `OnboardingStepId` for its back link, which is the one thing that stopped the
  customer wizard using it. `backHref` is a plain string instead, so the frame
  no longer needs to know which wizard it is framing.
*/

export function StepShell({
  title,
  description,
  children,
  backHref,
  primaryLabel = "Continue",
  primaryDisabled,
  submitting,
  onSubmit,
  aside,
  wide = false,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  submitting?: boolean;
  /** Omit to render content without a form (status-only steps). */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  aside?: React.ReactNode;
  wide?: boolean;
}) {
  const content = (
    <>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>

      {children}

      {onSubmit ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          {backHref ? (
            <Button variant="ghost" size="md" asChild>
              <Link href={backHref}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" loading={submitting} disabled={primaryDisabled}>
            {primaryLabel}
            {!submitting ? <ArrowRight aria-hidden="true" /> : null}
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={wide ? "" : "max-w-2xl"}>
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate>
          {content}
        </form>
      ) : (
        content
      )}
      {aside ? <div className="mt-6">{aside}</div> : null}
    </div>
  );
}

/** Matches the height of a typical step so the rail doesn't jump on load. */
export function StepSkeleton() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-2 h-4 w-96" />
      <Card className="mt-6">
        <CardBody className="space-y-5">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
