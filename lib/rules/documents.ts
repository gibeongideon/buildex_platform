import { makeId } from "@/lib/utils";
import {
  documentTypeMeta,
  type DocumentTypeKey,
  type UploadedDocument,
} from "@/lib/schemas/document";

/*
  Turning a picked file into a document record.

  Module scope, not a closure inside a component: it reads the clock, and an
  impure call in a component body is a real hazard under the React Compiler as
  well as a duplication the three upload surfaces would otherwise each carry.

  Nothing is transmitted — the file's name, size and type are recorded and the
  bytes discarded. That is enough to drive completeness, review and expiry.
*/

const YEAR_MS = 365 * 86_400_000;

export type PickedFileInput = {
  name: string;
  size: number;
  type: UploadedDocument["mimeType"];
};

export function buildUploadedDocument(
  type: DocumentTypeKey,
  file: PickedFileInput,
  options: { expired?: boolean } = {},
): UploadedDocument {
  const meta = documentTypeMeta(type);
  const now = Date.now();

  return {
    id: makeId("doc"),
    type,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    uploadedAt: new Date(now).toISOString(),
    status: options.expired ? "expired" : "uploaded",
    // A Tax Compliance Certificate is valid twelve months from issue, so the
    // expiry is derived rather than asked for.
    expiresAt: meta.tracksExpiry
      ? new Date(now + (options.expired ? -30 * 86_400_000 : YEAR_MS)).toISOString()
      : null,
    reviewNote: options.expired
      ? "This certificate lapsed 30 days ago. Download a current one from iTax."
      : null,
  };
}
