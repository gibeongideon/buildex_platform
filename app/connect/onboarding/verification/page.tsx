"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { VerificationTracker } from "@/components/shared/verification-tracker";
import { DocumentCard } from "@/components/shared/document-card";
import type { PickedFile } from "@/components/shared/file-dropzone";
import { manufacturerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { buildUploadedDocument } from "@/lib/rules/documents";
import { blockingDocumentTypes } from "@/lib/rules/onboarding";
import {
  STATUS_LABELS,
  STATUS_TONE,
  canTransact,
  type VerificationCheck,
} from "@/lib/schemas/verification";
import type { DocumentTypeKey } from "@/lib/schemas/document";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";
import { DemoScenarios } from "./demo-scenarios";

const STATUS_MESSAGE: Record<string, string> = {
  submitted:
    "Your application is queued with Buildex Operations. Checks usually start within a few hours.",
  in_review:
    "Buildex Operations is working through your checks. You will get an SMS as each one clears.",
  action_needed:
    "One or more checks need something from you before they can continue. Details are below.",
  conditionally_approved:
    "You are cleared to list products. Orders stay disabled until the outstanding check clears.",
  approved:
    "You are fully verified. You can list products and take orders from the hardware network.",
  rejected:
    "Your application was not approved. The reasons are below — you can correct them and resubmit.",
};

export default function VerificationStepPage() {
  const { ready, draft } = useStepGuard("verification");
  const { completeStep, saving } = useOnboarding();
  const manufacturerId = draft?.manufacturerId ?? null;

  const { data: manufacturer, loading } = useQuery(
    async () => (manufacturerId ? manufacturerRepo.getById(manufacturerId) : null),
    [manufacturerId],
  );

  if (!ready) return <StepSkeleton />;

  if (loading && !manufacturer) {
    return (
      <StepShell title="Verification" description="Loading your application status…">
        <Card>
          <CardBody className="space-y-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-16 w-full" />
            ))}
          </CardBody>
        </Card>
      </StepShell>
    );
  }

  if (!manufacturer) {
    return (
      <StepShell
        title="Verification"
        description="We could not find a submitted application for this session."
      >
        <Alert tone="warning" title="No application found">
          Your draft has not been submitted yet. Go back to the review step and submit it.
        </Alert>
      </StepShell>
    );
  }

  const blocking = blockingDocumentTypes(manufacturer.checks);

  async function replaceDocument(type: DocumentTypeKey, file: PickedFile) {
    await manufacturerRepo.replaceDocument(
      manufacturer!.id,
      buildUploadedDocument(type, file),
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    completeStep("verification", {}, "subscription");
  };

  return (
    <StepShell
      title="Verification in progress"
      description="Five checks run on every application. You do not have to wait here — we will SMS you as each one clears, and you can carry on setting up your account."
      onSubmit={onSubmit}
      submitting={saving}
      primaryLabel="Continue to packages"
      wide
    >
      <div className="max-w-2xl space-y-5">
        <Alert
          tone={STATUS_TONE[manufacturer.status]}
          title={
            <span className="inline-flex items-center gap-2">
              Application status
              <StatusPill tone={STATUS_TONE[manufacturer.status]}>
                {STATUS_LABELS[manufacturer.status]}
              </StatusPill>
            </span>
          }
        >
          {STATUS_MESSAGE[manufacturer.status] ?? ""}
        </Alert>

        {manufacturer.reviewNotes.length > 0 ? (
          <Alert tone="warning" title="Notes from Buildex Operations">
            <ul className="mt-1 space-y-1">
              {manufacturer.reviewNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                  {note}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Checks</CardTitle>
          </CardHeader>
          <CardBody className="py-0">
            <VerificationTracker checks={manufacturer.checks as VerificationCheck[]} />
          </CardBody>
        </Card>

        {blocking.length > 0 ? (
          <Card className="border-danger/40">
            <CardHeader>
              <CardTitle>Documents to replace</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Only the documents below need replacing. Everything else you have already
                submitted stays as it is.
              </p>
              {blocking.map((type) => (
                <DocumentCard
                  key={type}
                  type={type}
                  document={manufacturer.documents.find((d) => d.type === type)}
                  onUpload={(file) => replaceDocument(type, file)}
                  highlight
                />
              ))}
            </CardBody>
          </Card>
        ) : null}

        {!canTransact(manufacturer.status) ? (
          <p className="text-sm text-muted-foreground">
            You can keep going while checks run. Products you add now stay as drafts and go
            live automatically the moment verification completes.
          </p>
        ) : null}

        <Card>
          <CardHeader className="flex items-center gap-2">
            <FlaskConical className="size-4 text-subtle-foreground" aria-hidden="true" />
            <CardTitle>Demo scenarios</CardTitle>
          </CardHeader>
          <CardBody>
            <DemoScenarios manufacturerId={manufacturer.id} checks={manufacturer.checks} />
          </CardBody>
        </Card>
      </div>
    </StepShell>
  );
}
