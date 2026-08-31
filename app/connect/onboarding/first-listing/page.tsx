"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/primitives";
import { QueryError } from "@/components/ui/query-state";
import { ListingForm } from "@/components/shared/listing-form";
import { manufacturerRepo, productRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { canListProducts, canTransact } from "@/lib/schemas/verification";
import { useOnboarding, useStepGuard } from "../onboarding-context";
import { StepShell, StepSkeleton } from "@/components/shared/step-frame";

export default function FirstListingStepPage() {
  const { ready, draft } = useStepGuard("first-listing");
  const { save } = useOnboarding();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const manufacturerId = draft?.manufacturerId ?? null;
  const { data: manufacturer, error, refetch } = useQuery(
    async () => (manufacturerId ? manufacturerRepo.getById(manufacturerId) : null),
    [manufacturerId],
  );

  if (!ready) return <StepSkeleton />;

  const publishable = manufacturer ? canListProducts(manufacturer.status) : false;

  return (
    <StepShell
      title="List your first product"
      description="Wholesale construction supply trades in quantity bands, so price it the way you actually sell it. The preview shows exactly what a hardware shop will see."
      wide
    >
      <QueryError error={error} onRetry={refetch} />
      <ListingForm
        manufacturerName={
          manufacturer?.tradingName ?? draft?.company?.tradingName ?? "Your company"
        }
        verified={manufacturer?.status === "approved"}
        submitting={submitting}
        submitLabel={publishable ? "Publish and finish" : "Save draft and finish"}
        defaultValues={{
          // Default the listing's regions to wherever the company said it distributes.
          availableRegions: draft?.company?.distributionRegions ?? [],
        }}
        banner={
          manufacturer && !canTransact(manufacturer.status) ? (
            <Alert tone="info" title="Your listing will be saved as a draft">
              Verification is still in progress. This product goes live automatically the
              moment your checks clear — you do not need to come back and publish it.
            </Alert>
          ) : undefined
        }
        onSubmit={async (listing) => {
          if (!manufacturerId) return;
          setSubmitting(true);
          try {
            await productRepo.create({
              ...listing,
              manufacturerId,
              imageUrls: [],
              // Until verification clears, listings sit as drafts rather than
              // going live — the manufacturer keeps their work, the marketplace
              // stays clean.
              status: publishable ? "active" : "draft",
            });
            await save({ firstListing: listing });
            router.push("/connect/dashboard");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </StepShell>
  );
}
