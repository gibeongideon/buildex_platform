import {
  VERIFICATION_CHECKS,
  canListProducts,
  slaHoursRemaining,
  type ManufacturerStatus,
  type VerificationCheck,
  type VerificationCheckKey,
} from "@/lib/schemas/verification";
import { isDocumentExpired, type UploadedDocument } from "@/lib/schemas/document";
import type { Manufacturer } from "@/lib/schemas/manufacturer";
import type { Enquiry } from "@/lib/schemas/enquiry";

/*
  Buildex Operations decision rules.

  These live here rather than in the console's components for the same reason
  every other rule does: ops actions, the manufacturer's own tracker and the
  demo controls all have to agree about what a decision means. One definition,
  three surfaces.
*/

/** The four decisions an ops reviewer can take on an application. */
export const OPS_DECISIONS = [
  {
    key: "approve",
    label: "Approve",
    description: "Pass every outstanding check. The manufacturer goes live.",
    tone: "success" as const,
    needsReason: false,
    needsDocuments: false,
  },
  {
    key: "request_info",
    label: "Request more information",
    description: "Ask for clarification without failing the application.",
    tone: "info" as const,
    needsReason: true,
    needsDocuments: false,
  },
  {
    key: "site_visit",
    label: "Flag for site visit",
    description:
      "Clear the desk checks but hold transacting until the plant has been seen.",
    tone: "warning" as const,
    needsReason: false,
    needsDocuments: false,
  },
  {
    key: "reject",
    label: "Reject",
    description:
      "Name the documents that are wrong. The manufacturer replaces only those.",
    tone: "danger" as const,
    needsReason: true,
    needsDocuments: true,
  },
] as const;

export type OpsDecisionKey = (typeof OPS_DECISIONS)[number]["key"];

export function decisionMeta(key: OpsDecisionKey) {
  const meta = OPS_DECISIONS.find((d) => d.key === key);
  if (!meta) throw new Error(`Unknown ops decision: ${key}`);
  return meta;
}

/**
 * Which checks a decision moves, and to what.
 *
 * Expressed as data rather than branching inside the console, so the same
 * decision always touches the same checks — and so a reviewer can be shown
 * exactly what their click will do before they make it.
 */
export function checkChangesFor(
  decision: OpsDecisionKey,
  checks: VerificationCheck[],
): { key: VerificationCheckKey; status: VerificationCheck["status"] }[] {
  const deskChecks = VERIFICATION_CHECKS.filter((c) => c.key !== "site_visit").map(
    (c) => c.key,
  );
  const outstanding = (key: VerificationCheckKey) =>
    checks.find((c) => c.key === key)?.status !== "passed";

  switch (decision) {
    case "approve":
      // Everything still open passes, including a site visit if one was raised.
      return checks
        .filter((c) => c.status !== "passed" && c.status !== "not_required")
        .map((c) => ({ key: c.key, status: "passed" as const }));

    case "site_visit":
      // Desk checks clear; the site visit becomes the one thing outstanding.
      // deriveStatus() turns that into `conditionally_approved`.
      return [
        ...deskChecks
          .filter(outstanding)
          .map((key) => ({ key, status: "passed" as const })),
        { key: "site_visit" as const, status: "in_review" as const },
      ];

    case "request_info":
    case "reject":
      // Both fail document completeness — that is the check a manufacturer can
      // actually act on. Rejection additionally names the documents.
      return [{ key: "document_completeness" as const, status: "action_needed" as const }];
  }
}

/**
 * Human summary of what a decision will do, shown beside the button.
 *
 * Reviewers act faster when the consequence is stated rather than inferred, and
 * this is the kind of screen where a wrong click costs a supplier days.
 */
export function decisionOutcome(decision: OpsDecisionKey): string {
  switch (decision) {
    case "approve":
      return "Manufacturer becomes Verified. Draft listings go live and orders are enabled.";
    case "site_visit":
      return "Manufacturer becomes Conditionally approved. They may list, but not transact.";
    case "request_info":
      return "Manufacturer becomes Action needed. They see your note and can reply.";
    case "reject":
      return "Manufacturer becomes Action needed. Only the documents you name need replacing.";
  }
}

/**
 * `suspended` and `rejected` are administrative states, not derived ones.
 *
 * `deriveStatus()` reads only the checks, so a later check movement would
 * silently un-suspend a suspended manufacturer. Anything writing status has to
 * ask this first.
 */
export function isAdministrativeHold(status: ManufacturerStatus) {
  return status === "suspended";
}

// ---------------------------------------------------------------------------
// Exceptions — the things that actually need a human
// ---------------------------------------------------------------------------

export type ExceptionSeverity = "high" | "medium";

export type OpsException = {
  id: string;
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  href: string;
};

