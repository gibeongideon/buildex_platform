"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/primitives";
import type { ManufacturerStatus } from "@/lib/schemas/verification";

/*
  What used to be the demo scenario buttons.

  Until Buildex Admin existed, verification could only advance from this screen,
  so a presenter needed buttons here to push the pipeline along. Now a real ops
  actor makes those decisions in the console, and leaving the buttons would mean
  two ways to move the same records — the kind of duplication that ends with the
  two disagreeing.

  What stays is a signpost. In a real deployment a manufacturer would never see a
  link into the reviewer; here the same person plays both sides, so the card says
  plainly that it is a prototype shortcut.
*/

const WAITING: ManufacturerStatus[] = ["submitted", "in_review", "conditionally_approved"];

export function OpsReviewNote({
  manufacturerId,
  status,
}: {
  manufacturerId: string;
  status: ManufacturerStatus;
}) {
  const waiting = WAITING.includes(status);

  return (
    <Card className="border-dashed">
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-subtle-foreground" aria-hidden="true" />
            {waiting
              ? "Buildex Operations decides from here"
              : "Reviewed by Buildex Operations"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {waiting
              ? "Checks advance when a reviewer acts on this application in the internal console. Nothing on this page can move them."
              : "This application has already been decided in the internal console."}{" "}
            <span className="text-subtle-foreground">
              Prototype shortcut: the console has no authentication, so you can open it
              directly.
            </span>
          </p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" asChild>
          <Link href={`/admin/verification/${manufacturerId}`}>
            Open the reviewer
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardBody>
    </Card>
  );
}
