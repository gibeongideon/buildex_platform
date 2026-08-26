"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import { Alert, Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/shared/document-card";
import type { PickedFile } from "@/components/shared/file-dropzone";
import {
  DOCUMENT_TYPES,
  documentTypeMeta,
  type DocumentTypeKey,
} from "@/lib/schemas/document";
import { buildUploadedDocument } from "@/lib/rules/documents";
import { outstandingDocuments } from "@/lib/rules/onboarding";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "../step-frame";

const REQUIRED = DOCUMENT_TYPES.filter((d) => d.required);
const OPTIONAL = DOCUMENT_TYPES.filter((d) => !d.required);

export default function DocumentsStepPage() {
  const { ready, draft } = useStepGuard("documents");
  const { save, completeStep, saving } = useOnboarding();

  if (!ready || !draft) return <StepSkeleton />;

  const documents = draft.documents;

  // Both use the functional patch form so that uploading several documents in
  // quick succession composes rather than each overwriting the last.
  async function upload(
    type: DocumentTypeKey,
    file: PickedFile,
    options: { expired?: boolean } = {},
  ) {
    const uploaded = buildUploadedDocument(type, file, options);
    await save((current) => ({
      documents: [...current.documents.filter((d) => d.type !== type), uploaded],
    }));
  }

  async function removeDocument(type: DocumentTypeKey) {
    await save((current) => ({
      documents: current.documents.filter((d) => d.type !== type),
    }));
  }

  const missing = outstandingDocuments(documents);
  const uploadedCount = REQUIRED.length - missing.length;
  const complete = missing.length === 0;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete) return;
    completeStep("documents", {}, "review");
  };

  return (
    <StepShell
      title="Upload your documents"
      description="Buildex Operations reviews these against BRS, KRA and IPRS records. Clear scans or phone photos are fine, as long as every field is legible."
      back="directors"
      onSubmit={onSubmit}
      submitting={saving}
      primaryDisabled={!complete}
      primaryLabel="Continue to review"
    >
      <div className="space-y-5">
        <Alert
          tone={complete ? "success" : "info"}
          title={
            complete
              ? "All required documents uploaded"
              : `${uploadedCount} of ${REQUIRED.length} required documents uploaded`
          }
        >
          {complete
            ? "You can review and submit your application on the next step."
            : `Still needed: ${missing.map((type) => documentTypeMeta(type).label).join(", ")}.`}
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Required documents</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {REQUIRED.map((meta) => (
              <DocumentCard
                key={meta.key}
                type={meta.key}
                document={documents.find((d) => d.type === meta.key)}
                onUpload={(file) => upload(meta.key, file)}
                onRemove={() => removeDocument(meta.key)}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional — speeds up review</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {OPTIONAL.map((meta) => (
              <DocumentCard
                key={meta.key}
                type={meta.key}
                document={documents.find((d) => d.type === meta.key)}
                onUpload={(file) => upload(meta.key, file)}
                onRemove={() => removeDocument(meta.key)}
              />
            ))}
            <p className="text-xs text-muted-foreground">
              A current KEBS Standardisation Mark means a regulator has already inspected your
              plant, so Buildex will not schedule its own site visit.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <FlaskConical className="size-4 text-subtle-foreground" aria-hidden="true" />
            <CardTitle>Demo scenario</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Upload a Tax Compliance Certificate that has already lapsed, to walk the
              expired-document path through verification and resubmission.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                upload(
                  "tax_compliance_certificate",
                  {
                    name: "tcc-2023-expired.pdf",
                    size: 284_000,
                    type: "application/pdf",
                  },
                  { expired: true },
                )
              }
            >
              Upload an expired certificate
            </Button>
          </CardBody>
        </Card>
      </div>
    </StepShell>
  );
}
