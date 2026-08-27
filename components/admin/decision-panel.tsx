"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Label, Textarea } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CheckboxRow,
  Separator,
  StatusPill,
} from "@/components/ui/primitives";
import { manufacturerRepo } from "@/lib/data";
import { documentTypeMeta } from "@/lib/schemas/document";
import { checkMeta, STATUS_LABELS } from "@/lib/schemas/verification";
import {
  OPS_DECISIONS,
  checkChangesFor,
  decisionMeta,
  decisionOutcome,
  type OpsDecisionKey,
} from "@/lib/rules/ops";
import type { Manufacturer } from "@/lib/schemas/manufacturer";
import { cn } from "@/lib/utils";

/*
  The ops decision panel.

  Every decision runs through `manufacturerRepo.setCheckStatus`, which re-derives
  the manufacturer's status from its checks. That is why the manufacturer's own
  verification tracker updates with no extra wiring, and why ops and the
  manufacturer can never see different states.

  The panel shows what a decision *will do* before it is taken — which checks
  move and what status results. On a screen where a wrong click costs a supplier
  days, stating the consequence beats making the reviewer infer it.
*/

export function DecisionPanel({
  manufacturer,
  onDecided,
}: {
  manufacturer: Manufacturer;
  onDecided?: () => void;
}) {
  const [decision, setDecision] = React.useState<OpsDecisionKey | null>(null);
  const [reason, setReason] = React.useState("");
  const [documents, setDocuments] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  const meta = decision ? decisionMeta(decision) : null;
  const changes = decision ? checkChangesFor(decision, manufacturer.checks) : [];

  const reasonMissing = Boolean(meta?.needsReason) && reason.trim().length < 4;
  const documentsMissing = Boolean(meta?.needsDocuments) && documents.length === 0;
  const blocked = !decision || reasonMissing || documentsMissing;

  function reset() {
    setDecision(null);
    setReason("");
    setDocuments([]);
  }

  async function apply() {
    if (!decision) return;
    setSubmitting(true);
    try {
      // Sequential, not parallel: each call re-derives status from the whole
      // check set, so overlapping writes would race on the derived result.
      for (const change of changes) {
        await manufacturerRepo.setCheckStatus(
          manufacturer.id,
          change.key,
          change.status,
          {
            note: reason.trim() || undefined,
            blockingDocuments: meta?.needsDocuments ? documents : undefined,
          },
        );
      }
      setDone(decisionMeta(decision).label);
      reset();
      onDecided?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-brand" aria-hidden="true" />
          Decision
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Currently{" "}
          <span className="font-medium text-foreground">
            {STATUS_LABELS[manufacturer.status]}
          </span>
          . Your decision moves the checks below.
        </p>
      </CardHeader>

      <CardBody className="space-y-4">
        {done ? (
          <Alert tone="success" title={`${done} recorded`}>
            The manufacturer&apos;s own verification tracker has already updated, and the
            change is in the platform activity feed.
          </Alert>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {OPS_DECISIONS.map((option) => {
            const selected = decision === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDecision(selected ? null : option.key);
                  setDone(null);
                }}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface hover:border-border-strong",
                )}
              >
                <span className="flex items-center gap-2">
                  <StatusPill tone={option.tone}>{option.label}</StatusPill>
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        {decision ? (
          <>
            <Separator />

            {/* What this will do, before it is done. */}
            <div className="rounded-md border border-border bg-surface-muted p-3">
              <p className="flex items-start gap-2 text-sm text-foreground">
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
                {decisionOutcome(decision)}
              </p>
              {changes.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border pt-2">
                  {changes.map((change) => (
                    <li
                      key={change.key}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {checkMeta(change.key).label}
                      </span>
                      <StatusPill
                        tone={
                          change.status === "passed"
                            ? "success"
                            : change.status === "action_needed"
                              ? "warning"
                              : "info"
                        }
                      >
                        {change.status.replace(/_/g, " ")}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nothing to change — every check is already in that state.
                </p>
              )}
            </div>

            {meta?.needsDocuments ? (
              <Field
                error={
                  documentsMissing ? "Name at least one document to replace" : undefined
                }
              >
                <Label required>Which documents are wrong?</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Only these need replacing. The manufacturer&apos;s resubmit flow asks for
                  exactly what you tick.
                </p>
                <div className="space-y-1">
                  {manufacturer.documents.map((doc) => (
                    <CheckboxRow
                      key={doc.id}
                      id={`reject-${doc.id}`}
                      label={documentTypeMeta(doc.type).label}
                      description={doc.fileName}
                      checked={documents.includes(doc.type)}
                      onCheckedChange={(checked) =>
                        setDocuments((current) =>
                          checked
                            ? [...current, doc.type]
                            : current.filter((t) => t !== doc.type),
                        )
                      }
                    />
                  ))}
                </div>
              </Field>
            ) : null}

            {meta?.needsReason ? (
              <Field error={reasonMissing ? "Give the manufacturer something to act on" : undefined}>
                <Label required>Note to the manufacturer</Label>
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="What is wrong, and what would resolve it."
                />
              </Field>
            ) : null}

            {decision === "reject" ? (
              <Alert tone="warning">
                <AlertTriangle className="inline size-3.5 align-[-2px]" aria-hidden="true" />{" "}
                The manufacturer keeps their catalogue and account. Rejection here means
                the documents need replacing, not that the application is closed.
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
              <Button
                variant={decision === "reject" ? "danger" : "primary"}
                loading={submitting}
                disabled={blocked}
                onClick={apply}
              >
                Record {decisionMeta(decision).label.toLowerCase()}
              </Button>
            </div>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
