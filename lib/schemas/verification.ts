import { z } from "zod";

/*
  Manufacturer verification pipeline.

  Requirements §8.1 and §5.2: verify submitted business information against
  authoritative sources (BRS, IPRS) and use physical verification for
  higher-risk manufacturers, to prevent "ghost companies".

  In the mockup every authority check is a stub. At cutover each check becomes
  an adapter behind the same VerificationCheck record, so the UI does not move.
*/

export const VERIFICATION_CHECKS = [
  {
    key: "document_completeness",
    label: "Document completeness",
    description: "All required KYB documents present, legible and unexpired.",
    authority: "Buildex Operations",
    slaHours: 4,
  },
  {
    key: "brs_lookup",
    label: "BRS company lookup",
    description: "Company name, registration number and status confirmed against BRS.",
    authority: "Business Registration Service",
    slaHours: 24,
  },
  {
    key: "kra_pin_validation",
    label: "KRA PIN validation",
    description: "PIN is active and matches the registered company name.",
    authority: "Kenya Revenue Authority",
    slaHours: 24,
  },
  {
    key: "iprs_director_id",
    label: "Director identity (IPRS)",
    description: "Each director's National ID verified against the population register.",
    authority: "Integrated Population Registration Services",
    slaHours: 48,
  },
  {
    key: "site_visit",
    label: "Physical site visit",
    description:
      "Enhanced due diligence. Triggered for higher-risk manufacturers before transacting.",
    authority: "Buildex Field Team",
    slaHours: 120,
  },
] as const;

export type VerificationCheckKey = (typeof VERIFICATION_CHECKS)[number]["key"];

export const verificationCheckKeySchema = z.enum(
  VERIFICATION_CHECKS.map((c) => c.key) as [
    VerificationCheckKey,
    ...VerificationCheckKey[],
  ],
);

export const CHECK_STATUSES = [
  "pending",
  "in_review",
  "passed",
  "action_needed",
  "not_required",
] as const;

export const checkStatusSchema = z.enum(CHECK_STATUSES);
export type CheckStatus = z.infer<typeof checkStatusSchema>;

export const verificationCheckSchema = z.object({
  key: verificationCheckKeySchema,
  status: checkStatusSchema,
  /** Set when the check leaves `pending`; drives the SLA counter. */
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  /** Shown to the manufacturer when status is action_needed. */
  note: z.string().nullable().default(null),
  /** Document types the manufacturer must replace to clear this check. */
  blockingDocuments: z.array(z.string()).default([]),
});

export type VerificationCheck = z.infer<typeof verificationCheckSchema>;

/**
 * Manufacturer lifecycle.
 *
 * `conditionally_approved` is a real business state, not a convenience: a
 * manufacturer may list a catalogue while a site visit is outstanding, but may
 * not transact. Modelling it as its own status keeps that rule in one place.
 */
export const MANUFACTURER_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "action_needed",
  "conditionally_approved",
  "approved",
  "rejected",
  "suspended",
] as const;

export const manufacturerStatusSchema = z.enum(MANUFACTURER_STATUSES);
export type ManufacturerStatus = z.infer<typeof manufacturerStatusSchema>;

export const STATUS_LABELS: Record<ManufacturerStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  action_needed: "Action needed",
  conditionally_approved: "Conditionally approved",
  approved: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const STATUS_TONE: Record<
  ManufacturerStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  draft: "neutral",
  submitted: "info",
  in_review: "info",
  action_needed: "warning",
  conditionally_approved: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

export const CHECK_TONE: Record<
  CheckStatus,
  "neutral" | "info" | "warning" | "success"
> = {
  pending: "neutral",
  in_review: "info",
  passed: "success",
  action_needed: "warning",
  not_required: "neutral",
};

export const CHECK_LABELS: Record<CheckStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  passed: "Passed",
  action_needed: "Action needed",
  not_required: "Not required",
};

export function checkMeta(key: VerificationCheckKey) {
  const meta = VERIFICATION_CHECKS.find((c) => c.key === key);
  if (!meta) throw new Error(`Unknown verification check: ${key}`);
  return meta;
}

/** Can this manufacturer list products yet? Conditional approval says yes. */
export function canListProducts(status: ManufacturerStatus) {
  return status === "conditionally_approved" || status === "approved";
}

/** Can this manufacturer receive orders? Conditional approval says no. */
export function canTransact(status: ManufacturerStatus) {
  return status === "approved";
}

/**
 * Derives the manufacturer status from its checks. Keeping this as a pure
 * function means ops actions and demo controls can never drift out of sync.
 */
export function deriveStatus(checks: VerificationCheck[]): ManufacturerStatus {
  const active = checks.filter((c) => c.status !== "not_required");
  if (active.some((c) => c.status === "action_needed")) return "action_needed";
  if (active.every((c) => c.status === "passed")) return "approved";

  const blocking = active.filter((c) => c.key !== "site_visit");
  if (blocking.every((c) => c.status === "passed")) return "conditionally_approved";
  if (active.some((c) => c.status === "in_review")) return "in_review";
  return "submitted";
}

/** Hours remaining against the check's SLA. Negative means breached. */
export function slaHoursRemaining(check: VerificationCheck): number | null {
  if (!check.startedAt || check.status === "passed" || check.status === "not_required") {
    return null;
  }
  const meta = checkMeta(check.key);
  const dueAt = new Date(check.startedAt).getTime() + meta.slaHours * 3_600_000;
  return (dueAt - Date.now()) / 3_600_000;
}
