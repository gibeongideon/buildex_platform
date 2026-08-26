"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
import { DetailRow } from "@/components/shared/format";
import { DemoScenarios } from "@/app/connect/onboarding/verification/demo-scenarios";
import { manufacturerRepo } from "@/lib/data";
import { blockingDocumentTypes } from "@/lib/rules/onboarding";
import { DOCUMENT_TYPES, type DocumentTypeKey } from "@/lib/schemas/document";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/schemas/verification";
import { formatDate, makeId } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";

export default function VerificationPage() {
  const { data, loading } = useCurrentManufacturer();

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Verification" />
        <Skeleton className="h-96" />
      </>
    );
  }

  if (!data) return null;
  const { manufacturer } = data;
  const blocking = blockingDocumentTypes(manufacturer.checks);

  async function replaceDocument(type: DocumentTypeKey, file: PickedFile) {
    await manufacturerRepo.replaceDocument(manufacturer.id, {
      id: makeId("doc"),
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
      expiresAt:
        type === "tax_compliance_certificate"
          ? new Date(Date.now() + 365 * 86_400_000).toISOString()
          : null,
      reviewNote: null,
    });
  }

  return (
    <>
      <PageHeader
        title="Verification"
        description="Where your application stands with Buildex Operations, and anything outstanding from you."
        breadcrumbs={[{ label: "Connect", href: "/connect/dashboard" }, { label: "Verification" }]}
        actions={
          <StatusPill tone={STATUS_TONE[manufacturer.status]}>
            {STATUS_LABELS[manufacturer.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {manufacturer.reviewNotes.length > 0 ? (
            <Alert tone="warning" title="Notes from Buildex Operations">
              <ul className="mt-1 space-y-1">
                {manufacturer.reviewNotes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-current"
                    />
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
              <VerificationTracker checks={manufacturer.checks} />
            </CardBody>
          </Card>

          {blocking.length > 0 ? (
            <Card className="border-danger/40">
              <CardHeader>
                <CardTitle>Documents to replace</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
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

          <Card>
            <CardHeader>
              <CardTitle>Submitted documents</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {DOCUMENT_TYPES.map((meta) => (
                <DocumentCard
                  key={meta.key}
                  type={meta.key}
                  document={manufacturer.documents.find((d) => d.type === meta.key)}
                  onUpload={(file) => replaceDocument(meta.key, file)}
                />
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="divide-y divide-border">
                <DetailRow label="Legal name" value={manufacturer.legalName} />
                <DetailRow label="BRS number" value={manufacturer.brsNumber} />
                <DetailRow label="KRA PIN" value={manufacturer.kraPin} />
                <DetailRow label="County" value={manufacturer.county} />
                <DetailRow
                  label="Submitted"
                  value={manufacturer.submittedAt ? formatDate(manufacturer.submittedAt) : "—"}
                />
                <DetailRow
                  label="Verified"
                  value={manufacturer.verifiedAt ? formatDate(manufacturer.verifiedAt) : "—"}
                />
                <DetailRow
                  label="Directors"
                  value={`${manufacturer.directors.length} listed`}
                />
              </dl>
            </CardBody>
          </Card>

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
      </div>
    </>
  );
}