/** Checks past their SLA, worst breach first. */
export function slaBreaches(manufacturer: Manufacturer): OpsException[] {
  return manufacturer.checks
    .map((check) => ({ check, hours: slaHoursRemaining(check) }))
    .filter((row): row is { check: VerificationCheck; hours: number } =>
      row.hours !== null && row.hours < 0,
    )
    .map(({ check, hours }) => {
      const overdue = Math.round(Math.abs(hours));
      return {
        id: `${manufacturer.id}:sla:${check.key}`,
        severity: (overdue > 48 ? "high" : "medium") as ExceptionSeverity,
        title: `${manufacturer.tradingName} — ${check.key.replace(/_/g, " ")} past SLA`,
        detail: `${overdue}h over the target for this check.`,
        href: `/admin/verification/${manufacturer.id}`,
      };
    });
}

/** Documents that have passed their validity date. */
export function expiredDocuments(manufacturer: Manufacturer): OpsException[] {
  return manufacturer.documents
    .filter((doc: UploadedDocument) => isDocumentExpired(doc))
    .map((doc) => ({
      id: `${manufacturer.id}:expired:${doc.type}`,
      severity: "medium" as ExceptionSeverity,
      title: `${manufacturer.tradingName} — expired ${doc.type.replace(/_/g, " ")}`,
      detail: "The document on file is past its validity date.",
      href: `/admin/verification/${manufacturer.id}`,
    }));
}

/** An application sitting in action_needed is waiting on the manufacturer. */
export function stalledApplication(manufacturer: Manufacturer): OpsException | null {
  if (manufacturer.status !== "action_needed") return null;
  return {
    id: `${manufacturer.id}:stalled`,
    severity: "medium",
    title: `${manufacturer.tradingName} — action needed`,
    detail:
      manufacturer.reviewNotes[0] ?? "Waiting on the manufacturer to resolve a check.",
    href: `/admin/verification/${manufacturer.id}`,
  };
}

/**
 * Enquiries unanswered for longer than the supplier's own stated response time.
 *
 * Measuring against the supplier's own promise rather than a flat platform SLA
 * is the point: a shop chose them partly on "replies within 3h", so that is the
 * number worth holding them to.
 */
export function slowEnquiries(
  manufacturer: Manufacturer,
  enquiries: Enquiry[],
): OpsException[] {
  const promisedHours = manufacturer.storefront.avgResponseHours || 24;
  const now = Date.now();

  return enquiries
    .filter((e) => e.manufacturerId === manufacturer.id && e.status === "new")
    .map((e) => ({
      enquiry: e,
      waitedHours: (now - new Date(e.createdAt).getTime()) / 3_600_000,
    }))
    .filter(({ waitedHours }) => waitedHours > promisedHours * 2)
    .map(({ enquiry, waitedHours }) => ({
      id: `${manufacturer.id}:slow:${enquiry.id}`,
      severity: (waitedHours > promisedHours * 8 ? "high" : "medium") as ExceptionSeverity,
      title: `${manufacturer.tradingName} — enquiry unanswered ${Math.round(waitedHours)}h`,
      detail: `${enquiry.shopName} asked about ${enquiry.productName}. They advertise ${promisedHours}h.`,
      href: `/admin/enquiries`,
    }));
}

/** A supplier cleared to list but with nothing published is a dead storefront. */
export function emptyStorefront(
  manufacturer: Manufacturer,
  liveListingCount: number,
): OpsException | null {
  if (!canListProducts(manufacturer.status) || liveListingCount > 0) return null;
  return {
    id: `${manufacturer.id}:empty`,
    severity: "medium",
    title: `${manufacturer.tradingName} — verified with no live listings`,
    detail: "Cleared to sell but publishing nothing. Worth an account-manager call.",
    href: `/admin/manufacturers/${manufacturer.id}`,
  };
}

const SEVERITY_ORDER: Record<ExceptionSeverity, number> = { high: 0, medium: 1 };

export function sortExceptions(exceptions: OpsException[]) {
  return [...exceptions].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

// ---------------------------------------------------------------------------
// Clearing a supplier publishes the listings they were forced to park
// ---------------------------------------------------------------------------

/**
 * Statuses in which a supplier has never been able to publish anything.
 *
 * `suspended` is deliberately absent: a suspended supplier could publish
 * before, so their drafts are their own choice and reinstating must not push
 * them live.
 */
const PRE_CLEARANCE: ManufacturerStatus[] = [
  "submitted",
  "in_review",
  "action_needed",
  "rejected",
];

/**
 * Which of a supplier's draft listings go live because of a status change.
 *
 * Three screens promise this — the onboarding first-listing step, the
 * manufacturer's verification tracker and the admin listings queue all say a
 * draft publishes itself the moment its supplier clears. This is the rule that
 * makes the promise true, and it lives here so the one write path that changes
 * status cannot forget it.
 *
 * It fires only on the transition *into* a listable state from one where
 * publishing was impossible. A draft created after clearing is a decision the
 * supplier made, and nothing here touches it.
 */
export function draftsToPublishOnClearing(
  previousStatus: ManufacturerStatus,
  nextStatus: ManufacturerStatus,
  products: { id: string; status: string }[],
): string[] {
  if (!PRE_CLEARANCE.includes(previousStatus)) return [];
  if (!canListProducts(nextStatus)) return [];
  return products.filter((p) => p.status === "draft").map((p) => p.id);
}
