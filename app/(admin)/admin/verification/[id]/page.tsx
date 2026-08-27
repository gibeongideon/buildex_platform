"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Building2, ExternalLink, FileText, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DetailRow } from "@/components/shared/format";
import { VerificationTracker } from "@/components/shared/verification-tracker";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { manufacturerRepo, productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { capacityBandLabel, regionForCounty } from "@/lib/schemas/common";
import { documentTypeMeta, isDocumentExpired } from "@/lib/schemas/document";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/schemas/verification";
import { formatDate, formatRelative } from "@/lib/utils";
import { BackLink } from "@/components/shared/back-link";

/*
  One application, reviewed.

  The layout puts what ops needs to *check* on the left — the declared company,
  its directors, the documents — and what they need to *do* on the right. The
  reviewer's question is "does the paperwork support the claim", so the claim and
  the paperwork sit together rather than on separate tabs.

  Documents show their extracted fields beside them. Nothing here uploads or
  renders a real file: the mockup records name, size and type only, so the panel
  shows what a reviewer would compare rather than pretending to a viewer.
*/

export default function VerificationReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: manufacturer, loading, error, refetch } = useQuery(
    () => manufacturerRepo.getById(id),
    [id],
  );
  const { data: products } = useQuery(
    () => productRepo.listByManufacturer(id),
    [id],
  );

  if (loading && !manufacturer) {
    return (
      <>
        <PageHeader title="Review application" />
        <Skeleton className="h-96" />
      </>
    );
  }

  if (!manufacturer) {
    return (
      <>
        <PageHeader title="Review application" />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<FileText className="size-5" />}
              title="Application not found"
              description="It may have been removed."
              action={
                <Button asChild>
                  <Link href="/admin/verification">Back to the queue</Link>
                </Button>
              }
            />

        <QueryError error={error} onRetry={refetch} />
          </CardBody>
        </Card>
      </>
    );
  }

  const shareholding = manufacturer.directors.reduce(
    (sum, d) => sum + d.ownershipPercent,
    0,
  );
  const drafts = (products ?? []).filter((p) => p.status === "draft").length;

  return (
    <>
      <PageHeader
        title={manufacturer.tradingName}
        description={`${manufacturer.legalName} · ${manufacturer.county}, ${regionForCounty(manufacturer.county)}`}
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Verification", href: "/admin/verification" },
          { label: manufacturer.tradingName },
        ]}
        actions={
          <>
            <StatusPill tone={STATUS_TONE[manufacturer.status]}>
              {STATUS_LABELS[manufacturer.status]}
            </StatusPill>
            <Button variant="secondary" asChild>
              <Link href={`/admin/manufacturers/${manufacturer.id}`}>
                <Store aria-hidden="true" />
                Full record
              </Link>
            </Button>
          </>
        }
      />

      <BackLink href="/admin/verification" className="mb-4">
        Verification queue
      </BackLink>

      {drafts > 0 ? (
        <Alert tone="info" className="mb-6" title={`${drafts} listing${drafts === 1 ? "" : "s"} waiting on you`}>
          This manufacturer has already built a catalogue. Those listings publish the
          moment their checks clear — approving here makes them live immediately.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-brand" aria-hidden="true" />
                Declared company
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                What the applicant says. The checks confirm it against BRS and KRA.
              </p>
            </CardHeader>
            <CardBody>
              <dl className="divide-y divide-border">
                <DetailRow label="Registered legal name" value={manufacturer.legalName} />
                <DetailRow label="Trading name" value={manufacturer.tradingName} />
                <DetailRow label="BRS number" value={manufacturer.brsNumber} />
                <DetailRow label="KRA PIN" value={manufacturer.kraPin} />
                <DetailRow label="Year established" value={manufacturer.yearEstablished} />
                <DetailRow label="Physical address" value={manufacturer.physicalAddress} />
                <DetailRow
                  label="Production capacity"
                  value={capacityBandLabel(manufacturer.capacityBand)}
                />
                <DetailRow label="Categories" value={manufacturer.categories.join(", ")} />
                <DetailRow
                  label="Distribution regions"
                  value={manufacturer.distributionRegions.join(", ")}
                />
                <DetailRow
                  label="Submitted"
                  value={
                    manufacturer.submittedAt
                      ? `${formatDate(manufacturer.submittedAt)} · ${formatRelative(manufacturer.submittedAt)}`
                      : "—"
                  }
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-brand" aria-hidden="true" />
                Directors ({manufacturer.directors.length})
              </CardTitle>
              {/*
                Shareholding that does not reconcile to 100% is the commonest
                signal of a fabricated structure, so it is stated rather than
                left for the reviewer to add up.
              */}
              <StatusPill tone={Math.round(shareholding) === 100 ? "success" : "danger"}>
                {shareholding}% declared
              </StatusPill>
            </CardHeader>
            <CardBody className="p-0">
              <div className="scroll-x">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-5 py-2.5 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        National ID
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium text-muted-foreground">
                        Ownership
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manufacturer.directors.map((director) => (
                      <tr key={director.id}>
                        <td className="px-5 py-2.5 font-medium text-foreground">
                          {director.fullName}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-numeric">
                          {director.nationalId}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {director.role}
                        </td>
                        <td className="px-5 py-2.5 text-right text-foreground text-numeric">
                          {director.ownershipPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-brand" aria-hidden="true" />
                KYB documents ({manufacturer.documents.length})
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {manufacturer.documents.map((doc) => {
                  const expired = isDocumentExpired(doc);
                  return (
                    <li key={doc.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground">
                        <FileText className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {documentTypeMeta(doc.type).label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground text-numeric">
                          {doc.fileName} · {Math.round(doc.fileSize / 1024)} KB · uploaded{" "}
                          {formatRelative(doc.uploadedAt)}
                        </p>
                        {doc.reviewNote ? (
                          <p className="mt-1 text-xs text-warning">{doc.reviewNote}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusPill
                          tone={
                            expired || doc.status === "rejected"
                              ? "danger"
                              : doc.status === "accepted"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {expired ? "Expired" : doc.status}
                        </StatusPill>
                        {doc.expiresAt ? (
                          <span className="text-xs text-muted-foreground">
                            {expired ? "Expired" : "Valid to"} {formatDate(doc.expiresAt)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                The prototype records file name, size and type only — it does not store
                the file, so there is nothing to open. A real reviewer would see the
                document beside these fields.
              </p>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <DecisionPanel manufacturer={manufacturer} />

          <Card>
            <CardHeader>
              <CardTitle>Check pipeline</CardTitle>
            </CardHeader>
            <CardBody>
              <VerificationTracker checks={manufacturer.checks} />
            </CardBody>
          </Card>

          {manufacturer.reviewNotes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Review history</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  {manufacturer.reviewNotes.map((note) => (
                    <li
                      key={note}
                      className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle
                        className="mt-0.5 size-3.5 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      {note}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <p className="text-sm text-muted-foreground">
                What the manufacturer sees while you decide:
              </p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
                <Link href="/connect/verification">
                  <ExternalLink aria-hidden="true" />
                  Their verification tracker
                </Link>
              </Button>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
