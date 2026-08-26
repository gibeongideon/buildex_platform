import { z } from "zod";

/*
  KYB document pack for Buildex Connect manufacturer onboarding.

  Requirements §8.1: "Collect KRA/tax information, BRS/business registration
  documents and other required company information" and "Maintain manufacturer
  status, verification date, documents and review history."
*/

export const DOCUMENT_TYPES = [
  {
    key: "brs_certificate",
    label: "Certificate of Incorporation",
    description: "Issued by the Business Registration Service (BRS).",
    required: true,
    tracksExpiry: false,
  },
  {
    key: "kra_pin_certificate",
    label: "KRA PIN Certificate",
    description: "Company PIN certificate downloaded from iTax.",
    required: true,
    tracksExpiry: false,
  },
  {
    key: "tax_compliance_certificate",
    label: "Tax Compliance Certificate",
    description: "Valid TCC from KRA. Expires 12 months from issue.",
    required: true,
    tracksExpiry: true,
  },
  {
    key: "cr12",
    label: "CR12",
    description: "Company search listing current directors and shareholding.",
    required: true,
    tracksExpiry: false,
  },
  {
    key: "director_id",
    label: "Director National ID copies",
    description: "Front and back for every director listed in step 3.",
    required: true,
    tracksExpiry: false,
  },
  {
    key: "bank_details",
    label: "Bank / M-Pesa settlement details",
    description: "Bank letter or paybill confirmation for payouts.",
    required: true,
    tracksExpiry: false,
  },
  {
    key: "kebs_permit",
    label: "KEBS Standardisation Mark",
    description: "Optional. Speeds up review and displays a quality badge.",
    required: false,
    tracksExpiry: true,
  },
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number]["key"];

export const documentTypeSchema = z.enum(
  DOCUMENT_TYPES.map((d) => d.key) as [DocumentTypeKey, ...DocumentTypeKey[]],
);

export const DOCUMENT_STATUSES = [
  "missing",
  "uploaded",
  "accepted",
  "rejected",
  "expired",
] as const;

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const uploadedDocumentSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  mimeType: z.enum(ACCEPTED_MIME_TYPES),
  uploadedAt: z.string(),
  status: documentStatusSchema,
  /** Only meaningful for types where tracksExpiry is true. */
  expiresAt: z.string().nullable().default(null),
  reviewNote: z.string().nullable().default(null),
});

export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;

export function documentTypeMeta(key: DocumentTypeKey) {
  const meta = DOCUMENT_TYPES.find((d) => d.key === key);
  if (!meta) throw new Error(`Unknown document type: ${key}`);
  return meta;
}

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((d) => d.required).map(
  (d) => d.key,
);

/** True once the expiry date has passed, whatever the stored status says. */
export function isDocumentExpired(doc: UploadedDocument | undefined): boolean {
  if (!doc?.expiresAt) return false;
  return new Date(doc.expiresAt).getTime() < Date.now();
}

/** The status to display, which folds in a lapsed expiry date. */
export function effectiveDocumentStatus(
  doc: UploadedDocument | undefined,
): DocumentStatus {
  if (!doc) return "missing";
  return isDocumentExpired(doc) ? "expired" : doc.status;
}

/** A document is only "good" if it was accepted and has not lapsed. */
export function isDocumentSatisfied(doc: UploadedDocument | undefined): boolean {
  if (!doc) return false;
  if (doc.status === "rejected" || doc.status === "expired" || doc.status === "missing") {
    return false;
  }
  return !isDocumentExpired(doc);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
