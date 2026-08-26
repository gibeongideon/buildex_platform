"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { manufacturerRepo } from "@/lib/data";
import {
  VERIFICATION_CHECKS,
  checkMeta,
  type VerificationCheck,
} from "@/lib/schemas/verification";

/*
  Scenario controls for the verification screen.

  In production these transitions come from the ops console (Phase 3) and from
  the BRS / KRA / IPRS adapters. Until those exist, a presenter needs a way to
  drive the pipeline forward — and, more importantly, to drive it into the
  states that are easy to forget to design for.
*/

export function DemoScenarios({
  manufacturerId,
  checks,
}: {
  manufacturerId: string;
  checks: VerificationCheck[];
}) {
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  }

  /** The first check that has not yet passed, in pipeline order. */
  const nextCheck = VERIFICATION_CHECKS.map((meta) =>
    checks.find((c) => c.key === meta.key),
  ).find((check) => check && check.status !== "passed" && check.status !== "not_required");

  const allPassed = !nextCheck;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drive the pipeline the way Buildex Operations would, to see each state the
        manufacturer can land in.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={allPassed}
          loading={busy === "advance"}
          onClick={() =>
            run("advance", () =>
              manufacturerRepo.setCheckStatus(manufacturerId, nextCheck!.key, "passed"),
            )
          }
        >
          {allPassed ? "All checks passed" : `Pass: ${checkMeta(nextCheck!.key).label}`}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={busy === "reject-doc"}
          onClick={() =>
            run("reject-doc", () =>
              manufacturerRepo.setCheckStatus(
                manufacturerId,
                "document_completeness",
                "action_needed",
                {
                  note: "Your Tax Compliance Certificate has expired. Upload a current one from iTax to continue.",
                  blockingDocuments: ["tax_compliance_certificate"],
                },
              ),
            )
          }
        >
          Reject a document
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={busy === "brs-fail"}
          onClick={() =>
            run("brs-fail", () =>
              manufacturerRepo.setCheckStatus(manufacturerId, "brs_lookup", "action_needed", {
                note: "No active company found at BRS for the registration number supplied.",
                blockingDocuments: ["brs_certificate"],
              }),
            )
          }
        >
          Fail the BRS lookup
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={busy === "conditional"}
          onClick={() =>
            run("conditional", async () => {
              // Everything clears except the site visit — the conditional
              // approval state, where listing is allowed but transacting is not.
              for (const key of [
                "document_completeness",
                "brs_lookup",
                "kra_pin_validation",
                "iprs_director_id",
              ] as const) {
                await manufacturerRepo.setCheckStatus(manufacturerId, key, "passed");
              }
              await manufacturerRepo.setCheckStatus(manufacturerId, "site_visit", "in_review", {
                note: "Field team scheduled for a plant inspection.",
              });
            })
          }
        >
          Conditional approval
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={busy === "approve"}
          onClick={() =>
            run("approve", async () => {
              // Checks marked not_required stay that way — passing them would
              // claim a site visit happened when none was ever scheduled.
              for (const check of checks) {
                if (check.status === "not_required") continue;
                await manufacturerRepo.setCheckStatus(manufacturerId, check.key, "passed");
              }
            })
          }
        >
          Approve everything
        </Button>
      </div>
    </div>
  );
}
