"use client";

import * as React from "react";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill, type Tone } from "@/components/ui/primitives";
import {
  documentTypeMeta,
  formatFileSize,
  type DocumentStatus,
  type DocumentTypeKey,
  type UploadedDocument,
} from "@/lib/schemas/document";
import { FileDropzone, type PickedFile } from "./file-dropzone";

const STATUS_META: Record<DocumentStatus, { label: string; tone: Tone }> = {
  missing: { label: "Not uploaded", tone: "neutral" },
  uploaded: { label: "Awaiting review", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  expired: { label: "Expired", tone: "danger" },
};

/** A document is effectively expired the moment its date passes, whatever the stored status says. */
function effectiveStatus(doc: UploadedDocument | undefined): DocumentStatus {
  if (!doc) return "missing";
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return "expired";
  return doc.status;
}

export function DocumentCard({
  type,
  document,
  onUpload,
  onRemove,
  highlight = false,
}: {
  type: DocumentTypeKey;
  document?: UploadedDocument;
  onUpload: (file: PickedFile) => void;
  onRemove?: () => void;
  /** Set when a failing verification check is blocked on this document. */
  highlight?: boolean;
}) {
  const meta = documentTypeMeta(type);
  const status = effectiveStatus(document);
  const statusMeta = STATUS_META[status];
  const needsAttention = status === "rejected" || status === "expired";
  const [replacing, setReplacing] = React.useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-colors",
        highlight || needsAttention ? "border-danger/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
              status === "accepted"
                ? "border-success/25 bg-success-soft text-success"
                : needsAttention
                  ? "border-danger/25 bg-danger-soft text-danger"
                  : "border-border bg-surface-muted text-subtle-foreground",
            )}
          >
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {meta.label}
              {!meta.required ? (
                <span className="ml-2 text-xs font-normal text-subtle-foreground">
                  Optional
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
      </div>

      {document && !replacing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{document.fileName}</p>
            <p className="text-xs text-muted-foreground text-numeric">
              {formatFileSize(document.fileSize)} · Uploaded {formatDate(document.uploadedAt)}
              {document.expiresAt ? (
                <>
                  {" · "}
                  <span className={cn(status === "expired" && "text-danger")}>
                    {status === "expired" ? "Expired" : "Valid until"}{" "}
                    {formatDate(document.expiresAt)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
              <RotateCcw aria-hidden="true" />
              Replace
            </Button>
            {onRemove ? (
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 aria-hidden="true" />
                <span className="sr-only">Remove {meta.label}</span>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <FileDropzone
            compact
            label={document ? `Replace ${meta.label}` : `Upload ${meta.label}`}
            onFile={(file) => {
              onUpload(file);
              setReplacing(false);
            }}
          />
          {replacing ? (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setReplacing(false)}
            >
              Cancel replacement
            </Button>
          ) : null}
        </div>
      )}

      {document?.reviewNote && needsAttention ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {document.reviewNote}
        </p>
      ) : null}
    </div>
  );
}
