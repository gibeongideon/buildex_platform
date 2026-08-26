"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  StatusPill,
} from "@/components/ui/primitives";
import { DetailRow } from "@/components/shared/format";
import { capacityBandLabel, regionForCounty } from "@/lib/schemas/common";
import { documentTypeMeta } from "@/lib/schemas/document";
import { requiresSiteVisit, hasKebsPermit } from "@/lib/rules/onboarding";
import { manufacturerRepo } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { stepHref } from "../steps";
import { StepShell, StepSkeleton } from "../step-frame";

function SectionCard({
  title,
  editStep,
  children,
}: {
  title: string;
  editStep: Parameters<typeof stepHref>[0];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Link
          href={stepHref(editStep)}
          className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="size-3" aria-hidden="true" />
          Edit
        </Link>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default function ReviewStepPage() {
  const { ready, draft } = useStepGuard("review");
  const { save } = useOnboarding();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!ready || !draft?.company || !draft.account) return <StepSkeleton />;

  const { company, account, directors, documents } = draft;
  const siteVisitLikely = requiresSiteVisit({
    yearEstablished: company.yearEstablished,
    capacityBand: company.capacityBand,
    hasKebsPermit: hasKebsPermit(documents),
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const manufacturer = await manufacturerRepo.createFromDraft(draft!);
      await save({
        manufacturerId: manufacturer.id,
        completedSteps: ["review"],
        currentStep: "verification",
      });
      router.push(stepHref("verification"));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <StepShell
      title="Review and submit"
      description="Check everything below before it goes to Buildex Operations. You can still edit any section — once submitted, changes need to go through your account manager."
      back="documents"
      onSubmit={onSubmit}
      submitting={submitting}
      primaryLabel="Submit application"
    >
      <div className="space-y-5">
        {error ? <Alert tone="danger" title="Could not submit">{error}</Alert> : null}

        <SectionCard title="Account contact" editStep="account">
          <dl className="divide-y divide-border">
            <DetailRow label="Full name" value={account.contactName} />
            <DetailRow label="Work email" value={account.email} />
            <DetailRow
              label="Mobile number"
              value={
                <span className="inline-flex items-center gap-2">
                  {account.phone}
                  {draft.phoneVerified ? (
                    <StatusPill tone="success">Verified</StatusPill>
                  ) : null}
                </span>
              }
            />
          </dl>
        </SectionCard>

        <SectionCard title="Company" editStep="company">
          <dl className="divide-y divide-border">
            <DetailRow label="Registered legal name" value={company.legalName} />
            <DetailRow label="Trading name" value={company.tradingName} />
            <DetailRow label="BRS number" value={company.brsNumber} />
            <DetailRow label="KRA PIN" value={company.kraPin} />
            <DetailRow label="Year established" value={company.yearEstablished} />
            <DetailRow label="Physical address" value={company.physicalAddress} />
            <DetailRow
              label="County"
              value={`${company.county} — ${regionForCounty(company.county) ?? ""}`}
            />
            <DetailRow label="Website" value={company.website} />
            <DetailRow label="Categories" value={company.categories.join(", ")} />
            <DetailRow
              label="Production capacity"
              value={capacityBandLabel(company.capacityBand)}
            />
            <DetailRow
              label="Distribution regions"
              value={company.distributionRegions.join(", ")}
            />
          </dl>
        </SectionCard>

        <SectionCard title={`Directors (${directors.length})`} editStep="directors">
          <div className="scroll-x">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 font-medium text-muted-foreground">National ID</th>
                  <th className="pb-2 font-medium text-muted-foreground">Role</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">
                    Ownership
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {directors.map((director) => (
                  <tr key={director.id}>
                    <td className="py-2.5 font-medium text-foreground">
                      {director.fullName}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{director.nationalId}</td>
                    <td className="py-2.5 text-muted-foreground">{director.role}</td>
                    <td className="py-2.5 text-right text-foreground">
                      {director.ownershipPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title={`Documents (${documents.length})`} editStep="documents">
          <dl className="divide-y divide-border">
            {documents.map((document) => (
              <DetailRow
                key={document.id}
                label={documentTypeMeta(document.type).label}
                value={
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <span className="text-muted-foreground">{document.fileName}</span>
                    {document.expiresAt ? (
                      <StatusPill
                        tone={
                          new Date(document.expiresAt).getTime() < Date.now()
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {new Date(document.expiresAt).getTime() < Date.now()
                          ? "Expired"
                          : `Valid to ${formatDate(document.expiresAt)}`}
                      </StatusPill>
                    ) : null}
                  </span>
                }
              />
            ))}
          </dl>
        </SectionCard>

        <Alert
          tone={siteVisitLikely ? "warning" : "info"}
          title={
            siteVisitLikely
              ? "A physical site visit will be scheduled"
              : "What happens after you submit"
          }
        >
          {siteVisitLikely ? (
            <>
              Your company was registered recently or declares a smaller production capacity,
              so Buildex will arrange a plant inspection as part of enhanced due diligence. You
              will be able to list products while that is outstanding, but orders stay disabled
              until the visit clears.
            </>
          ) : (
            <>
              Buildex Operations verifies your documents, then checks your registration against
              BRS, your PIN against KRA and each director against IPRS. You can track every
              check live on the next screen.
            </>
          )}
        </Alert>
      </div>
    </StepShell>
  );
}
